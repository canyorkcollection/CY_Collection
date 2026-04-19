-- ============================================================
-- CAN YORK — Migration 2 — Run in Supabase SQL Editor
-- Safe to run multiple times
-- ============================================================

-- 1. Add instagram to artists
ALTER TABLE artists ADD COLUMN IF NOT EXISTS instagram TEXT;

-- 2. Convert dimensions from inches to cm (multiply by 2.54)
-- Only convert if values look like inches (< 200, which would be ~500cm — safe threshold)
UPDATE artworks
SET
  width_cm  = ROUND((width_cm  * 2.54)::numeric, 1),
  height_cm = ROUND((height_cm * 2.54)::numeric, 1)
WHERE width_cm IS NOT NULL AND width_cm < 200 AND width_cm > 0;

-- 3. contact_info table (singleton)
CREATE TABLE IF NOT EXISTS contact_info (
  id          SERIAL PRIMARY KEY,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  hours       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row if empty
INSERT INTO contact_info (email, city, hours, description)
SELECT 'info@canyork.com', 'Ibiza, España', 'By appointment', 'For inquiries about artworks, acquisitions, and private viewings.'
WHERE NOT EXISTS (SELECT 1 FROM contact_info);

-- 4. admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  active        BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin (password stored as plain for now — update after setup)
-- Replace 'admin@canyork.com' and 'your-password' with real values
INSERT INTO admin_users (email, password_hash)
VALUES ('admin@canyork.com', 'change-me-now')
ON CONFLICT (email) DO NOTHING;

-- 5. invitations — add email column for email-based invitations
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- 6. Ensure artists.visible has a default
ALTER TABLE artists ALTER COLUMN visible SET DEFAULT TRUE;
UPDATE artists SET visible = TRUE WHERE visible IS NULL;

-- ============================================================
-- IMPORTANT after running:
-- Update admin password in admin_users table:
-- UPDATE admin_users SET password_hash = 'your-real-password' WHERE email = 'admin@canyork.com';
-- ============================================================
