FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps: Tesseract OCR (Stage 2 of extraction pipeline — CPU-only, no GPU)
# eng: English, hin: Hindi — for bilingual Indian documents (Aadhaar, PAN, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (plain UTF-8 requirements.txt)
COPY services/api/requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip && pip install -r /tmp/requirements.txt

# Copy app source
COPY . /app

WORKDIR /app/services/api

EXPOSE 8000

# --forwarded-allow-ips=* trusts X-Forwarded-For from nginx container
# Required so rate limiter and audit logs see real client IPs (not nginx's internal IP)
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4", \
     "--proxy-headers", \
     "--forwarded-allow-ips=*"]
