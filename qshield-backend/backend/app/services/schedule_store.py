"""Persists scheduled report entries to a local JSON file."""

import json
import os
from pathlib import Path

_STORE_PATH = Path(__file__).parent.parent.parent / "data" / "schedules.json"


def _ensure_dir():
    _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)


def load_schedules() -> list[dict]:
    _ensure_dir()
    if not _STORE_PATH.exists():
        return []
    try:
        with open(_STORE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def save_schedules(schedules: list[dict]) -> None:
    _ensure_dir()
    with open(_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(schedules, f, indent=2)


def add_schedule(entry: dict) -> None:
    schedules = load_schedules()
    schedules.append(entry)
    save_schedules(schedules)


def update_schedule_status(schedule_id: str, status: str) -> None:
    schedules = load_schedules()
    for s in schedules:
        if s.get("id") == schedule_id:
            s["status"] = status
            break
    save_schedules(schedules)
