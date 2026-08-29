CREATE TABLE IF NOT EXISTS theme_definitions (
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  configuration JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (name, version)
);

CREATE TABLE IF NOT EXISTS business_theme_mappings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL,
  theme_version INTEGER NOT NULL,
  configuration JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (theme_name, theme_version) REFERENCES theme_definitions(name, version)
);

INSERT INTO theme_definitions (name, version, configuration) VALUES
  ('minimal', 1, '{"--store-bg":"#f7f6f1","--store-ink":"#17211d","--store-accent":"#e5ff62","--store-muted":"#66716a","--store-line":"#d9ddd5"}'),
  ('classic', 1, '{"--store-bg":"#fffdf8","--store-ink":"#29231d","--store-accent":"#bd7a42","--store-muted":"#71685f","--store-line":"#dfd4c8"}'),
  ('bold', 1, '{"--store-bg":"#12101d","--store-ink":"#f7f0ff","--store-accent":"#ff5c35","--store-muted":"#c2b9cc","--store-line":"#3c3649"}')
ON CONFLICT (name, version) DO NOTHING;
