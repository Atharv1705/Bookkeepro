import os
import json
import logging
import requests
import base64
from io import BytesIO
from pypdf import PdfReader
from PIL import Image
import fitz  # PyMuPDF — PDF rendering for scanned docs

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline thresholds
# ─────────────────────────────────────────────────────────────────────────────
MIN_TEXT_CHARS = 50    # Stage 1: native text must have at least this many chars
MIN_TESS_WORDS = 30    # Stage 2: Tesseract must return at least this many words
RENDER_DPI     = 2.5   # PyMuPDF render scale (2.5x ≈ 212 DPI)

# ─────────────────────────────────────────────────────────────────────────────
# Models — configurable via .env, hardcoded values are defaults
# ─────────────────────────────────────────────────────────────────────────────
MODEL_TEXT     = os.getenv("OCR_TEXT_MODEL",     "meta-llama/llama-3.3-70b-instruct")
MODEL_VISION   = os.getenv("OCR_VISION_MODEL",   "qwen/qwen2.5-vl-72b-instruct")
MODEL_FALLBACK = os.getenv("OCR_FALLBACK_MODEL", "google/gemma-3-27b-it")

# ─────────────────────────────────────────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are a highly accurate document data extraction AI. "
    "Extract only what is explicitly present in the document — never invent, guess, or add placeholder fields. "
    "Respond with a raw JSON object only. No markdown, no explanation, no extra keys."
)

BLANK_FORM_PROMPT = (
    "This appears to be an unfilled form or template. "
    "Return a JSON object with these keys only: "
    "form_type (name of the form), "
    "tax_year (year if visible, else null), "
    "purpose (one sentence describing what this form is for), "
    "status (always set to 'blank_template'). "
    "Return ONLY valid JSON, no markdown."
)

# ─────────────────────────────────────────────────────────────────────────────
# Confidence tier definitions (Item 1)
# ─────────────────────────────────────────────────────────────────────────────
_CONFIDENCE_TIERS = {
    1: {
        "stage":      1,
        "tier":       "high",
        "label":      "Native PDF text",
        "description": "Extracted directly from the PDF text layer — highly reliable.",
        "color":      "green",
    },
    2: {
        "stage":      2,
        "tier":       "medium",
        "label":      "OCR (Tesseract)",
        "description": "Read from a scanned/image page via local OCR — review key numbers.",
        "color":      "yellow",
    },
    3: {
        "stage":      3,
        "tier":       "low",
        "label":      "Vision model",
        "description": "Read from image by AI vision model — verify carefully.",
        "color":      "orange",
    },
}

def _add_confidence(result: dict | None, stage: int, word_count: int = 0) -> dict | None:
    """
    Attach a _meta block to an extraction result indicating which pipeline
    stage produced it and how reliable the output is likely to be.
    Returns None unchanged so callers can still check `if result is None`.
    """
    if result is None:
        return None
    meta = dict(_CONFIDENCE_TIERS.get(stage, {"stage": stage, "tier": "unknown",
                                               "label": "Unknown", "color": "gray"}))
    if stage == 2 and word_count:
        meta["label"] = f"OCR ({word_count} words)"
        meta["description"] = (
            f"Tesseract OCR found {word_count} words. "
            + ("Reasonable confidence." if word_count >= 60 else "Low word count — check key fields manually.")
        )
    result["_meta"] = meta
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def image_to_base64(pil_image: Image.Image, max_size: int = 2048) -> str:
    """Encode a PIL image to a base64 data URI, downscaling if needed."""
    w, h = pil_image.size
    if w > max_size or h > max_size:
        scale = max_size / max(w, h)
        pil_image = pil_image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        logger.debug(f"[Vision] Resized {w}x{h} → {pil_image.size}")

    if pil_image.mode != "RGB":
        pil_image = pil_image.convert("RGB")

    buf = BytesIO()
    pil_image.save(buf, format="JPEG", quality=92)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _render_pdf_page(file_path: str, scale: float = RENDER_DPI) -> Image.Image | None:
    """Render the first page of a PDF to a PIL Image using PyMuPDF."""
    try:
        pdf_doc = fitz.open(file_path)
        pix = pdf_doc[0].get_pixmap(
            matrix=fitz.Matrix(scale, scale),
            colorspace=fitz.csRGB
        )
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        pdf_doc.close()
        return img
    except Exception as e:
        logger.error(f"[PyMuPDF] Render failed for {file_path}: {e}")
        return None


def _tesseract_text(pil_image: Image.Image) -> str:
    """
    Run Tesseract OCR on a PIL image.
    Uses eng+hin for bilingual Indian documents (Aadhaar, PAN, tax forms).
    Falls back to eng-only if Hindi data not installed.
    Auto-detects binary on Windows vs Linux/Docker.
    """
    try:
        import pytesseract
        import platform

        if platform.system() == "Windows":
            win_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Users\abhil\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
            ]
            for p in win_paths:
                if os.path.isfile(p):
                    pytesseract.pytesseract.tesseract_cmd = p
                    break

        config = "--psm 6 --oem 3"
        # Tesseract language pack — configurable via TESSERACT_LANG env var
        # Default: eng+hin for bilingual Indian documents
        tess_lang = os.getenv("TESSERACT_LANG", "eng+hin")
        try:
            text = pytesseract.image_to_string(pil_image, lang=tess_lang, config=config).strip()
            logger.debug(f"[Tesseract] {tess_lang} produced {len(text.split())} words")
        except Exception:
            logger.debug(f"[Tesseract] {tess_lang} unavailable, using eng only")
            text = pytesseract.image_to_string(pil_image, lang="eng", config=config).strip()

        return text

    except ImportError:
        logger.warning("[Tesseract] pytesseract not installed — skipping Stage 2")
        return ""
    except Exception as e:
        logger.warning(f"[Tesseract] OCR failed: {e}")
        return ""


def _call_openrouter(
    api_key: str,
    model: str,
    user_content: list,
    original_text: str = "",
) -> dict | None:
    """
    POST to OpenRouter and return parsed JSON dict, or None on failure.

    Fallback chain (Item 4):
      1. Try requested model.
      2. If that fails AND it isn't already the fallback model, retry with MODEL_FALLBACK.

    Blank template handling:
      If the model returns {} (unfilled form), retries with a metadata prompt
      so the admin always sees form_type / purpose / tax_year instead of nothing.
    """
    def _post(m: str, content: list) -> dict | None:
        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": m,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user",   "content": content},
                    ],
                    "response_format": {"type": "json_object"},
                },
                timeout=60,
            )
            response.raise_for_status()
            raw = response.json()["choices"][0]["message"]["content"].strip()
            for fence in ("```json", "```"):
                if raw.startswith(fence):
                    raw = raw[len(fence):]
            if raw.endswith("```"):
                raw = raw[:-3]
            return json.loads(raw.strip())
        except Exception as e:
            logger.error(f"[OpenRouter] {m} call failed: {e}")
            return None

    # Primary attempt
    result = _post(model, user_content)

    # Fallback to secondary model if primary failed (Item 4)
    if result is None and model != MODEL_FALLBACK:
        logger.warning(f"[AI] {model} failed — retrying with fallback {MODEL_FALLBACK}")
        result = _post(MODEL_FALLBACK, user_content)

    # Blank template fallback — retry with metadata prompt if result is {}
    if result == {} and original_text:
        logger.info("[AI] Empty result — retrying with blank-form metadata prompt")
        fallback_content = [{
            "type": "text",
            "text": f"{BLANK_FORM_PROMPT}\n\nDocument text:\n{original_text[:3000]}"
        }]
        result = _post(model, fallback_content) or {}

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Main extraction entry point
# ─────────────────────────────────────────────────────────────────────────────

def _build_user_prompt(doc_type: str) -> str:
    return (
        f"Document type hint: {doc_type}\n\n"
        "You are a precise data extraction AI. Read this document and extract its key information.\n\n"
        "STRICT RULES:\n"
        "1. Use field names exactly as they appear in the document "
        "(e.g. 'PAN Number', 'Date of Birth', 'Employer Name', 'Tax Year').\n"
        "2. For LEGAL DOCUMENTS, LETTERS, or CONTRACTS: extract key terms — "
        "services included, responsibilities, fees, tax forms mentioned, deadlines, party names.\n"
        "3. Extract ONLY fields that have actual content — do NOT add null or empty fields.\n"
        "4. Dates: format as DD/MM/YYYY. A run-together date like '27082022' → '27/08/2022'.\n"
        "5. For list fields (services, items, fees) use JSON arrays.\n"
        "6. Ignore bilingual label noise (Hindi/Devanagari text) — extract English values only.\n"
        "7. If the document is truly a blank unfilled form with zero data, return {}.\n"
        "8. Return ONLY a valid JSON object — no markdown, no explanation."
    )


def extract_document_data(file_path: str, doc_type: str) -> dict | None:
    """
    3-stage extraction pipeline with confidence scoring.

    Stage 1 — Native text (FREE)
      pypdf + PyMuPDF pull embedded text from PDF.
      >= MIN_TEXT_CHARS → MODEL_TEXT.
      If MODEL_TEXT fails, falls through to Stage 2 (Item 2 fix — was silent None before).

    Stage 2 — Tesseract OCR (FREE, local CPU)
      PyMuPDF renders page at 2.5x DPI.
      Tesseract reads with eng+hin for bilingual docs.
      >= MIN_TESS_WORDS → MODEL_TEXT.
      If MODEL_TEXT fails, falls through to Stage 3.

    Stage 3 — Vision model (paid, minimal cost)
      Sends rendered page image to MODEL_VISION via OpenRouter.

    Confidence scoring (Item 1):
      Every successful result gets a _meta block:
        {"stage": 1|2|3, "tier": "high"|"medium"|"low",
         "label": "...", "description": "...", "color": "..."}

    Model fallback (Item 4):
      Each _call_openrouter call tries MODEL_TEXT/MODEL_VISION first,
      then MODEL_FALLBACK if the primary fails.

    Blank template fallback:
      If any stage returns {}, a second call extracts
      form_type / purpose / tax_year / status metadata.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("[AI] OPENROUTER_API_KEY not set — skipping extraction")
        return None

    is_pdf   = file_path.lower().endswith(".pdf")
    is_image = file_path.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))

    if not (is_pdf or is_image):
        logger.info(f"[AI] Unsupported file type, skipping: {file_path}")
        return None

    # Item 5: For other_* uploads, detect actual doc type from text content
    # Required-slot uploads already carry the real template name — skip classifier for those
    effective_doc_type = doc_type
    # Classifier runs after text is available (done inline below per stage)

    user_prompt = _build_user_prompt(effective_doc_type)

    try:
        # ── PDF ───────────────────────────────────────────────────────────────
        if is_pdf:

            # Stage 1: native text
            text = ""
            try:
                reader = PdfReader(file_path)
                for page in reader.pages[:3]:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
            except Exception as e:
                logger.warning(f"[Stage1] pypdf failed: {e}")

            # PyMuPDF sometimes recovers text pypdf misses
            if len(text.strip()) < MIN_TEXT_CHARS:
                try:
                    doc = fitz.open(file_path)
                    mu = "".join(doc[i].get_text() for i in range(min(3, len(doc))))
                    doc.close()
                    if len(mu.strip()) > len(text.strip()):
                        text = mu
                except Exception as e:
                    logger.warning(f"[Stage1] PyMuPDF text failed: {e}")

            if len(text.strip()) >= MIN_TEXT_CHARS:
                # Item 5: classify other_* using actual extracted text
                if doc_type.startswith("other_"):
                    from app.utils.doc_classifier import get_doc_type_for_prompt
                    effective_doc_type = get_doc_type_for_prompt(
                        doc_type, text.strip(), os.path.basename(file_path)
                    )
                    user_prompt = _build_user_prompt(effective_doc_type)
                logger.info(f"[Stage1] Text PDF ({len(text.strip())} chars) → {MODEL_TEXT} [{effective_doc_type}]")
                content = [{"type": "text", "text": f"{user_prompt}\n\nDocument text:\n{text.strip()}"}]
                result = _call_openrouter(api_key, MODEL_TEXT, content, original_text=text.strip())
                if result is not None:
                    return _add_confidence(result, stage=1)  # ← Item 1: confidence
                # Item 2 fix: Stage 1 failure now falls through to Stage 2/3
                logger.warning("[Stage1] Text model failed — falling through to Stage 2")

            # Stage 2 & 3 need rendered image
            rendered = _render_pdf_page(file_path)
            if rendered is None:
                return None

            # Stage 2: Tesseract
            tess_text  = _tesseract_text(rendered)
            word_count = len(tess_text.split())

            if word_count >= MIN_TESS_WORDS:
                # Item 5: classify other_* using Tesseract text if Stage 1 text was too short
                if doc_type.startswith("other_"):
                    from app.utils.doc_classifier import get_doc_type_for_prompt
                    effective_doc_type = get_doc_type_for_prompt(
                        doc_type, tess_text, os.path.basename(file_path)
                    )
                    user_prompt = _build_user_prompt(effective_doc_type)
                logger.info(f"[Stage2] Tesseract {word_count} words → {MODEL_TEXT} (free) [{effective_doc_type}]")
                content = [{"type": "text", "text": f"{user_prompt}\n\nDocument text (OCR):\n{tess_text}"}]
                result = _call_openrouter(api_key, MODEL_TEXT, content, original_text=tess_text)
                if result is not None:
                    return _add_confidence(result, stage=2, word_count=word_count)  # ← Item 1
                logger.warning("[Stage2] Text model failed — falling through to Stage 3")
            else:
                logger.info(f"[Stage2] Tesseract only {word_count} words (threshold {MIN_TESS_WORDS}) → Stage 3")

            # Stage 3: vision model
            logger.info(f"[Stage3] Vision model: {MODEL_VISION}")
            content = [
                {"type": "text",      "text": user_prompt},
                {"type": "image_url", "image_url": {"url": image_to_base64(rendered)}},
            ]
            result = _call_openrouter(api_key, MODEL_VISION, content)
            return _add_confidence(result, stage=3)  # ← Item 1 (None stays None)

        # ── Image ─────────────────────────────────────────────────────────────
        elif is_image:
            img = Image.open(file_path)

            tess_text  = _tesseract_text(img)
            word_count = len(tess_text.split())

            if word_count >= MIN_TESS_WORDS:
                # Item 5: classify other_* from Tesseract text on image files
                if doc_type.startswith("other_"):
                    from app.utils.doc_classifier import get_doc_type_for_prompt
                    effective_doc_type = get_doc_type_for_prompt(
                        doc_type, tess_text, os.path.basename(file_path)
                    )
                    user_prompt = _build_user_prompt(effective_doc_type)
                logger.info(f"[Stage2-img] Tesseract {word_count} words → {MODEL_TEXT} (free) [{effective_doc_type}]")
                content = [{"type": "text", "text": f"{user_prompt}\n\nDocument text (OCR):\n{tess_text}"}]
                result = _call_openrouter(api_key, MODEL_TEXT, content, original_text=tess_text)
                if result is not None:
                    return _add_confidence(result, stage=2, word_count=word_count)  # ← Item 1
                logger.warning("[Stage2-img] Text model failed — Stage 3")
            else:
                logger.info(f"[Stage2-img] Tesseract only {word_count} words → Stage 3")

            logger.info(f"[Stage3-img] Vision model: {MODEL_VISION}")
            content = [
                {"type": "text",      "text": user_prompt},
                {"type": "image_url", "image_url": {"url": image_to_base64(img)}},
            ]
            result = _call_openrouter(api_key, MODEL_VISION, content)
            return _add_confidence(result, stage=3)  # ← Item 1

    except Exception as e:
        logger.error(f"[AI] Extraction pipeline failed for {file_path}: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Admin document summarizer
# ─────────────────────────────────────────────────────────────────────────────

_SUMMARY_SYSTEM_PROMPT = (
    "You are a professional CPA's assistant. "
    "Your job is to write a short, plain-English summary of a tax or financial document "
    "that will be shown to the client on their secure online portal. "
    "Be professional, friendly, and concise. "
    "Never include sensitive numbers or personally identifiable information in the summary. "
    "Respond with ONLY the summary text — no headers, no bullet points, no markdown."
)


def _extract_text_from_file(file_path: str) -> str:
    """Extract raw text from a PDF or image file. Returns empty string on failure."""
    try:
        if file_path.lower().endswith(".pdf"):
            text = ""
            try:
                reader = PdfReader(file_path)
                for page in reader.pages[:5]:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
            except Exception:
                pass

            if len(text.strip()) < MIN_TEXT_CHARS:
                try:
                    doc = fitz.open(file_path)
                    mu = "".join(doc[i].get_text() for i in range(min(5, len(doc))))
                    doc.close()
                    if len(mu.strip()) > len(text.strip()):
                        text = mu
                except Exception:
                    pass

            if len(text.strip()) < MIN_TEXT_CHARS:
                rendered = _render_pdf_page(file_path)
                if rendered:
                    text = _tesseract_text(rendered)

            return text.strip()

        elif file_path.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            img = Image.open(file_path)
            return _tesseract_text(img).strip()

    except Exception as e:
        logger.warning(f"[Summary] Text extraction failed for {file_path}: {e}")

    return ""


def summarize_admin_document(file_path: str, doc_label: str) -> str | None:
    """
    Generate a 2-3 sentence plain-English summary of an admin-uploaded document.

    Reuses the existing text extraction pipeline (native PDF text → Tesseract OCR).
    Calls the LLM with a client-facing summary prompt instead of a JSON extraction prompt.

    Returns:
        str  — summary text if successful
        None — if OPENROUTER_API_KEY not set, file unreadable, or LLM call fails
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("[Summary] OPENROUTER_API_KEY not set — skipping summary")
        return None

    text = _extract_text_from_file(file_path)

    if not text:
        logger.info(f"[Summary] No extractable text from {file_path} — skipping")
        return "Summary not available for this document type."

    prompt = (
        f"Document name: {doc_label}\n\n"
        f"Document content (first 4000 characters):\n{text[:4000]}\n\n"
        "Write a 2-3 sentence plain-English summary of this document for the client. "
        "Explain what it is and what they should know about it. "
        "Do NOT include any specific dollar amounts, SSNs, EINs, or other sensitive numbers."
    )

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL_TEXT,
                "messages": [
                    {"role": "system", "content": _SUMMARY_SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
            },
            timeout=60,
        )
        response.raise_for_status()
        summary = response.json()["choices"][0]["message"]["content"].strip()
        logger.info(f"[Summary] Generated {len(summary)} char summary for {doc_label}")
        return summary
    except Exception as e:
        logger.error(f"[Summary] LLM call failed for {doc_label}: {e}")
        return None

