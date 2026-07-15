FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

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