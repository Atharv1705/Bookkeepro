"""
Document Intelligence Utilities.

Provides:
  1. field_validator      — regex-based type validation for extracted fields
  2. reconcile_user_docs  — cross-document field comparison (name/ID mismatches)
  3. build_daily_digest   — AI-generated plain-English summary of today's activity
"""
from __future__ import annotations

import re
import os
import logging
import requests
from datetime import datetime, date
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Field type validation
# ─────────────────────────────────────────────────────────────────────────────

# Field name patterns → (regex that the VALUE must match, human label for error)
_FIELD_VALIDATORS: list[tuple[re.Pattern, re.Pattern, str]] = [
    # key pattern                              value pattern                  error label
    (re.compile(r'pan[_\s]?(number|no)?',  re.I), re.compile(r'^[A-Z]{5}\d{4}[A-Z]$'),        "PAN (AAAAA9999A)"),
    (re.compile(r'aadhaar[_\s]?(no|number)?', re.I), re.compile(r'^\d{4}\s?\d{4}\s?\d{4}$'), "Aadhaar (12 digits)"),
    (re.compile(r'(ein|employer[_\s]?id)',  re.I), re.compile(r'^\d{2}-\d{7}$'),               "EIN (XX-XXXXXXX)"),
    (re.compile(r'ssn|social[_\s]?security', re.I), re.compile(r'^\d{3}-\d{2}-\d{4}$'),       "SSN (XXX-XX-XXXX)"),
    (re.compile(r'date[_\s]?of[_\s]?birth|dob', re.I),
     re.compile(r'^\d{2}/\d{2}/\d{4}$'),                                                        "DOB (DD/MM/YYYY)"),
    (re.compile(r'(inv|invoice)[_\s]?(dt|date)', re.I),
     re.compile(r'^\d{2}/\d{2}/\d{4}$'),                                                        "Date (DD/MM/YYYY)"),
    (re.compile(r'tax[_\s]?year',           re.I), re.compile(r'^\d{4}$'),                     "Tax Year (4 digits)"),
    (re.compile(r'gst[_\s]?(no|number)?',   re.I),
     re.compile(r'^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),                              "GSTIN (15-char format)"),
]


def validate_extracted_fields(extracted_data: dict) -> list[dict]:
    """
    Run format validation against extracted fields.
    Returns a list of validation warnings (empty list = all clear).

    Each warning: {"field": str, "value": str, "expected": str, "severity": "warning"|"error"}
    """
    if not extracted_data:
        return []

    warnings = []
    for key, value in extracted_data.items():
        if key == "_meta" or value is None or not isinstance(value, str):
            continue
        val = value.strip()
        for key_pattern, val_pattern, label in _FIELD_VALIDATORS:
            if key_pattern.search(key):
                if not val_pattern.match(val):
                    warnings.append({
                        "field":    key,
                        "value":    val,
                        "expected": label,
                        "severity": "warning",
                    })
                break  # only one pattern per field

    if warnings:
        logger.info(f"[Validation] {len(warnings)} field format warnings on extracted data")
    return warnings


# ─────────────────────────────────────────────────────────────────────────────
# 2. Cross-document reconciliation
# ─────────────────────────────────────────────────────────────────────────────

# Fields to compare across documents — (canonical_name, list of key aliases)
_RECONCILE_FIELDS = [
    ("name",    ["name", "full name", "taxpayer name", "account name"]),
    ("pan",     ["pan number", "pan", "pan_number", "permanent account number"]),
    ("dob",     ["date of birth", "dob", "date_of_birth", "birth date"]),
    ("ein",     ["ein", "employer id", "employer identification number"]),
    ("tax_year",["tax year", "tax_year", "taxyear", "year"]),
]


def _find_field(data: dict, aliases: list[str]) -> str | None:
    """Case-insensitive lookup of a field by any of its aliases."""
    for key, val in data.items():
        if any(alias in key.lower() for alias in aliases):
            if val and isinstance(val, str):
                return val.strip().lower()
    return None


def reconcile_user_documents(docs: list[dict]) -> list[dict]:
    """
    Compare key fields across a user's extracted documents.
    Returns mismatches as a list of flags.

    `docs` is a list of {"doc_type": str, "extracted_data": dict} dicts.

    Each flag: {"field": str, "doc_a": str, "value_a": str,
                "doc_b": str, "value_b": str, "severity": "warning"}
    """
    if len(docs) < 2:
        return []

    # Only include docs that have real extracted data (not blank templates)
    real_docs = [
        d for d in docs
        if d.get("extracted_data") and
           d["extracted_data"].get("status") != "blank_template" and
           isinstance(d["extracted_data"], dict)
    ]

    if len(real_docs) < 2:
        return []

    flags = []
    for canonical, aliases in _RECONCILE_FIELDS:
        # Collect (doc_label, value) for all docs that have this field
        present = []
        for d in real_docs:
            val = _find_field(d["extracted_data"], aliases)
            if val:
                present.append((d.get("doc_type", "Unknown"), val))

        if len(present) < 2:
            continue

        # Compare all pairs
        for i in range(len(present)):
            for j in range(i + 1, len(present)):
                label_a, val_a = present[i]
                label_b, val_b = present[j]
                # Normalize: strip spaces/hyphens for ID-style fields
                norm_a = re.sub(r'[\s\-]', '', val_a)
                norm_b = re.sub(r'[\s\-]', '', val_b)
                if norm_a != norm_b:
                    flags.append({
                        "field":    canonical,
                        "doc_a":    label_a,
                        "value_a":  val_a,
                        "doc_b":    label_b,
                        "value_b":  val_b,
                        "severity": "warning",
                        "message":  f"'{canonical}' mismatch: '{val_a}' in {label_a} vs '{val_b}' in {label_b}",
                    })

    if flags:
        logger.info(f"[Reconciliation] {len(flags)} cross-document mismatches found")
    return flags


# ─────────────────────────────────────────────────────────────────────────────
# 3. Admin daily digest
# ─────────────────────────────────────────────────────────────────────────────

def build_daily_digest(db_stats: dict) -> str:
    """
    Generate a plain-English daily digest using the LLM.
    `db_stats` should contain the same structure as get_admin_status() returns.
    Returns a formatted HTML string for display in the admin dashboard.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return _fallback_digest(db_stats)

    today = date.today().strftime("%B %d, %Y")
    stats_text = (
        f"Date: {today}\n"
        f"New users registered today: {db_stats.get('new_users_today', 0)}\n"
        f"Total users: {db_stats.get('total_users', 0)}\n"
        f"Pending personal docs: {db_stats.get('pending_personal', 0)}\n"
        f"Pending business docs: {db_stats.get('pending_business', 0)}\n"
        f"Total pending docs: {db_stats.get('total_pending', 0)}\n"
    )

    recent = db_stats.get("recent_uploads", [])
    if recent:
        stats_text += "\nRecent uploads today:\n"
        for r in recent[:5]:
            stats_text += f"- {r['user_name']} uploaded {r['doc']} ({r['type']}) at {r['uploaded_at']}\n"

    prompt = (
        "You are an accounting firm assistant. Write a brief, friendly, plain-English daily digest "
        "for the admin team based on today's activity data below. "
        "Keep it to 3-4 bullet points. Be specific about numbers. Use a professional but warm tone.\n\n"
        f"TODAY'S ACTIVITY DATA:\n{stats_text}\n\n"
        "Write the digest now. Use bullet points (•). No markdown headers."
    )

    try:
        model = os.getenv("OCR_TEXT_MODEL", "meta-llama/llama-3.3-70b-instruct")
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 300,
            },
            timeout=20,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        # Wrap bullets in styled HTML
        lines = content.split("\n")
        html_lines = []
        for line in lines:
            line = line.strip()
            if line.startswith("•") or line.startswith("-"):
                html_lines.append(f"<li>{line.lstrip('•-').strip()}</li>")
            elif line:
                html_lines.append(f"<p>{line}</p>")
        return f"<ul style='margin:0;padding-left:18px'>{''.join(html_lines)}</ul>"
    except Exception as e:
        logger.error(f"[DailyDigest] LLM call failed: {e}")
        return _fallback_digest(db_stats)


def _fallback_digest(stats: dict) -> str:
    today = date.today().strftime("%B %d, %Y")
    total = stats.get("total_pending", 0)
    new_u = stats.get("new_users_today", 0)
    lines = [
        f"<li>Today is {today}.</li>",
        f"<li>{new_u} new user(s) registered today.</li>",
        f"<li>{total} document(s) currently awaiting review.</li>",
    ]
    pp = stats.get("pending_personal", 0)
    pb = stats.get("pending_business", 0)
    if pp or pb:
        lines.append(f"<li>{pp} personal and {pb} business documents are pending.</li>")
    return f"<ul style='margin:0;padding-left:18px'>{''.join(lines)}</ul>"
