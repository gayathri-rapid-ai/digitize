#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to deploy this application." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Set JWT_SECRET and POSTGRES_PASSWORD, then run this script again." >&2
  exit 1
fi

if grep -q '^JWT_SECRET=replace-with-a-long-random-secret$' .env || ! grep -q '^JWT_SECRET=.' .env; then
  echo "Set a strong JWT_SECRET in .env before deployment." >&2
  exit 1
fi

if grep -q '^POSTGRES_PASSWORD=replace-with-a-strong-database-password$' .env || ! grep -q '^POSTGRES_PASSWORD=.' .env; then
  echo "Set POSTGRES_PASSWORD in .env before deployment." >&2
  exit 1
fi

docker compose up --build -d
docker compose ps
echo "Deployment complete. Swagger UI: http://localhost:${APP_PORT:-3000}/api"
