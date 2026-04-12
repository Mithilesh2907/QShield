import logging
import re
import socket
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable, List, Tuple

try:
    import dns
    import dns.resolver
except ImportError:  # pragma: no cover
    dns = None

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None


logger = logging.getLogger(__name__)


_DOMAIN_ALLOWED_RE = re.compile(r"^[A-Za-z0-9.-]+$")


def _run_command(
    command: list[str],
    timeout: int,
    register_process: Callable[[subprocess.Popen | None], None] | None = None,
    is_running: Callable[[], bool] | None = None,
) -> subprocess.CompletedProcess[str] | None:
    proc: subprocess.Popen[str] | None = None
    try:
        proc = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if register_process:
            register_process(proc)

        elapsed = 0.0
        step = 0.2
        while True:
            if is_running and not is_running():
                proc.terminate()
                stdout, stderr = proc.communicate(timeout=2)
                return subprocess.CompletedProcess(command, proc.returncode or 1, stdout, stderr)
            try:
                stdout, stderr = proc.communicate(timeout=step)
                return subprocess.CompletedProcess(command, proc.returncode or 0, stdout, stderr)
            except subprocess.TimeoutExpired:
                elapsed += step
                if elapsed >= timeout:
                    proc.kill()
                    stdout, stderr = proc.communicate()
                    return subprocess.CompletedProcess(command, proc.returncode or 1, stdout, stderr)
                continue
    except OSError:
        return None
    finally:
        if register_process:
            register_process(None)


def _is_valid_domain(domain: str) -> bool:
    if not domain:
        return False

    candidate = domain.strip()
    if not candidate:
        return False

    if candidate.startswith("*."):
        return False

    if "/" in candidate or " " in candidate or "\t" in candidate:
        return False

    if candidate.startswith(".") or candidate.endswith(".") or "." not in candidate:
        return False

    try:
        ascii_domain = candidate.encode("idna").decode("ascii")
    except UnicodeError:
        return False

    if len(ascii_domain) > 253 or not _DOMAIN_ALLOWED_RE.match(ascii_domain):
        return False

    for label in ascii_domain.split("."):
        if not label or len(label) > 63:
            return False
        if label.startswith("-") or label.endswith("-"):
            return False

    return True


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
            return [str(candidate)]
        backend_candidate = project_root / "backend" / fallback
        if backend_candidate.exists():
            return [str(backend_candidate)]
    return command


def _run_subfinder(
    domain: str,
    register_process: Callable[[subprocess.Popen | None], None] | None = None,
    is_running: Callable[[], bool] | None = None,
) -> Iterable[str]:
    commands = [
        ["subfinder", "-d", domain, "-silent"],
        _locate_executable("subfinder", fallback="subfinder.exe") + ["-d", domain, "-silent"],
    ]

    for command in commands:
        try:
            result = _run_command(
                command,
                timeout=60,
                register_process=register_process,
                is_running=is_running,
            )
            if result is None:
                continue

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


def get_crtsh_subdomains(domain: str) -> List[str]:
    entries = _fetch_crtsh_entries(domain)
    return _extract_crtsh_subdomains(entries, clean_domain(domain))


def _fetch_crtsh_entries(domain: str) -> List[dict]:
    domain_clean = clean_domain(domain)
    if not domain_clean:
        return []

    if requests is None:
        logger.warning("requests not installed; crt.sh disabled")
        return []

    url = f"https://crt.sh/?q=%25.{domain_clean}&output=json"
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            logger.warning("crt.sh returned %s", resp.status_code)
            return []

        payload = resp.json()
        if not isinstance(payload, list):
            return []

        return [entry for entry in payload if isinstance(entry, dict)]
    except Exception:
        # Fail safe for timeout/5xx/JSON errors; never break discovery pipeline.
        return []


def _extract_crtsh_subdomains(data: List[dict], domain: str) -> List[str]:
    if not domain:
        return []

    domain = domain.strip().lower()
    subdomains: List[str] = []
    for entry in data:
        names = entry.get("name_value", "").split("\n")

        for name in names:
            name = name.strip().lower()

            if name.startswith("*."):
                name = name[2:]

            if domain in name:
                cleaned = clean_domain(name)
                if cleaned and _is_valid_domain(cleaned):
                    subdomains.append(cleaned)

    subdomains = list(set(subdomains))
    return subdomains


def _parse_crtsh_datetime(value: object) -> datetime | None:
    if not isinstance(value, str):
        return None

    candidate = value.strip()
    if not candidate:
        return None

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(candidate, fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    try:
        parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None


def get_crtsh_cert_info(domain: str, entries: List[dict] | None = None) -> List[dict]:
    payload = entries if entries is not None else _fetch_crtsh_entries(domain)
    if not payload:
        return []

    try:
        now = datetime.now(timezone.utc)
        by_serial: dict[str, dict] = {}

        for entry in payload:
            if not isinstance(entry, dict):
                continue

            not_after_raw = entry.get("not_after")
            not_after_dt = _parse_crtsh_datetime(not_after_raw)
            is_expired = bool(not_after_dt and now > not_after_dt)
            days_remaining = None
            if not_after_dt:
                days_remaining = (not_after_dt - now).days

            serial_number = entry.get("serial_number")
            serial_key = str(serial_number).strip() if serial_number is not None else ""
            if not serial_key:
                serial_key = "|".join(
                    str(part or "").strip()
                    for part in (
                        entry.get("common_name"),
                        entry.get("issuer_name"),
                        entry.get("not_after"),
                        entry.get("not_before"),
                    )
                )

            cert_info = {
                "common_name": entry.get("common_name"),
                "issuer": entry.get("issuer_name"),
                "not_before": entry.get("not_before"),
                "not_after": entry.get("not_after"),
                "serial_number": entry.get("serial_number"),
                "entry_timestamp": entry.get("entry_timestamp"),
                "name_value": entry.get("name_value"),
                "is_expired": is_expired,
                "days_remaining": days_remaining,
                "signature_algorithm": entry.get("signature_algorithm") or "unknown",
                "key_algorithm": entry.get("key_algorithm") or "unknown",
                "key_size": entry.get("key_size") or "unknown",
            }

            existing = by_serial.get(serial_key)
            if existing is None:
                by_serial[serial_key] = cert_info
                continue

            existing_ts = _parse_crtsh_datetime(existing.get("entry_timestamp"))
            new_ts = _parse_crtsh_datetime(entry.get("entry_timestamp"))
            if new_ts and (not existing_ts or new_ts > existing_ts):
                by_serial[serial_key] = cert_info

        certs = list(by_serial.values())
        certs.sort(
            key=lambda c: _parse_crtsh_datetime(c.get("entry_timestamp"))
            or _parse_crtsh_datetime(c.get("not_after"))
            or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        return certs[:100]

    except Exception:
        return []


def _write_lines(path: Path, lines: Iterable[str]) -> None:
    items = list(lines)
    path.write_text("\n".join(items) + ("\n" if items else ""), encoding="utf-8")


def _read_lines(path: Path) -> List[str]:
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _run_httpx(
    domains_path: Path,
    http_live_path: Path,
    register_process: Callable[[subprocess.Popen | None], None] | None = None,
    is_running: Callable[[], bool] | None = None,
) -> Tuple[set[str], bool]:
    cmd = _locate_executable("httpx", fallback="httpx.exe") + [
        "-l",
        str(domains_path),
        "-silent",
        "-threads",
        "100",
    ]

    try:
        result = _run_command(
            cmd,
            timeout=120,
            register_process=register_process,
            is_running=is_running,
        )
        if result is None:
            _write_lines(http_live_path, [])
            return set(), False

        live: List[str] = []
        for line in result.stdout.splitlines():
            if not line:
                continue
            url = line.split()[0]
            cleaned = clean_domain(url)
            if cleaned and _is_valid_domain(cleaned):
                live.append(cleaned)
        live = list(dict.fromkeys(live))
        _write_lines(http_live_path, live)

        if result.returncode != 0 and not live:
            error_msg = (result.stderr or "").strip()
            if error_msg:
                logger.warning("HTTPX failed: %s", error_msg)
                return set(), False

        return set(live), True

    except (subprocess.TimeoutExpired, OSError):
        print("HTTPX failed")
        _write_lines(http_live_path, [])
        return set(), False


def _run_dns(domains_path: Path, dns_live_path: Path) -> dict[str, str | None]:
    domains = _read_lines(domains_path)
    resolved: dict[str, str | None] = {}
    dns_live: List[str] = []

    with ThreadPoolExecutor(max_workers=50) as executor:
        ip_results = list(executor.map(_resolve_ip, domains))

    for domain, ip_address in zip(domains, ip_results, strict=False):
        resolved[domain] = ip_address
        if ip_address is not None:
            dns_live.append(domain)

    _write_lines(dns_live_path, dns_live)
    return resolved


def discover_assets(
    domain: str,
    use_crtsh: bool = False,
    register_process: Callable[[subprocess.Popen | None], None] | None = None,
    is_running: Callable[[], bool] | None = None,
) -> tuple[list[dict], list[dict]]:
    if is_running and not is_running():
        return [], []

    if use_crtsh:
        with ThreadPoolExecutor(max_workers=2) as executor:
            future_subfinder = executor.submit(_run_subfinder, domain, register_process, is_running)
            future_crtsh_entries = executor.submit(_fetch_crtsh_entries, domain)
            subfinder_domains = list(future_subfinder.result() or [])
            crtsh_entries = list(future_crtsh_entries.result() or [])

        crtsh_domains = _extract_crtsh_subdomains(crtsh_entries, clean_domain(domain))
        cert_info = get_crtsh_cert_info(domain, entries=crtsh_entries)

        print(f"Subfinder: {len(subfinder_domains)}")
        print(f"crt.sh: {len(crtsh_domains)}")
        print(f"crt.sh certs: {len(cert_info)}")
    else:
        subfinder_domains = list(_run_subfinder(domain, register_process, is_running))
        print(f"Subfinder: {len(subfinder_domains)}")
        crtsh_domains = []
        cert_info = []

    subdomains = list(set(subfinder_domains + crtsh_domains))
    print(f"Total combined: {len(subdomains)}")

    subdomains = [clean_domain(d) for d in subdomains if clean_domain(d)]
    subdomains = [d for d in subdomains if _is_valid_domain(d) and not d.startswith("*.")]
    subdomains = list(set(subdomains))

    domain_clean = clean_domain(domain)
    if domain_clean and _is_valid_domain(domain_clean) and domain_clean not in subdomains:
        subdomains.insert(0, domain_clean)

    if not subdomains:
        logger.info("No valid subdomains found for %s", domain)
        return [], cert_info

    domains_path = Path("domains.txt")
    http_live_path = Path("http_live.txt")
    dns_live_path = Path("dns_live.txt")
    nmap_targets_path = Path("nmap_targets.txt")
    nuclei_targets_path = Path("nuclei_targets.txt")

    _write_lines(domains_path, subdomains)
    print(f"Total discovered: {len(subdomains)}")

    if is_running and not is_running():
        return [], cert_info

    print("HTTPX input count:", len(_read_lines(domains_path)))
    http_live, httpx_success = _run_httpx(
        domains_path,
        http_live_path,
        register_process=register_process,
        is_running=is_running,
    )
    if not httpx_success:
        print("HTTPX failed \u2014 not using fallback")
    print("HTTPX output count:", len(http_live))

    if is_running and not is_running():
        return [], cert_info

    resolved_map = _run_dns(domains_path, dns_live_path)

    _write_lines(nmap_targets_path, _read_lines(dns_live_path))
    _write_lines(nuclei_targets_path, _read_lines(http_live_path))

    assets = []
    domains = _read_lines(domains_path)
    print(f"Processing domains: {len(domains)}")
    for candidate in domains:
        if is_running and not is_running():
            break
        ip_address = resolved_map.get(candidate)
        print(f"{candidate} -> {ip_address}")
        live_httpx = candidate in http_live
        assets.append(
            {
                "domain": candidate,
                "ip": ip_address,
                "is_live": ip_address is not None,
                "live_httpx": live_httpx,
            }
        )
    if not assets:
        logger.error("Subfinder returned no domains for %s", domain)
    print("Final assets:", len(assets))

    return assets, cert_info
