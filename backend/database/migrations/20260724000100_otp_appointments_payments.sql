ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email_normalized DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_normalized TEXT;

WITH normalized AS (
  SELECT id, CASE
    WHEN phone IS NULL OR BTRIM(phone) = '' THEN NULL
    WHEN LENGTH(REGEXP_REPLACE(phone, '\D', '', 'g')) = 10
      THEN '+91' || REGEXP_REPLACE(phone, '\D', '', 'g')
    ELSE '+' || REGEXP_REPLACE(phone, '\D', '', 'g')
  END AS phone_value
  FROM users
  WHERE phone_normalized IS NULL
),
unique_candidates AS (
  SELECT phone_value
  FROM normalized
  WHERE phone_value IS NOT NULL
  GROUP BY phone_value
  HAVING COUNT(*) = 1
)
UPDATE users AS target
SET phone_normalized = normalized.phone_value
FROM normalized
JOIN unique_candidates USING (phone_value)
WHERE target.id = normalized.id
  AND NOT EXISTS (
    SELECT 1 FROM users AS existing
    WHERE existing.phone_normalized = normalized.phone_value
  );

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_normalized_unique
  ON users (phone_normalized)
  WHERE phone_normalized IS NOT NULL;

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('birth_chart', 'gemstone_guidance', 'muhurat')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes BETWEEN 15 AND 180),
  language TEXT NOT NULL DEFAULT 'Bengali' CHECK (language IN ('Bengali', 'English', 'Hindi')),
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_user_created_idx ON appointments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS appointments_schedule_idx ON appointments (scheduled_at, status);
CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_unique
  ON appointments (scheduled_at)
  WHERE status <> 'cancelled';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_unique
  ON orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'store', 'bank_transfer', 'razorpay'));

CREATE TABLE IF NOT EXISTS payment_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay' CHECK (provider = 'razorpay'),
  provider_order_id TEXT NOT NULL UNIQUE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  checkout_payload JSONB NOT NULL CHECK (jsonb_typeof(checkout_payload) = 'object'),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  provider_payment_id TEXT,
  completed_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_intents_user_created_idx
  ON payment_intents (user_id, created_at DESC);
