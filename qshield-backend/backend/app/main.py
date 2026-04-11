import http.client
import json
import logging
import os
import re
import ssl
import subprocess
import tempfile
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from fastapi import FastAPI, HTTPException, File, UploadFile, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from email.message import EmailMessage
import smtplib
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from zoneinfo import ZoneInfo
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from dotenv import load_dotenv

load_dotenv()  # Load .env file so SMTP credentials are available

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

from backend.app.db import engine, Base
from backend.app.routers import auth
from backend.app.services.asset_discovery import discover_assets, clean_domain
from backend.app.services.cbom_generator import generate_cbom
from backend.app.services.pqc_risk import assess_pqc_risk
from backend.app.services.rating_engine import calculate_rating
from backend.app.services.nmap_scan import scan_ports, scan_service_versions
from backend.app.services.real_crypto_scan import scan_tls
from backend.app.services.storage import save_scan, get_latest_scans, save_nuclei_scan, get_latest_nuclei_scan, get_nuclei_scan
from backend.app.services.cert_analysis import get_certificate_expiry
from backend.app.services.security_headers import check_security_headers
from backend.app.services.schedule_store import add_schedule, load_schedules, update_schedule_status

# Initialize DB tables on startup
Base.metadata.create_all(bind=engine)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app_instance):
    scheduler.start()
    logger.info("APScheduler started")
    yield
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped")


app = FastAPI(lifespan=lifespan)

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

app.include_router(auth.router, prefix="/auth", tags=["auth"])

class ScanRequest(BaseModel):
    domain: str


# ---------------------------------------------------------------------------
# Scheduled email job
# ---------------------------------------------------------------------------

def _scheduled_email_job(schedule_id: str, report_type: str, email_to: str, sections: dict):
    """Called by APScheduler at the scheduled time to generate + email a report."""
    smtp_server = os.environ.get("SMTP_SERVER")
    smtp_port   = int(os.environ.get("SMTP_PORT", 587))
    smtp_user   = os.environ.get("SMTP_USER")
    smtp_pass   = os.environ.get("SMTP_PASS")

    update_schedule_status(schedule_id, "running")

    if not smtp_server or not smtp_user or not smtp_pass:
        logger.error("SMTP not configured — cannot send scheduled report %s", schedule_id)
        update_schedule_status(schedule_id, "failed:smtp_not_configured")
        return

    label_map = {
        "exec": "Executive Summary Report",
        "discovery": "Assets Discovery Report",
        "inventory": "Assets Inventory",
        "cbom": "Cryptographic Bill of Materials (CBOM)",
        "pqc": "Posture of PQC",
        "cyber": "Cyber Risk Rating",
    }
    report_label = label_map.get(report_type, report_type.upper())
    timestamp    = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M IST")
    filename     = f"QShield_{report_type.upper()}_Scheduled_{datetime.now().strftime('%Y%m%d_%H%M')}.txt"

    lines = [
        "QShield Scheduled Report",
        f"Report Type : {report_label}",
        f"Generated   : {timestamp}",
        f"Sections    : {', '.join(k for k, v in (sections or {}).items() if v)}",
        "",
        "This is an automated scheduled security report from your QShield platform.",
        "Please log in to the dashboard to view detailed charts and full analysis.",
    ]
    body_text = "\n".join(lines)

    try:
        msg = EmailMessage()
        msg["Subject"] = f"QShield Scheduled Report: {report_label}"
        msg["From"]    = str(smtp_user)
        msg["To"]      = email_to
        msg.set_content(body_text)
        msg.add_attachment(
            body_text.encode("utf-8"),
            maintype="text",
            subtype="plain",
            filename=filename,
        )
        with smtplib.SMTP(str(smtp_server), smtp_port) as server:
            server.starttls()
            server.login(str(smtp_user), str(smtp_pass))
            server.send_message(msg)
        logger.info("Scheduled report email sent to %s (job %s)", email_to, schedule_id)
        update_schedule_status(schedule_id, "sent")
    except Exception as exc:
        logger.error("Failed to send scheduled report %s: %s", schedule_id, exc)
        update_schedule_status(schedule_id, f"failed:{exc}")


# ---------------------------------------------------------------------------
# Schedule endpoints
# ---------------------------------------------------------------------------

class ScheduleRequest(BaseModel):
    report_type: str
    frequency: str
    assets: str
    sections: dict
    run_at: str          # ISO-8601 datetime string, e.g. "2026-03-30T21:30:00"
    email: str
    save_path: str | None = None
    download_link: bool = False


@app.post("/api/reports/schedule")
def create_schedule(req: ScheduleRequest):
    """Save a schedule and register an APScheduler one-shot job."""
    try:
        # Parse run_at in IST timezone
        naive_dt = datetime.fromisoformat(req.run_at)
        ist = ZoneInfo("Asia/Kolkata")
        run_at_dt = naive_dt.replace(tzinfo=ist)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid run_at datetime: {exc}")

    now_ist = datetime.now(ZoneInfo("Asia/Kolkata"))
    if run_at_dt <= now_ist:
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future.")

    schedule_id = str(uuid.uuid4())
    entry = {
        "id": schedule_id,
        "report_type": req.report_type,
        "frequency": req.frequency,
        "assets": req.assets,
        "sections": req.sections,
        "run_at": run_at_dt.isoformat(),
        "email": req.email,
        "save_path": req.save_path,
        "download_link": req.download_link,
        "status": "scheduled",
        "created_at": now_ist.isoformat(),
    }
    add_schedule(entry)

    scheduler.add_job(
        _scheduled_email_job,
        trigger=DateTrigger(run_date=run_at_dt),
        args=[schedule_id, req.report_type, req.email, req.sections],
        id=schedule_id,
        replace_existing=True,
    )
    logger.info("Scheduled report job %s for %s at %s", schedule_id, req.email, run_at_dt)

    return {
        "status": "scheduled",
        "id": schedule_id,
        "run_at": run_at_dt.isoformat(),
        "email": req.email,
    }


@app.get("/api/reports/schedules")
def list_schedules():
    return {"schedules": load_schedules()}


class NucleiRequest(BaseModel):
    domains: list[str]
    mode: str | None = "fast"


current_scan = {
    "running": False,
    "process": None,
    "results": [],
    "stats": {
        "requests": 0,
        "templates": 0,
        "last_lines": [],
        "last_update": None,
    },
}


def map_certificate_ui(status: str) -> dict:
    return {
        "OK": {"certificate_severity": "low", "certificate_label": "Valid"},
        "WARNING": {"certificate_severity": "medium", "certificate_label": "Expiring Soon"},
        "CRITICAL": {"certificate_severity": "high", "certificate_label": "Critical Expiry"},
        "NO_TLS": {"certificate_severity": "none", "certificate_label": "No TLS"},
        "No HTTPS": {"certificate_severity": "none", "certificate_label": "No HTTPS"},
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


def _probe_json_response(domain: str, port: int, use_https: bool, path: str) -> bool:
    try:
        if use_https:
            context = ssl._create_unverified_context()
            conn = http.client.HTTPSConnection(domain, port=port, timeout=3, context=context)
        else:
            conn = http.client.HTTPConnection(domain, port=port, timeout=3)
        conn.request("GET", path, headers={"Accept": "application/json", "User-Agent": "QShield/1.0"})
        response = conn.getresponse()
        content_type = (response.getheader("Content-Type") or "").lower()
        body = response.read(256) or b""
        conn.close()
        if "application/json" in content_type:
            return True
        trimmed = body.strip()
        return trimmed.startswith(b"{") or trimmed.startswith(b"[")
    except Exception:
        return False


def _is_api_asset(domain: str | None, ports: dict | None) -> bool:
    if not domain:
        return False
    normalized = domain.lower()
    if "/api" in normalized or normalized.startswith("api.") or ".api." in normalized:
        return True

    port_map = ports or {}
    candidates: list[tuple[bool, int]] = []
    for port in (443, 8443):
        if port_map.get(str(port)):
            candidates.append((True, port))
    for port in (80, 8080):
        if port_map.get(str(port)):
            candidates.append((False, port))

    for use_https, port in candidates:
        if _probe_json_response(domain, port, use_https, "/api"):
            return True
        if _probe_json_response(domain, port, use_https, "/"):
            return True
    return False


def classify_asset_type(domain: str | None, ports: dict | None, is_api: bool = False) -> str:
    normalized = (domain or "").lower()
    port_map = ports or {}
    has_web_port = bool(port_map.get("80") or port_map.get("443"))
    if is_api:
        return "api"
    if has_web_port:
        return "web"
    if "api" in normalized:
        return "api"
    return "server"


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
        is_api = _is_api_asset(domain, ports)
        asset_type = classify_asset_type(domain, ports, is_api=is_api)
        target = asset.get("ip") or domain
        print("Before Nmap:", asset)
        service_result = scan_service_versions(target) if target else {"services": [], "ip": None}
        services = service_result.get("services", [])
        discovered_ip = service_result.get("ip")
        if not asset.get("ip") and discovered_ip:
            asset["ip"] = discovered_ip
        asset["services"] = services
        print("After Nmap:", asset)
        if not services:
            web_ports = [p for p in ("80", "443", "8080", "8443") if ports.get(p)]
            if web_ports:
                services = [
                    {
                        "port": int(port),
                        "service": "http",
                        "product": "",
                        "version": "",
                        "outdated": False,
                    }
                    for port in web_ports
                ]
                asset["services"] = services
        outdated = any(service.get("outdated") for service in services)
        is_live = bool(asset.get("live_httpx")) or len(services) > 0
        asset["is_live"] = is_live
        print(domain, "live:", is_live)

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
                "type": asset_type,
                "services": services,
                "outdated_services": outdated,
                "certificate": {
                    "expiry_days": cert_info.get("expiry_days"),
                    "expiry_date": cert_info.get("expiry_date"),
                    "issuer_ca": cert_info.get("issuer_ca"),
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
            "issuer_ca": cert_info.get("issuer_ca"),
        }
        tls_result["certificate_status"] = cert_status
        tls_result["type"] = asset_type
        tls_result["services"] = services
        tls_result["outdated_services"] = outdated
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
                    "type": "server",
                    "ports": {},
                    "services": [],
                    "outdated_services": False,
                })

    return results


@app.post("/scan")
def scan_domain(request: ScanRequest):
    logger.info("scan request for %s", request.domain)
    assets = discover_assets(request.domain) or []
    crypto_results = run_crypto_scans(assets)
    logger.debug("crypto scan results: %s", crypto_results)

    domain_type_map = {
        entry.get("domain"): (entry.get("type") or "server")
        for entry in crypto_results
        if entry.get("domain")
    }
    assets = [
        {
            **asset,
            "type": domain_type_map.get(asset.get("domain")) or "server",
        }
        for asset in assets
    ]

    cbom = generate_cbom(crypto_results)
    cbom, risk = assess_pqc_risk(cbom)

    for entry in cbom:
        entry.update(map_certificate_ui(entry.get("certificate_status", "UNREACHABLE")))
        entry.update(map_tls_ui(entry.get("key_strength"), entry.get("tls_version")))
        entry.update(map_quantum_ui(entry.get("quantum_vulnerable")))
        entry.update(map_header_ui(entry))
    rating_data = calculate_rating(cbom)

    outdated_services_count = sum(1 for entry in cbom if entry.get("outdated_services"))

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
        "outdated_services": outdated_services_count,
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

        if outdated_services_count:
            insights.append(f"Outdated services detected on {outdated_services_count} assets")

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


@app.post("/api/reports/deliver")
async def deliver_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    reportType: str = Form(None),
    send_email: bool = Form(False),
    email_addresses: str = Form(None),
    save_location: bool = Form(False),
    location_path: str = Form(None),
    send_slack: bool = Form(False)
):
    import aiofiles
    
    content = await file.read()
    response_msg = []
    
    if save_location and location_path:
        try:
            target_dir = location_path
            if not location_path.endswith("/") and not location_path.endswith("\\"):
                if not "." in os.path.basename(location_path):
                    target_dir = location_path
                    target_path = os.path.join(target_dir, file.filename)
                else: 
                    target_dir = os.path.dirname(location_path)
                    target_path = location_path
            else:
                target_path = os.path.join(target_dir, file.filename)
                
            os.makedirs(target_dir, exist_ok=True)
            async with aiofiles.open(target_path, 'wb') as out_file:
                await out_file.write(content)
            response_msg.append(f"Saved to {target_path}")
            logger.info(f"Report saved to {target_path}")
        except Exception as e:
            logger.error(f"Error saving file to {location_path}: {e}")
            response_msg.append(f"Error saving to {location_path}")

    if send_email and email_addresses:
        def _send_email_task(pdf_bytes, filename, emails):
            smtp_server = os.environ.get("SMTP_SERVER")
            smtp_port = os.environ.get("SMTP_PORT", 587)
            smtp_user = os.environ.get("SMTP_USER")
            smtp_pass = os.environ.get("SMTP_PASS")
            
            if not smtp_server or not smtp_user or not smtp_pass:
                raise Exception(
                    "SMTP is not configured on this server. "
                    "Please set SMTP_SERVER, SMTP_USER, and SMTP_PASS in the .env file."
                )
                
            try:
                msg = EmailMessage()
                msg['Subject'] = f"QShield Report: {filename}"
                msg['From'] = smtp_user
                msg['To'] = tuple(e.strip() for e in emails.split(","))
                msg.set_content("Please find the requested QShield On-Demand Security Report attached.")
                msg.add_attachment(pdf_bytes, maintype='application', subtype='pdf', filename=filename)
                
                with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
                logger.info(f"Email sent successfully to {emails}")
            except Exception as e:
                logger.error(f"Failed to send email to {emails}: {e}")
                
        background_tasks.add_task(_send_email_task, content, file.filename, email_addresses)
        response_msg.append(f"Scheduled email to {email_addresses}")

    if send_slack:
        slack_webhook = os.environ.get("SLACK_WEBHOOK_URL")
        if not slack_webhook:
            logger.warning(f"Slack webhook not configured. Simulating slack alert for {file.filename}")
        else:
            try:
                import urllib.request
                payload = {"text": f"New QShield Report Generated: {file.filename}"}
                req = urllib.request.Request(slack_webhook, data=json.dumps(payload).encode('utf-8'),
                                             headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req)
                logger.info("Slack notification sent")
            except Exception as e:
                logger.error(f"Failed to send Slack notification: {e}")
        response_msg.append("Slack notification enqueued")

    return {"status": "success", "message": ", ".join(response_msg)}


@app.get("/scans")
def get_scans_history():
    return get_latest_scans()


def _parse_nuclei_output(output: str) -> list[dict]:
    results = []
    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        info = payload.get("info") or {}
        results.append({
            "name": info.get("name") or payload.get("name") or "Unknown",
            "severity": (info.get("severity") or payload.get("severity") or "unknown").lower(),
            "template": payload.get("template-id") or payload.get("template") or "unknown",
            "matched": payload.get("matched-at") or payload.get("matched") or payload.get("host") or "",
        })
    return results


@app.post("/run-nuclei")
def run_nuclei_scan(request: NucleiRequest):
    if current_scan["running"] and current_scan["process"] and current_scan["process"].poll() is None:
        return {"success": False, "error": "Nuclei scan already running", "findings": [], "summary": {}, "total": 0}

    http_live_path = Path(os.getcwd()) / "http_live.txt"
    nuclei_targets_path = Path(os.getcwd()) / "nuclei_targets.txt"

    if not http_live_path.exists():
        return {
            "success": False,
            "error": "http_live.txt not found. Run the recon pipeline first.",
            "findings": [],
            "summary": {},
            "total": 0,
        }

    http_live = {
        clean_domain(line.strip())
        for line in http_live_path.read_text(encoding="utf-8").splitlines()
        if clean_domain(line.strip())
    }

    if request.domains:
        print("Using user-provided domains")
        raw_targets = [domain.strip() for domain in request.domains if domain and domain.strip()]
    else:
        print("Using nuclei_targets.txt")
        if not nuclei_targets_path.exists():
            return {
                "success": False,
                "error": "nuclei_targets.txt not found. Run the recon pipeline first or provide domains.",
                "findings": [],
                "summary": {},
                "total": 0,
            }
        raw_targets = [
            line.strip()
            for line in nuclei_targets_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]

    targets = []
    for target in raw_targets:
        cleaned = clean_domain(target)
        if cleaned and cleaned in http_live:
            targets.append(cleaned)
    targets = list(dict.fromkeys(targets))

    if not targets:
        return {
            "success": False,
            "error": "No valid targets after filtering against http_live.txt",
            "findings": [],
            "summary": {},
            "total": 0,
        }

    print(f"Nuclei target count: {len(targets)}")

    # Persist the final filtered list and run Nuclei directly from it.
    nuclei_targets_path.write_text("\n".join(targets) + "\n", encoding="utf-8")
    if not nuclei_targets_path.exists() or nuclei_targets_path.stat().st_size == 0:
        return {
            "success": False,
            "error": "Targets file is missing or empty",
            "findings": [],
            "summary": {},
            "total": 0,
        }

    local_nuclei = os.path.join(os.getcwd(), "nuclei.exe")
    nuclei_cmd = local_nuclei if os.path.exists(local_nuclei) else "nuclei"
    if nuclei_cmd != "nuclei" and not os.path.isfile(nuclei_cmd):
        return {"success": False, "error": f"Nuclei not found at {nuclei_cmd}", "findings": [], "summary": {}, "total": 0}

    mode = (request.mode or "fast").lower()
    current_scan["running"] = True
    current_scan["results"] = []
    current_scan["stats"] = {
        "requests": 0,
        "templates": 0,
        "last_lines": [],
        "last_update": None,
    }

    try:
        base_cmd = [
            nuclei_cmd,
            "-l",
            str(nuclei_targets_path),
            "-jsonl",
            "-stats",
        ]
        if mode == "deep":
            cmd = base_cmd
        else:
            cmd = base_cmd + [
                "-c",
                "50",
                "-timeout",
                "5",
                "-retries",
                "1",
                "-rate-limit",
                "150",
                "-severity",
                "high",
                "-tags",
                "cve,exposure",
            ]

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        current_scan["process"] = process
    except FileNotFoundError:
        current_scan["running"] = False
        return {"success": False, "error": "Nuclei binary not found on server PATH", "findings": [], "summary": {}, "total": 0}
    except Exception as exc:
        current_scan["running"] = False
        return {"success": False, "error": f"Failed to run nuclei: {exc}", "findings": [], "summary": {}, "total": 0}

    if process.stdout:
        for line in process.stdout:
            if not current_scan["running"]:
                break
            line = line.strip()
            if not line:
                continue
            print(line)
            current_scan["stats"]["last_update"] = line
            parsed_stats = None
            if line.startswith("{") and line.endswith("}"):
                try:
                    parsed_stats = json.loads(line)
                except json.JSONDecodeError:
                    parsed_stats = None
                if isinstance(parsed_stats, dict) and (
                    parsed_stats.get("template-id") or parsed_stats.get("template") or parsed_stats.get("matched-at")
                ):
                    info = parsed_stats.get("info") or {}
                    current_scan["results"].append({
                        "name": info.get("name") or parsed_stats.get("name") or "Unknown",
                        "severity": (info.get("severity") or parsed_stats.get("severity") or "unknown").lower(),
                        "template": parsed_stats.get("template-id") or parsed_stats.get("template") or "unknown",
                        "matched": parsed_stats.get("matched-at") or parsed_stats.get("matched") or parsed_stats.get("host") or "",
                    })
            if isinstance(parsed_stats, dict) and (
                "percent" in parsed_stats
                or "requests" in parsed_stats
                or "total" in parsed_stats
                or "rps" in parsed_stats
            ):
                current_scan["stats"]["stats"] = parsed_stats
                if "requests" in parsed_stats:
                    current_scan["stats"]["requests"] = int(parsed_stats.get("requests") or 0)
                if "templates" in parsed_stats:
                    current_scan["stats"]["templates"] = int(parsed_stats.get("templates") or 0)
            else:
                current_scan["stats"]["last_lines"] = (current_scan["stats"]["last_lines"] + [line])[-12:]
                req_match = re.search(r"requests\s*:\s*(\d+)", line, re.IGNORECASE)
                tmpl_match = re.search(r"templates\s*:\s*(\d+)", line, re.IGNORECASE)
                if req_match:
                    current_scan["stats"]["requests"] = int(req_match.group(1))
                if tmpl_match:
                    current_scan["stats"]["templates"] = int(tmpl_match.group(1))

        process.wait()

    current_scan["running"] = False
    current_scan["process"] = None

    if process.returncode != 0:
        print("Nuclei failed")
        run_payload = {
            "success": False,
            "mode": mode,
            "targets": targets,
            "target_count": len(targets),
            "findings": current_scan["results"],
        }
        run_id = save_nuclei_scan(run_payload)
        return {
            "success": False,
            "error": f"Nuclei exited with code {process.returncode}",
            "findings": current_scan["results"],
            "summary": {},
            "total": len(current_scan["results"]),
            "run_id": run_id,
        }

    summary = {}
    for entry in current_scan["results"]:
        severity = entry.get("severity", "unknown") or "unknown"
        summary[severity] = summary.get(severity, 0) + 1

    run_payload = {
        "success": True,
        "mode": mode,
        "targets": targets,
        "target_count": len(targets),
        "findings": current_scan["results"],
        "summary": summary,
    }
    run_id = save_nuclei_scan(run_payload)

    return {"success": True, "findings": current_scan["results"], "summary": summary, "total": len(current_scan["results"]), "run_id": run_id}


@app.post("/stop-nuclei")
def stop_nuclei_scan():
    process = current_scan["process"]
    if not process or process.poll() is not None:
        current_scan["running"] = False
        current_scan["process"] = None
        return {"success": False, "message": "No scan running"}
    try:
        process.terminate()
        current_scan["running"] = False
        return {"success": True, "message": "Scan stopped"}
    finally:
        current_scan["process"] = None


@app.get("/nuclei-status")
def nuclei_status():
    return {
        "running": current_scan["running"],
        "requests": current_scan["stats"].get("requests", 0),
        "templates": current_scan["stats"].get("templates", 0),
        "stats": current_scan["stats"].get("stats"),
        "last_lines": current_scan["stats"].get("last_lines", []),
        "last_update": current_scan["stats"].get("last_update"),
    }


@app.get("/nuclei-results")
def nuclei_results(run_id: str | None = None):
    if run_id:
        stored = get_nuclei_scan(run_id)
        if stored and isinstance(stored.get("payload"), dict):
            payload = stored["payload"]
            return {
                "source": "saved",
                "run_id": stored.get("run_id"),
                "timestamp": stored.get("timestamp"),
                "findings": payload.get("findings") or [],
                "summary": payload.get("summary") or {},
                "total": len(payload.get("findings") or []),
            }
        return {"source": "saved", "run_id": run_id, "timestamp": None, "findings": [], "summary": {}, "total": 0}

    if current_scan["results"]:
        summary = {}
        for entry in current_scan["results"]:
            severity = entry.get("severity", "unknown") or "unknown"
            summary[severity] = summary.get(severity, 0) + 1
        return {"source": "memory", "findings": current_scan["results"], "summary": summary, "total": len(current_scan["results"])}

    stored = get_latest_nuclei_scan()
    if stored and isinstance(stored.get("payload"), dict):
        payload = stored["payload"]
        return {
            "source": "saved",
            "run_id": stored.get("run_id"),
            "timestamp": stored.get("timestamp"),
            "findings": payload.get("findings") or [],
            "summary": payload.get("summary") or {},
            "total": len(payload.get("findings") or []),
        }

    return {"source": "none", "findings": [], "summary": {}, "total": 0}


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
