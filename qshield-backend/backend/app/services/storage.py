import json
import os
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "scans.json")

def _ensure_file():
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)

def save_scan(domain: str, payload: dict):
    _ensure_file()
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
    _ensure_file()
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
