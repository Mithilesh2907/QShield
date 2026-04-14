from __future__ import annotations

import logging
from typing import Any

import dnstwist

logger = logging.getLogger(__name__)


def _normalize_ip(value: Any) -> str | list[str] | None:
    if isinstance(value, list):
        ips = [str(item) for item in value if item]
        return ips[0] if ips else None
    if value:
        return str(value)
    return None


def _normalize_mx(value: Any) -> bool:
    if isinstance(value, list):
        return bool([item for item in value if item])
    return bool(value)


def _similarity_to_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None
        try:
            return int(float(candidate))
        except ValueError:
            return None
    return None


def _compute_risk(
    has_a: bool,
    has_mx: bool,
    similarity: int | None,
    fuzzer: str | None,
    is_original: bool = False,
) -> str:
    if is_original:
        return "LOW"
    if similarity is not None and similarity > 70:
        return "CRITICAL"
    if has_mx:
        return "HIGH"
    if has_a:
        if not has_mx and fuzzer in {"homoglyph", "bitsquatting"}:
            return "MEDIUM"
        return "MEDIUM"
    if not has_a and not has_mx and fuzzer in {"homoglyph", "bitsquatting"}:
        return "MEDIUM"
    return "LOW"


def scan_threat_surface(domain: str, enable_phishing_detection: bool = False) -> list[dict[str, Any]]:
    try:
        data = dnstwist.run(
            domain=domain,
            registered=True,
            format="null",
            lsh=enable_phishing_detection,
        )
    except Exception as exc:
        if enable_phishing_detection:
            # LSH can fail when native similarity libraries are unavailable.
            logger.warning(
                "LSH disabled for %s due to dependency/runtime error: %s",
                domain,
                exc,
            )
            data = dnstwist.run(
                domain=domain,
                registered=True,
                format="null",
                lsh=False,
            )
        else:
            raise

    active_only = True
    results: list[dict[str, Any]] = []
    for entry in data or []:
        dns_a = entry.get("dns_a")
        dns_mx = entry.get("dns_mx")
        has_a = bool(dns_a)
        has_mx = bool(dns_mx)

        similarity = _similarity_to_int(entry.get("lsh"))
        fuzzer = entry.get("fuzzer")
        is_original = fuzzer == "*original"
        risk = _compute_risk(
            has_a=has_a,
            has_mx=has_mx,
            similarity=similarity,
            fuzzer=fuzzer,
            is_original=is_original,
        )

        if active_only and not (has_a or has_mx):
            continue

        results.append(
            {
                "domain": entry.get("domain"),
                "type": entry.get("fuzzer"),
                "ip": _normalize_ip(dns_a),
                "has_mx": _normalize_mx(dns_mx),
                "similarity": similarity,
                "risk": risk,
            }
        )

    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    results.sort(key=lambda item: order.get(str(item.get("risk")), 99))

    return results
