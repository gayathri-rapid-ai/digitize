CREATE TABLE IF NOT EXISTS business_branding (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url TEXT,
  logo_storage_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
