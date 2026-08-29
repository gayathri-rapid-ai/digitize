# Digitize authorization foundation

Tenant-aware NestJS authentication and authorization primitives.

## Use on a tenant route

```ts
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.ADMIN)
@TenantScoped()
@Get('tenants/:tenantId/documents')
listDocuments() {}
```

The access token is bound to one tenant (`tenantId` claim). `JwtStrategy` resolves
that tenant membership on every request, so a disabled membership or changed role
takes effect before the handler runs. `TenantGuard` then rejects a tenant id from
the request that differs from the authenticated membership.

Set `JWT_SECRET` before deploying; the fallback is intended only for local development.

Swagger UI is available at `http://localhost:3000/api` when the application is running.
Use the **Authorize** button to supply a Bearer JWT.

## Authentication

For API testing, create an owner and first store with `POST /auth/register`, then
use its returned `accessToken` in Swagger's **Authorize** dialog. Existing users
sign in through `POST /auth/login` with their username (or email) and password.
Login does not accept a tenant ID; it uses the user's default active tenant.

Google SSO begins at `GET /auth/google`. Set `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` from a Google Cloud OAuth client;
add the callback URL to its authorized redirect URIs. A first-time Google user gets
an owner account and a store automatically. Apigee can proxy and rate-limit these
APIs, but NestJS remains the token issuer and OAuth callback handler.

## Admin console API

All admin routes are under `/api/business/:bid` and require a Bearer JWT
issued for that business. Create/list stores through `/api/business/:bid/stores`.
Store operations are under `/api/business/:bid/stores/:storeId`; the store is
verified as belonging to that business before any query runs. The API includes:

- `dashboard`, `analytics`, and `store` settings
- `members` (OWNER only)
- `products`, `collections`, and `inventory`
- `customers` and `orders`
- `discounts`

`STAFF` can view operational data and update orders; `ADMIN` can manage catalog,
inventory, customers, discounts, and store settings; `OWNER` additionally manages
staff memberships. Every request is checked against the JWT tenant before the
controller runs.

## PostgreSQL

The app uses hand-written models and parameterized `pg` queries—no ORM. Set
`DATABASE_URL` (for an external database), or set the `POSTGRES_*` variables in
the root `.env` file for the local Docker database. Create the schema before
starting the service:

```sh
npm run db:migrate
```

The migration creates tenant, user, membership, store-settings, catalog, inventory,
customer, order, and discount tables. All admin queries include `tenant_id`, so data
from one store is never selected or changed through another store's API path.

For local API development, start PostgreSQL and apply the migrations first, then
run Nest in a separate terminal:

```sh
npm run db:up
npm start:dev
```

## Full-stack Docker deployment

Docker configuration is maintained at the repository root so the API and admin
UI run as one project. From the repository root, copy `.env.example` to `.env`,
set a long random `JWT_SECRET` and a strong `POSTGRES_PASSWORD`, then run:

```sh
./scripts/deploy.sh
```

The deployment creates a persistent PostgreSQL volume, waits for database health,
applies the DDL migration, then starts HAProxy, the API, and admin UI. HAProxy
serves both the admin UI and Swagger at `http://localhost:3000` and
`http://localhost:3000/api` respectively (or the configured `APP_PORT`). Stop
the stack with `docker compose down`; the database volume is preserved.

```sh
npm install
npm test
```
