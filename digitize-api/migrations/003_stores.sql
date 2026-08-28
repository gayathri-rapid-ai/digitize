CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

-- Give every existing tenant a default store before enforcing store ownership.
INSERT INTO stores (id, tenant_id, name, slug)
SELECT md5(id::text || ':default-store')::uuid, id, name, 'default'
FROM tenants
ON CONFLICT (tenant_id, slug) DO NOTHING;

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

UPDATE store_settings r SET store_id = s.id FROM stores s WHERE s.tenant_id = r.tenant_id AND s.slug = 'default' AND r.store_id IS NULL;
UPDATE products r SET store_id = s.id FROM stores s WHERE s.tenant_id = r.tenant_id AND s.slug = 'default' AND r.store_id IS NULL;
UPDATE collections r SET store_id = s.id FROM stores s WHERE s.tenant_id = r.tenant_id AND s.slug = 'default' AND r.store_id IS NULL;
UPDATE inventory_items r SET store_id = s.id FROM stores s WHERE s.tenant_id = r.tenant_id AND s.slug = 'default' AND r.store_id IS NULL;
UPDATE customers r SET store_id = s.id FROM stores s WHERE s.tenant_id = r.tenant_id AND s.slug = 'default' AND r.store_id IS NULL;
UPDATE orders r SET store_id = s.id FROM stores s WHERE s.tenant_id = r.tenant_id AND s.slug = 'default' AND r.store_id IS NULL;
UPDATE discounts r SET store_id = s.id FROM stores s WHERE s.tenant_id = r.tenant_id AND s.slug = 'default' AND r.store_id IS NULL;

ALTER TABLE store_settings DROP CONSTRAINT IF EXISTS store_settings_tenant_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS store_settings_store_id_unique ON store_settings (store_id);

CREATE INDEX IF NOT EXISTS products_store_id_idx ON products (store_id);
CREATE INDEX IF NOT EXISTS collections_store_id_idx ON collections (store_id);
CREATE INDEX IF NOT EXISTS inventory_items_store_id_idx ON inventory_items (store_id);
CREATE INDEX IF NOT EXISTS customers_store_id_idx ON customers (store_id);
CREATE INDEX IF NOT EXISTS orders_store_id_idx ON orders (store_id);
CREATE INDEX IF NOT EXISTS discounts_store_id_idx ON discounts (store_id);
