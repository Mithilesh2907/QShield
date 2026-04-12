import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Callable


def _locate_nmap() -> list[str]:
    project_root = Path(__file__).resolve().parents[3]
    bundled = project_root / "nmap.exe"
    if bundled.exists():
        return [str(bundled)]
    return ["nmap"]


def _parse_ports(output: str) -> dict:
    ports = {"80": False, "443": False, "8080": False, "8443": False}
    for line in output.splitlines():
        if "80/tcp" in line and "open" in line:
            ports["80"] = True
        if "443/tcp" in line and "open" in line:
            ports["443"] = True
        if "8080/tcp" in line and "open" in line:
            ports["8080"] = True
        if "8443/tcp" in line and "open" in line:
            ports["8443"] = True
    return ports


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


def scan_ports(
    domain: str,
    register_process: Callable[[subprocess.Popen | None], None] | None = None,
    is_running: Callable[[], bool] | None = None,
):
    command = _locate_nmap() + ["-p", "80,443,8080,8443", "--open", domain]
    try:
        result = _run_command(
            command,
            timeout=10,
            register_process=register_process,
            is_running=is_running,
        )
        if result is None:
            return {
                "domain": domain,
                "ports": {"80": False, "443": False, "8080": False, "8443": False},
            }

        if result.returncode != 0:
            return {
                "domain": domain,
                "ports": {"80": False, "443": False, "8080": False, "8443": False},
            }

        ports = _parse_ports(result.stdout + result.stderr)
        return {
            "domain": domain,
            "ports": ports,
        }

    except (subprocess.TimeoutExpired, OSError):
        return {
            "domain": domain,
            "ports": {"80": False, "443": False, "8080": False, "8443": False},
        }


def _is_outdated_service(info: str) -> bool:
    keywords = ("apache", "openssh", "nginx")
    normalized = (info or "").lower()
    return any(keyword in normalized for keyword in keywords)


def _parse_services_from_xml(xml_path: Path) -> tuple[list[dict], str | None]:
    services: list[dict] = []
    extracted_ip = None
    try:
        tree = ET.parse(xml_path)
    except (ET.ParseError, FileNotFoundError):
        return services, None

    root = tree.getroot()
    for host in root.findall("host"):
        if not extracted_ip:
            for addr in host.findall("address"):
                if (addr.get("addrtype") or "").lower() == "ipv4":
                    extracted_ip = addr.get("addr")
                    break
        for port_elem in host.findall(".//port"):
            state = port_elem.find("state")
            if state is None or state.get("state") != "open":
                continue
            service_el = port_elem.find("service")
            port_num = port_elem.get("portid")
            service_name = (service_el.get("name") if service_el is not None else "") or ""
            product = (service_el.get("product") if service_el is not None else "") or ""
            version = (service_el.get("version") if service_el is not None else "") or ""
            info_text = " ".join(filter(None, [product, version, service_name]))
            services.append({
                "port": int(port_num) if port_num and port_num.isdigit() else None,
                "service": service_name or product or "unknown",
                "product": product,
                "version": version,
                "outdated": _is_outdated_service(info_text),
            })
    return services, extracted_ip


def scan_service_versions(
    target: str,
    register_process: Callable[[subprocess.Popen | None], None] | None = None,
    is_running: Callable[[], bool] | None = None,
) -> dict:
    if not target:
        return []

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xml")
    temp_file.close()
    xml_path = Path(temp_file.name)
    command = _locate_nmap() + ["-sV", "-T4", "-oX", str(xml_path), target]
    try:
        result = _run_command(
            command,
            timeout=60,
            register_process=register_process,
            is_running=is_running,
        )
        if result is None:
            return {"services": [], "ip": None}
        services, parsed_ip = _parse_services_from_xml(xml_path)
        return {"services": services, "ip": parsed_ip}
    except (subprocess.TimeoutExpired, OSError):
        return {"services": [], "ip": None}
    finally:
        if xml_path.exists():
            xml_path.unlink()


def run_nmap_scan(
    target: str,
    register_process: Callable[[subprocess.Popen | None], None] | None = None,
    is_running: Callable[[], bool] | None = None,
) -> dict:
    result = scan_service_versions(target, register_process=register_process, is_running=is_running)
    if not isinstance(result, dict):
        result = {"services": [], "ip": None}
    return {"target": target, **result}
