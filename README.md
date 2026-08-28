# Digitize

Run the complete application (PostgreSQL, API, migrations, admin UI, and HAProxy)
from this directory.

```sh
cp .env.example .env
# Set JWT_SECRET and POSTGRES_PASSWORD in .env
./scripts/deploy.sh
```

HAProxy is the only public service: the admin UI is available at
`http://localhost:3000` and Swagger at `http://localhost:3000/api` by default.
It routes `/auth`, `/admin`, and `/api` to the API, and all other paths to the
admin UI. Change `APP_PORT` in `.env` if the port is in use. This lets an AWS
load balancer target one service without exposing the internal API or UI ports.
Stop the stack with `docker compose down`; the PostgreSQL volume is preserved.
