-- ============================================================================
-- Sri Lakshmi Tiffin Center - Database Setup Script
-- Copy EVERYTHING in this file and paste directly into Supabase SQL Editor.
-- ============================================================================

-- 1. Enable UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number       TEXT UNIQUE NOT NULL,
    name               TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'te',
    loyalty_points     INTEGER NOT NULL DEFAULT 0,
    last_visit         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_telugu    TEXT NOT NULL,
    name_english   TEXT NOT NULL,
    price          NUMERIC(10, 2) NOT NULL,
    category       TEXT NOT NULL,
    is_available   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    ordered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    source       TEXT NOT NULL DEFAULT 'whatsapp'
);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    menu_item_id   UUID NOT NULL REFERENCES menu_items (id) ON DELETE RESTRICT,
    quantity       INTEGER NOT NULL DEFAULT 1,
    price_at_time  NUMERIC(10, 2) NOT NULL
);

-- 6. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id      UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    rating           INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment_original TEXT,
    sentiment        TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Query Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at   ON orders (ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_customer   ON feedback (customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone     ON customers (phone_number);

-- 8. Seed Initial Default Warangal Tiffin Menu Items
INSERT INTO menu_items (name_telugu, name_english, price, category, is_available)
VALUES
    ('ఇడ్లి', 'Idli', 20.00, 'breakfast', true),
    ('దోస', 'Dosa', 30.00, 'breakfast', true),
    ('ఉప్మా', 'Upma', 25.00, 'breakfast', true),
    ('పూరి', 'Poori', 35.00, 'breakfast', true),
    ('వడ', 'Vada', 15.00, 'breakfast', true),
    ('సాంబార్ రైస్', 'Sambar Rice', 50.00, 'lunch', true),
    ('పెరుగు అన్నం', 'Curd Rice', 40.00, 'lunch', true),
    ('పులిహోర', 'Pulihora', 45.00, 'lunch', true),
    ('చాయ్', 'Chai', 10.00, 'drinks', true),
    ('కాఫీ', 'Filter Coffee', 15.00, 'drinks', true)
ON CONFLICT DO NOTHING;
