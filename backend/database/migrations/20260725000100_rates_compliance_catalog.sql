ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'manual'
  CHECK (pricing_mode IN ('manual', 'dynamic'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS making_charge_type TEXT NOT NULL DEFAULT ''
  CHECK (making_charge_type IN ('', 'flat', 'percent'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS making_charge_value NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (making_charge_value >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS carat_weight NUMERIC(10,3) NOT NULL DEFAULT 0
  CHECK (carat_weight >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS diamond_tier TEXT NOT NULL DEFAULT ''
  CHECK (diamond_tier IN ('', 'IF', 'VVS', 'VS', 'SI'));

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_email TEXT NOT NULL DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS provider_type TEXT NOT NULL DEFAULT 'astrologer'
  CHECK (provider_type IN ('astrologer', 'royco_specialist'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialist TEXT NOT NULL DEFAULT 'First available';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_mode TEXT NOT NULL DEFAULT 'in_person'
  CHECK (consultation_mode IN ('in_person', 'virtual'));
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_service_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_service_check
  CHECK (service IN ('birth_chart', 'gemstone_guidance', 'muhurat', 'custom_design', 'high_value_purchase', 'product_consultation'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_paise BIGINT NOT NULL DEFAULT 0 CHECK (gst_paise >= 0);
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'pending_verification', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));

CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL CHECK (jsonb_typeof(settings) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO store_settings (id, settings)
VALUES ('primary', '{
  "rates":{"gold24k":10450,"gold22k":9580,"gold18k":7838,"silverGram":118,"silverKg":118000,"platinumGram":3560,"diamond":{"IF":725000,"VVS":525000,"VS":365000,"SI":245000}},
  "makingCharges":{"Gold":{"type":"percent","value":12},"Silver":{"type":"percent","value":18},"Platinum":{"type":"percent","value":15},"Diamond":{"type":"flat","value":7500}},
  "social":{"x":"https://x.com/","facebook":"https://www.facebook.com/","whatsapp":"https://wa.me/913326835943","instagram":"https://www.instagram.com/"},
  "published":true
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS compliance_reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL CHECK (document_type IN ('pan', 'form60')),
  pan_number TEXT,
  form60_declaration TEXT,
  phone TEXT NOT NULL,
  combined_total_paise BIGINT NOT NULL CHECK (combined_total_paise >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (document_type = 'pan' AND pan_number IS NOT NULL)
    OR (document_type = 'form60' AND form60_declaration IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS compliance_reviews_status_created_idx
  ON compliance_reviews (status, created_at DESC);
