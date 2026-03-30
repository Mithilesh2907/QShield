import logging
import socket
import subprocess
from pathlib import Path
from typing import Iterable, List, Tuple

try:
    import dns
    import dns.resolver
except ImportError:  # pragma: no cover
    dns = None

MAX_ASSETS = 20
MAX_SUBDOMAINS = 50

logger = logging.getLogger(__name__)


def _resolve_ip(domain: str):
    try:
        return socket.gethostbyname(domain)
    except Exception:
        if dns is None:
            return None
        try:
            answers = dns.resolver.resolve(domain, "A")
            for answer in answers:
                ip_value = str(answer)
                if ip_value:
                    return ip_value
        except Exception:
            return None
    return None


def clean_domain(url: str) -> str:
    if not url:
        return ""

    stripped = url.strip()
    if stripped.startswith("http://"):
        stripped = stripped[len("http://") :]
    elif stripped.startswith("https://"):
        stripped = stripped[len("https://") :]

    stripped = stripped.replace("www.", "", 1)
    stripped = stripped.rstrip("/").strip()
    stripped = stripped.split("/")[0]
    return stripped


def _locate_executable(name: str, fallback: str | None = None) -> List[str]:
    command = [name]
    if fallback:
        project_root = Path(__file__).resolve().parents[3]
        candidate = project_root / fallback
        if candidate.exists():
            command = [str(candidate)]
    return command


def _run_subfinder(domain: str) -> Iterable[str]:
    commands = [
        ["subfinder", "-d", domain, "-silent"],
        _locate_executable("subfinder", fallback="subfinder.exe") + ["-d", domain, "-silent"],
    ]

    for command in commands:
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )

            if result.returncode != 0:
                logger.warning("Subfinder failed: %s", (result.stderr or "").strip())
                continue

            output = [
                clean_domain(line)
                for line in result.stdout.splitlines()
                if clean_domain(line)
            ]
            if output:
                return output

        except (subprocess.TimeoutExpired, OSError) as exc:
            logger.warning("Subfinder error: %s", exc)
            continue

    return []


def _filter_live_domains(domains: List[str]) -> Tuple[List[str], bool]:
    if not domains:
        return [], True

    cmd = _locate_executable("httpx") + [
        "-silent",
        "-follow-redirects",
        "-timeout",
        "5",
        "-retries",
        "2",
    ]
    try:
        payload = "\n".join(domains)
        result = subprocess.run(
            cmd,
            input=payload,
            capture_output=True,
            text=True,
            timeout=25,
            check=False,
        )

        live = result.stdout.splitlines()
        live = [clean_domain(line) for line in live if clean_domain(line)]
        live = list(dict.fromkeys(live))

        print("HTTPX returned:", len(live))
        return live, True

    except (subprocess.TimeoutExpired, OSError):
        print("HTTPX returned: 0 (fallback)")
        return [], False


def discover_assets(domain: str):
    subdomains = _run_subfinder(domain)
    subdomains = list(dict.fromkeys(subdomains))  # dedupe while keeping order
    subdomains = subdomains[:MAX_SUBDOMAINS]
    print("Subfinder count:", len(subdomains))
    print("Subdomains limited to:", len(subdomains))
    domain_clean = clean_domain(domain)
    subdomains = [clean_domain(d) for d in subdomains if clean_domain(d)]
    if domain_clean and domain_clean not in subdomains:
        subdomains.insert(0, domain_clean)
    if not subdomains:
        logger.info("No subdomains found for %s", domain)
        subdomains = [domain_clean] if domain_clean else []
    print("Subfinder returned:", len(subdomains))
    live_domains, httpx_success = _filter_live_domains(subdomains)
    assets = []
    for candidate in subdomains:
        cleaned_candidate = clean_domain(candidate)
        ip_address = _resolve_ip(cleaned_candidate)
        print(f"{cleaned_candidate} → {ip_address}")
        live_httpx = cleaned_candidate in live_domains
        assets.append(
            {
                "domain": cleaned_candidate,
                "ip": ip_address,
                "is_live": live_httpx,
                "live_httpx": live_httpx,
            }
        )
    print("Live domains:", len(live_domains))

    if not assets:
        logger.error("Subfinder returned no domains for %s", domain)
    assets = assets[:MAX_ASSETS]
    print("Final assets:", len(assets))

    return assets
