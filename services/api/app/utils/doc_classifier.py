"""
Document type classifier for the "other_*" catch-all upload bucket.

When a user uploads via the "Additional Documents" slot, doc_type is set to
`other_<timestamp>_<index>` ? a meaningless slug. This module detects the
actual document type from OCR text + filename so the extraction prompt
becomes type-specific rather than generic.

Only used for `other_*` uploads. Required-slot uploads already carry the
real template name (e.g. "Individual Tax Organizer 2025") from the DB.
"""
from __future__ import annotations

import re
import logging
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class DocCategory(str, Enum):
    PAN_CARD          = "PAN Card"
    AADHAAR           = "Aadhaar Card"
    W2                = "W-2 Wage Statement"
    FORM_1099         = "1099 Income Form"
    FORM_1040         = "Form 1040 (U.S. Individual Income Tax Return)"
    FORM_1120         = "Form 1120/1120-S (U.S. Corporation Tax Return)"
    FORM_1065         = "Form 1065 (U.S. Partnership Tax Return)"
    SCHEDULE_K1       = "Schedule K-1"
    FORM_W9           = "Form W-9 (TIN Request)"
    EIN_LETTER        = "IRS EIN Assignment Letter"
    ENGAGEMENT_LETTER = "Engagement Letter"
    TAX_ORGANIZER     = "Tax Organizer"
    INVOICE           = "Invoice / Bill"
    BANK_STATEMENT    = "Bank Statement"
    PASSPORT          = "Passport"
    DRIVING_LICENSE   = "Driving License"
    GENERIC           = "Other Document"


# Priority-ordered keyword patterns ? first match wins
_PATTERNS: list[tuple[re.Pattern, DocCategory]] = [
    # Government IDs
    (re.compile(r'\bPERMANENT\s+ACCOUNT\s+NUMBER\b|\bINCOME\s+TAX\s+DEPT\b', re.I),  DocCategory.PAN_CARD),
    (re.compile(r'\bAADHAAR\b|\bUIDPAI\b|\bUIDAI\b|\bENROLMENT\s+NO\b', re.I),        DocCategory.AADHAAR),
    (re.compile(r'\bPASSPORT\b|\bREPUBLIC\s+OF\b.*\bPASSPORT\b', re.I),               DocCategory.PASSPORT),
    (re.compile(r'\bDRIVING\s+(LICENCE|LICENSE)\b|\bDL\s+NO\b|\bMOTOR\s+VEHICLE\b', re.I), DocCategory.DRIVING_LICENSE),
    # US Tax forms
    (re.compile(r'\bW-?2\b.*\bWAGES\b|\bWAGES.*TIPS.*OTHER\b|\bFEDERAL\s+INCOME\s+TAX\s+WITHHELD\b', re.I), DocCategory.W2),
    (re.compile(r'\b1099-?[A-Z]{0,4}\b|\bNONEMPLOYEE\s+COMPENSATION\b|\bMISCELLANEOUS\s+INCOME\b', re.I),   DocCategory.FORM_1099),
    (re.compile(r'\bFORM\s+1040\b|\b1040-?SR\b|\bU\.S\.\s+INDIVIDUAL\s+INCOME\s+TAX\s+RETURN\b', re.I),    DocCategory.FORM_1040),
    (re.compile(r'\bFORM\s+1120\b|\b1120-?S\b|\bU\.S\.\s+(CORPORATION|INCOME\s+TAX\s+RETURN\s+FOR\s+AN\s+S\s+CORPORATION)\b', re.I), DocCategory.FORM_1120),
    (re.compile(r'\bSCHEDULE\s+K-?1\b|\bPARTNER[\'?]S\s+SHARE\s+OF\s+INCOME\b', re.I),                     DocCategory.SCHEDULE_K1),
    (re.compile(r'\bFORM\s+1065\b|\bU\.S\.\s+RETURN\s+OF\s+PARTNERSHIP\s+INCOME\b', re.I),                 DocCategory.FORM_1065),
    (re.compile(r'\bFORM\s+W-?9\b|\bREQUEST\s+FOR\s+TAXPAYER\s+IDENTIFICATION\b', re.I),                   DocCategory.FORM_W9),
    (re.compile(r'\bCP\s*575\b|\bASSIGNED\s+EMPLOYER\s+IDENTIFICATION\s+NUMBER\b|\bFORM\s+SS-?4\b', re.I), DocCategory.EIN_LETTER),
    # Accounting documents
    (re.compile(r'\bENGAGEMENT\s+LETTER\b|\bTAX\s+RETURN\s+PREPARATION\s+SERVICES\b', re.I), DocCategory.ENGAGEMENT_LETTER),
    (re.compile(r'\bTAX\s+ORGANIZER\b|\bLLC\s+TAX\b|\bS[-\s]?CORP\b|\bPARTNERSHIP\s+TAX\b', re.I), DocCategory.TAX_ORGANIZER),
    (re.compile(r'\bINVOICE\b|\bINV\s*(NO|#|:)\b|\bGST\s+INVOICE\b|\bTAX\s+INVOICE\b', re.I), DocCategory.INVOICE),
    (re.compile(r'\bACCOUNT\s+STATEMENT\b|\bSTATEMENT\s+OF\s+ACCOUNT\b|\bOPENING\s+BALANCE\b|\bCLOSING\s+BALANCE\b', re.I), DocCategory.BANK_STATEMENT),
]


def classify_other_doc(
    ocr_text: str,
    filename: str = "",
) -> DocCategory:
    """
    Detect the actual document type from OCR text and filename.
    Returns DocCategory.GENERIC if nothing matches.

    Args:
        ocr_text: Raw text extracted from the document (any amount).
        filename: Original upload filename ? used as a secondary hint.
    """
    corpus = f"{filename} {ocr_text}"

    for pattern, category in _PATTERNS:
        if pattern.search(corpus):
            logger.info(f"[DocClassifier] Detected '{category.value}' from other_* upload")
            return category

    logger.info("[DocClassifier] No match ? defaulting to GENERIC")
    return DocCategory.GENERIC


def get_doc_type_for_prompt(original_doc_type: str, ocr_text: str, filename: str = "") -> str:
    """
    Returns the best doc_type string to use in the extraction prompt.

    For required-slot uploads (doc_type = real template name from DB),
    returns as-is. For other_* uploads, runs the classifier and returns
    the detected category's human-readable label.
    """
    if not original_doc_type.startswith("other_"):
        return original_doc_type

    category = classify_other_doc(ocr_text=ocr_text, filename=filename)
    return category.value
