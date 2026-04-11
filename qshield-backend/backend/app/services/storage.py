import json
import os
from datetime import datetime
import uuid

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "scans.json")
NUCLEI_DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "nuclei_scans.json")

def _ensure_file(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump([], f)

def save_scan(domain: str, payload: dict):
    _ensure_file(DATA_FILE)
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            scans = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        scans = []
        
    # Append new scan
    scans.append({
        "timestamp": datetime.now().isoformat(),
        "domain": domain,
        "payload": payload
    })
    
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(scans, f, indent=2)

def get_latest_scans():
    _ensure_file(DATA_FILE)
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def get_latest_scan_for_domain(domain: str):
    scans = get_latest_scans()
    domain_scans = [s for s in scans if s["domain"] == domain]
    if domain_scans:
        # Sort by timestamp desc and return newest
        domain_scans.sort(key=lambda x: x["timestamp"], reverse=True)
        return domain_scans[0]["payload"]
    return None


def save_nuclei_scan(payload: dict) -> str:
    _ensure_file(NUCLEI_DATA_FILE)
    try:
        with open(NUCLEI_DATA_FILE, "r", encoding="utf-8") as f:
            scans = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        scans = []

    run_id = str(uuid.uuid4())
    scans.append({
        "run_id": run_id,
        "timestamp": datetime.now().isoformat(),
        "payload": payload,
    })

    with open(NUCLEI_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(scans, f, indent=2)

    return run_id


def get_latest_nuclei_scans():
    _ensure_file(NUCLEI_DATA_FILE)
    try:
        with open(NUCLEI_DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def get_latest_nuclei_scan():
    scans = get_latest_nuclei_scans()
    if not scans:
        return None
    scans.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    return scans[0]


def get_nuclei_scan(run_id: str):
    scans = get_latest_nuclei_scans()
    for scan in scans:
        if scan.get("run_id") == run_id:
            return scan
    return None
