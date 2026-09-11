CREATE TABLE IF NOT EXISTS payments (
  order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_order_id TEXT NOT NULL UNIQUE,
  provider_payment_id TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_store_id_idx ON payments (store_id);
CREATE INDEX IF NOT EXISTS payments_customer_account_id_idx ON payments (customer_account_id);
