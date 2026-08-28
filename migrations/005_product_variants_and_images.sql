CREATE TABLE IF NOT EXISTS product_options (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, name)
);
CREATE TABLE IF NOT EXISTS product_option_values (
  id UUID PRIMARY KEY,
  option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (option_id, value)
);
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku TEXT,
  barcode TEXT,
  price NUMERIC(12, 2) NOT NULL,
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  option_value_ids UUID[] NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, sku)
);
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images (product_id);
