# Contabo Docker Deployment

This project runs as a single FastAPI container that also serves the frontend files from `frontend/`.

## Files used for deployment

- `Dockerfile` builds the API image.
- `docker-compose.yml` runs the API, MySQL, and Nginx proxy.
- `.dockerignore` keeps the image build context small.
- `.env.docker.example` shows the runtime variables needed on Contabo.
- `nginx/default.conf` proxies public traffic to the app container.

## Deployment flow

1. Copy `.env.docker.example` to `.env` and fill in your real values.
2. Point `FRONTEND_URL` to your domain once it is live.
3. Run `docker compose up -d --build` on the Contabo VPS.
4. Open port 80 in the Contabo firewall and VPS firewall.

## Notes

- The database runs in a separate MySQL container by default.
- Uploaded files are stored in a named Docker volume.
- If you want HTTPS, add TLS termination to Nginx or put a separate certbot setup in front of it.