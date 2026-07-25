ALTER TABLE products DROP CONSTRAINT IF EXISTS products_material_check;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_key TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS products_rate_key_idx ON products (rate_key) WHERE rate_key <> '';

ALTER TABLE compliance_reviews ADD COLUMN IF NOT EXISTS document_url TEXT;
