-- Recovery for an earlier partial rename. The production rename must be deployed
-- atomically with the application code that uses the new business_* columns.
DO $$
BEGIN
  IF to_regclass('public.businesses') IS NOT NULL THEN
    ALTER TABLE businesses RENAME TO tenants;
    ALTER TABLE business_memberships RENAME TO tenant_memberships;
    ALTER TABLE tenant_memberships RENAME COLUMN business_id TO tenant_id;
    ALTER TABLE stores RENAME COLUMN business_id TO tenant_id;
    ALTER TABLE store_settings RENAME COLUMN business_id TO tenant_id;
    ALTER TABLE products RENAME COLUMN business_id TO tenant_id;
    ALTER TABLE collections RENAME COLUMN business_id TO tenant_id;
    ALTER TABLE inventory_items RENAME COLUMN business_id TO tenant_id;
    ALTER TABLE customers RENAME COLUMN business_id TO tenant_id;
    ALTER TABLE orders RENAME COLUMN business_id TO tenant_id;
    ALTER TABLE discounts RENAME COLUMN business_id TO tenant_id;
  END IF;
END $$;
