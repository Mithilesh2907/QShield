import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import FastAPI
from pydantic import BaseModel
from backend.app.services.asset_discovery import discover_assets
from backend.app.services.cbom_generator import generate_cbom
from backend.app.services.pqc_risk import assess_pqc_risk
from backend.app.services.rating_engine import calculate_rating
from backend.app.services.nmap_scan import scan_ports
from backend.app.services.real_crypto_scan import scan_tls


logger = logging.getLogger(__name__)
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Moved StaticFiles mount to the bottom

class ScanRequest(BaseModel):
    domain: str


def run_crypto_scans(assets: list[dict]) -> list[dict]:
    results = []

    def _scan_asset(asset: dict):
        domain = asset.get("domain")
        if not domain:
            return None
        print(f"Scanning {domain}...")
        port_info = scan_ports(domain)
        ports = port_info["ports"]

        if not ports.get("443"):
            return {
                "domain": domain,
                "ip": asset.get("ip"),
                "ports": ports,
                "tls_version": "Not Supported",
                "cipher": "None",
                "certificate_algo": None,
                "key_size": None,
            }

        tls_result = scan_tls(domain)
        tls_result["ports"] = ports
        tls_result["ip"] = asset.get("ip")
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

    return response

from fastapi.staticfiles import StaticFiles
import os

# Serve the static build of the React app if it exists
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
