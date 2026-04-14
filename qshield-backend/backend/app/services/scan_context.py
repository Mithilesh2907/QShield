from __future__ import annotations

import json
import logging
import os
import requests
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

BASE_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SCAN_CONTEXT_FILE = BASE_DATA_DIR / "scan_context.json"
logger = logging.getLogger(__name__)


def _ensure_file() -> None:
    BASE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not SCAN_CONTEXT_FILE.exists():
        SCAN_CONTEXT_FILE.write_text("{}", encoding="utf-8")


def load_scan_context() -> dict[str, Any]:
    _ensure_file()
    try:
        return json.loads(SCAN_CONTEXT_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        return {}


def save_scan_context(payload: dict[str, Any]) -> None:
    _ensure_file()
    SCAN_CONTEXT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def build_scan_context(
    *,
    assets: list[dict[str, Any]] | None = None,
    threat_surface: list[dict[str, Any]] | None = None,
    vulnerabilities: list[dict[str, Any]] | None = None,
    cbom: list[dict[str, Any]] | None = None,
    summary: dict[str, Any] | None = None,
    domain: str | None = None,
) -> dict[str, Any]:
    context = load_scan_context()
    if domain is not None:
        context["domain"] = domain
    if assets is not None:
        context["assets"] = assets
    if threat_surface is not None:
        context["threat_surface"] = threat_surface
    if vulnerabilities is not None:
        context["vulnerabilities"] = vulnerabilities
    if cbom is not None:
        context["cbom"] = cbom
    if summary is not None:
        context["summary"] = summary
    save_scan_context(context)
    return context


def call_local_gemini(prompt: str) -> dict[str, str]:
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate").strip()
    ollama_model = os.getenv("OLLAMA_MODEL", "gemma4:e4b-it-q4_k_m").strip()

    def _request_json(url: str, payload: dict[str, Any], headers: dict[str, str], timeout: int) -> dict[str, Any]:
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw or "{}")

    try:
        logger.info("Calling Ollama API...")
        logger.info(f"Model: {ollama_model}")
        logger.info(f"URL: {ollama_url}")
        data = _request_json(
            ollama_url,
            {
                "model": ollama_model,
                "prompt": prompt,
                "stream": False,
            },
            {
                "Content-Type": "application/json",
            },
            timeout=45,
        )
        logger.info(f"Ollama raw response: {data}")
        response_text = str(data.get("response") or "")
        if response_text.strip():
            logger.info("Ollama succeeded model=%s", ollama_model)
            return {
                "response": response_text,
                "provider": "ollama",
                "model": ollama_model,
            }
        raise RuntimeError("Ollama returned an empty response")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        logger.error("Ollama request failed model=%s error=%s", ollama_model, exc, exc_info=True)
        raise RuntimeError(f"Ollama error: {exc}") from exc


def call_nvidia_llm(prompt: str) -> dict[str, str]:
    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    logger.info(f"NVIDIA KEY PRESENT: {bool(api_key)}")
    if not api_key:
        raise RuntimeError("NVIDIA API failed: missing NVIDIA_API_KEY")

    url = "https://integrate.api.nvidia.com/v1/chat/completions"
    model = "google/gemma-3n-e4b-it"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 512,
        "temperature": 0.2,
        "top_p": 0.7,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        logger.info("Calling NVIDIA API...")
        response = requests.post(url, headers=headers, json=payload, timeout=60)

        if response.status_code != 200:
            raise RuntimeError(f"NVIDIA error {response.status_code}: {response.text}")

        data = response.json()
        logger.info(f"NVIDIA RAW RESPONSE: {data}")

        try:
            content = data["choices"][0]["message"]["content"]
        except Exception:
            raise RuntimeError(f"Invalid NVIDIA response: {data}")

        logger.info("NVIDIA success")
        return {
            "response": content,
            "provider": "nvidia",
            "model": model,
        }
    except Exception as exc:
        logger.error("NVIDIA API failed: %s", exc, exc_info=True)
        raise RuntimeError(f"NVIDIA API failed: {exc}") from exc
