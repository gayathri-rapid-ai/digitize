CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS collections (LIKE products INCLUDING ALL);
CREATE TABLE IF NOT EXISTS inventory_items (LIKE products INCLUDING ALL);
CREATE TABLE IF NOT EXISTS customers (LIKE products INCLUDING ALL);
CREATE TABLE IF NOT EXISTS orders (LIKE products INCLUDING ALL);
CREATE TABLE IF NOT EXISTS discounts (LIKE products INCLUDING ALL);

CREATE INDEX IF NOT EXISTS products_tenant_id_idx ON products (tenant_id);
CREATE INDEX IF NOT EXISTS collections_tenant_id_idx ON collections (tenant_id);
CREATE INDEX IF NOT EXISTS inventory_items_tenant_id_idx ON inventory_items (tenant_id);
CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS orders_tenant_id_idx ON orders (tenant_id);
CREATE INDEX IF NOT EXISTS discounts_tenant_id_idx ON discounts (tenant_id);
