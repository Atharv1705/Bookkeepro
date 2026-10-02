# Makefile -- Production deploy helpers for BookKeepro
# Usage on the server: make deploy

.PHONY: deploy build-frontend up down logs restart

## Full deploy: pull, build frontend, rebuild Docker images, restart stack
deploy: build-frontend
	docker compose down --remove-orphans
	docker compose build --no-cache app
	docker compose up -d
	@echo "[deploy] Done. Check logs with: make logs"

## Build the React frontend into frontend/dist (required before nginx starts)
## frontend/dist is intentionally NOT in git -- always build on the server.
build-frontend:
	@echo "[build] Installing frontend dependencies..."
	cd frontend && npm ci --prefer-offline
	@echo "[build] Building production bundle..."
	cd frontend && npm run build
	@echo "[build] frontend/dist is ready."

## Start the stack (assumes frontend/dist already built)
up:
	docker compose up -d

## Stop the stack
down:
	docker compose down

## Tail logs for all services
logs:
	docker compose logs -f --tail=100

## Restart only the app container (e.g. after config change)
restart:
	docker compose restart app

## Run DB migrations manually inside the running container
migrate:
	docker compose exec app python migrate.py
