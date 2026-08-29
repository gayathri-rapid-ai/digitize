# Digitize

Run the complete application (PostgreSQL, admin/customer APIs, migrations, public UI, admin UI, and HAProxy)
from this directory.

```sh
cp .env.example .env
# Set JWT_SECRET and POSTGRES_PASSWORD in .env
./scripts/deploy.sh
```

HAProxy is the only public service: the customer storefront is available at
`http://localhost:3000`, the admin UI's authenticated pages start at
`/business`, the admin API Swagger is at `/api`, and the customer API is under
`/storefront`. Public products are readable without an account; customer
registration/login is required before the storefront can submit an order.
Change `APP_PORT` in `.env` if the port is in use.
Stop the stack with `docker compose down`; the PostgreSQL volume is preserved.
