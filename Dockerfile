FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install Tesseract OCR + English + Hindi language data (Stage 2 of extraction pipeline)
# tesseract-ocr: ~50MB — CPU-only, no GPU needed
# tesseract-ocr-hin: Hindi language pack for bilingual Indian documents (Aadhaar, PAN, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY services/api/requirements.txt /tmp/requirements.txt
RUN python - <<'PY'
from pathlib import Path

src = Path('/tmp/requirements.txt')
text = src.read_text(encoding='utf-16')
Path('/tmp/requirements-utf8.txt').write_text(text, encoding='utf-8')
PY

RUN pip install --upgrade pip && pip install -r /tmp/requirements-utf8.txt

COPY . /app

WORKDIR /app/services/api

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers"]