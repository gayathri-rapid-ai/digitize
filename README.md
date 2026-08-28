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

## Admin console API

All admin routes are under `/admin/tenants/:tenantId` and require a Bearer JWT
issued for that same tenant. The API includes:

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
`DATABASE_URL`, then create the schema before starting the service:

```sh
npm run db:migrate
```

The migration creates tenant, user, membership, store-settings, catalog, inventory,
customer, order, and discount tables. All admin queries include `tenant_id`, so data
from one store is never selected or changed through another store's API path.

## Docker deployment

Copy `.env.example` to `.env`, set a long random `JWT_SECRET` and a strong
`POSTGRES_PASSWORD`, then run:

```sh
./scripts/deploy.sh
```

The deployment creates a persistent PostgreSQL volume, waits for database health,
applies the DDL migration, then starts the API. Swagger is available at
`http://localhost:3000/api` (or the configured `APP_PORT`). Stop the stack with
`docker compose down`; the database volume is preserved.

```sh
npm install
npm test
```
