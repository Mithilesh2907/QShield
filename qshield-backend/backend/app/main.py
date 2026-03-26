import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
import os
from backend.app.services.asset_discovery import discover_assets
from backend.app.services.cbom_generator import generate_cbom
from backend.app.services.pqc_risk import assess_pqc_risk
from backend.app.services.rating_engine import calculate_rating
from backend.app.services.nmap_scan import scan_ports
from backend.app.services.real_crypto_scan import scan_tls
from backend.app.services.storage import save_scan, get_latest_scans
from backend.app.services.cert_analysis import get_certificate_expiry
from backend.app.services.security_headers import check_security_headers


logger = logging.getLogger(__name__)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static assets for the frontend if they exist
static_assets_dir = Path("frontend/dist/assets")
if static_assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_assets_dir)), name="assets")

class ScanRequest(BaseModel):
    domain: str


def map_certificate_ui(status: str) -> dict:
    return {
        "OK": {"certificate_severity": "low", "certificate_label": "Valid"},
        "WARNING": {"certificate_severity": "medium", "certificate_label": "Expiring Soon"},
        "CRITICAL": {"certificate_severity": "high", "certificate_label": "Critical Expiry"},
        "NO_TLS": {"certificate_severity": "none", "certificate_label": "No TLS"},
        "NO_CERT": {"certificate_severity": "none", "certificate_label": "No Certificate"},
        "UNREACHABLE": {"certificate_severity": "none", "certificate_label": "Unreachable"},
    }.get(status, {"certificate_severity": "none", "certificate_label": "Unknown"})


def map_tls_ui(strength: str, version: str) -> dict:
    if version == "Not Supported":
        return {"tls_label": "No TLS", "tls_severity": "high"}

    normalized = (strength or "").upper()
    if normalized == "STRONG":
        return {"tls_label": "Secure", "tls_severity": "low"}
    if normalized == "MODERATE":
        return {"tls_label": "Moderate", "tls_severity": "medium"}
    if normalized == "WEAK":
        return {"tls_label": "Weak", "tls_severity": "high"}
    return {"tls_label": "Moderate", "tls_severity": "medium"}


def map_quantum_ui(vulnerable: bool) -> dict:
    if vulnerable:
        return {"quantum_label": "Vulnerable", "quantum_severity": "high"}
    return {"quantum_label": "Safe", "quantum_severity": "low"}


def map_header_ui(entry: dict) -> dict:
    headers = entry.get("security_headers", {})
    missing = sum(1 for value in headers.values() if not value)
    if missing == 0:
        return {"headers_label": "Secure", "headers_severity": "low"}
    if missing <= 2:
        return {"headers_label": "Partial", "headers_severity": "medium"}
    return {"headers_label": "Insecure", "headers_severity": "high"}


def run_crypto_scans(assets: list[dict]) -> list[dict]:
    results = []

    def _scan_asset(asset: dict):
        domain = asset.get("domain")
        if not domain:
            return None
        print(f"Scanning {domain}...")
        port_info = scan_ports(domain)
        ports = port_info["ports"]
        security_headers = check_security_headers(domain)
        has_tls = bool(ports.get("443"))
        cert_info = get_certificate_expiry(domain, port_443_open=has_tls)
        cert_status = cert_info.get("certificate_status", "UNREACHABLE")

        if not has_tls:
            return {
                "domain": domain,
                "ip": asset.get("ip"),
                "ports": ports,
                "security_headers": security_headers,
                "tls_version": "Not Supported",
                "cipher": "None",
                "certificate_algo": None,
                "key_size": None,
            "certificate": {
                "expiry_days": cert_info.get("expiry_days"),
                "expiry_date": cert_info.get("expiry_date"),
            },
                "certificate_status": cert_status,
            }

        tls_result = scan_tls(domain)
        tls_result["ports"] = ports
        tls_result["ip"] = asset.get("ip")
        tls_result["security_headers"] = security_headers
        tls_result["certificate"] = {
            "expiry_days": cert_info.get("expiry_days"),
            "expiry_date": cert_info.get("expiry_date"),
        }
        tls_result["certificate_status"] = cert_status
        return tls_result

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_map = {}
        for asset in assets:
            future = executor.submit(_scan_asset, asset)
            future_map[future] = asset.get("domain")

        for future in as_completed(future_map):
            domain = future_map[future]
            try:
                result = future.result()
                if result:
                    results.append(result)
            except Exception as exc:
                logger.error("scan error for %s: %s", domain, exc)
                results.append({
                    "domain": domain,
                    "tls_version": "Unknown",
                    "cipher": "Unknown",
                    "certificate_algo": None,
                    "key_size": None,
                    "error": str(exc),
                })

    return results


@app.post("/scan")
def scan_domain(request: ScanRequest):
    logger.info("scan request for %s", request.domain)
    assets = discover_assets(request.domain) or []
    crypto_results = run_crypto_scans(assets)
    logger.debug("crypto scan results: %s", crypto_results)

    cbom = generate_cbom(crypto_results)
    cbom, risk = assess_pqc_risk(cbom)

    for entry in cbom:
        entry.update(map_certificate_ui(entry.get("certificate_status", "UNREACHABLE")))
        entry.update(map_tls_ui(entry.get("key_strength"), entry.get("tls_version")))
        entry.update(map_quantum_ui(entry.get("quantum_vulnerable")))
        entry.update(map_header_ui(entry))
    rating_data = calculate_rating(cbom)

    summary = {
        "total_assets": len(assets),
        "https_enabled": sum(1 for entry in cbom if entry.get("ports", {}).get("443")),
        "http_only": sum(
            1
            for entry in cbom
            if entry.get("ports", {}).get("80") and not entry.get("ports", {}).get("443")
        ),
        "quantum_vulnerable": sum(1 for entry in cbom if entry.get("quantum_vulnerable") is True),
        "quantum_safe": sum(1 for entry in cbom if entry.get("quantum_vulnerable") is False),
        "high_risk_assets": sum(1 for entry in cbom if entry.get("risk_level") == "High"),
        "header_issues": sum(
            1
            for entry in cbom
            if not all(entry.get("security_headers", {}).values())
        ),
        "unreachable_assets": sum(
            1
            for entry in cbom
            if entry.get("certificate_status") == "UNREACHABLE"
        ),
        "expiring_soon": sum(
            1
            for entry in cbom
            if 0 <= (entry.get("certificate", {}).get("expiry_days") or -1) < 30
            ),
    }

    inventory_domains = [asset["domain"] for asset in assets if asset.get("domain")]
    ssl_enabled_domains = [
        entry["domain"]
        for entry in cbom
        if entry.get("ports", {}).get("443")
    ]
    http_only_domains = [
        entry["domain"]
        for entry in cbom
        if entry.get("ports", {}).get("80") and not entry.get("ports", {}).get("443")
    ]
    ip_addresses = sorted(
        {asset.get("ip") for asset in assets if asset.get("ip")}
    )
    ports_set = set()
    for entry in cbom:
        for port_str, is_open in (entry.get("ports") or {}).items():
            if is_open and port_str.isdigit():
                ports_set.add(int(port_str))
    inventory_ports = sorted(ports_set)

    insights = []
    if cbom:
        tls_versions = [entry.get("tls_version") for entry in cbom]
        if all(version == "TLSv1.3" for version in tls_versions):
            insights.append("All assets use TLSv1.3 (strong classical security)")
        elif any(version in {"TLSv1", "TLSv1.1"} for version in tls_versions):
            insights.append("Some assets still support TLS versions older than 1.2")
        else:
            insights.append("All assets meet TLS 1.2+ requirements")

        if summary["https_enabled"] == summary["total_assets"] and summary["total_assets"]:
            insights.append("HTTPS is enabled across all assets")
        elif summary["https_enabled"] == 0 and summary["total_assets"]:
            insights.append("No HTTPS endpoints are available")

        if summary["http_only"] > 0:
            insights.append(f"{summary['http_only']} asset(s) expose HTTP without HTTPS")

        if summary["quantum_vulnerable"] == summary["total_assets"] and summary["total_assets"]:
            insights.append("All assets are quantum vulnerable")
        elif summary["quantum_vulnerable"] > 0:
            insights.append("Some assets remain quantum vulnerable")
        else:
            insights.append("No quantum-vulnerable assets detected")

        security_headers = [entry.get("security_headers", {}) for entry in cbom]
        total = len(security_headers)
        missing_csp = sum(1 for headers in security_headers if not headers.get("csp"))
        missing_hsts = sum(1 for headers in security_headers if not headers.get("hsts"))
        missing_frame = sum(1 for headers in security_headers if not headers.get("x_frame_options"))

        if missing_csp:
            insights.append(f"CSP missing on {missing_csp}/{total} assets")
        if missing_hsts:
            insights.append(f"HSTS not enabled on {missing_hsts}/{total} assets")
        if missing_frame:
            insights.append(f"Clickjacking protection missing on {missing_frame}/{total} assets")

        if all(entry.get("ports", {}).get("80") for entry in cbom):
            insights.append("All assets expose HTTP (port 80), potential downgrade attack risk")

        critical_certs = sum(
            1
            for entry in cbom
            if 0 <= (entry.get("certificate", {}).get("expiry_days") or -1) < 15
        )
        expiring_soon = summary["expiring_soon"]
        if expiring_soon:
            insights.append(f"{expiring_soon} certificates expiring within 30 days")
        if critical_certs:
            insights.append(f"{critical_certs} certificates critically close to expiry")

        tls_missing = sum(
            1
            for entry in cbom
            if entry.get("certificate_status") == "NO_TLS"
        )
        misconfigured = sum(
            1
            for entry in cbom
            if entry.get("certificate_status") in {"UNREACHABLE", "NO_CERT"}
        )
        if tls_missing:
            insights.append(f"{tls_missing} assets do not support TLS")
        if misconfigured:
            insights.append(f"{misconfigured} assets unreachable or TLS handshake failed")

    counts = {
        "domains": len(inventory_domains),
        "ssl": len(ssl_enabled_domains),
        "ips": len(ip_addresses),
    }

    inventory = {
        "domains": inventory_domains,
        "ssl_enabled": ssl_enabled_domains,
        "http_only": http_only_domains,
        "ip_addresses": ip_addresses,
        "ports": inventory_ports,
    }

    response = {
        "summary": summary,
        "counts": counts,
        "inventory": inventory,
        "risk": risk or "Low",
        "score": rating_data["score"],
        "rating": rating_data["rating"],
        "quantum_status": rating_data["quantum_status"],
        "classical_security": rating_data["classical_security"],
        "quantum_security": rating_data["quantum_status"],
        "insights": insights,
        "assets": assets,
        "cbom": cbom,
    }

    save_scan(request.domain, response)

    return response

@app.get("/scans")
def get_scans_history():
    return get_latest_scans()

@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    dist_path = os.path.join("frontend", "dist")
    file_path = os.path.join(dist_path, full_path)
    
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    index_path = os.path.join(dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    return {"detail": "Frontend not built. Please run 'npm run build' in the frontend directory."}

