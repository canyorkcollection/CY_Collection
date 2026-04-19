-- ============================================================
-- CAN YORK — Complete Migration — Run in Supabase SQL Editor
-- Run this FIRST before deploying the app
-- ============================================================

-- 1. Artists table
CREATE TABLE IF NOT EXISTS artists (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  bio_short   TEXT,
  bio_long    TEXT,
  nationality TEXT,
  birth_year  INTEGER,
  death_year  INTEGER,
  photo_url   TEXT,
  website     TEXT,
  instagram   TEXT,
  visible     BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Artworks table
CREATE TABLE IF NOT EXISTS artworks (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id      UUID REFERENCES artists(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  year           INTEGER,
  medium         TEXT,
  support        TEXT,
  width_cm       NUMERIC(10,1),
  height_cm      NUMERIC(10,1),
  catalog_number TEXT,
  collection     TEXT,
  condition      TEXT,
  signature      TEXT,
  provenance     TEXT,
  notes          TEXT,
  visible        BOOLEAN DEFAULT TRUE,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Artwork images table
CREATE TABLE IF NOT EXISTS artwork_images (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id  UUID REFERENCES artworks(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  type        TEXT DEFAULT 'detail',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token            TEXT UNIQUE NOT NULL,
  email            TEXT,
  label            TEXT,
  active           BOOLEAN DEFAULT TRUE,
  used_at          TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Client passwords table (for visitor access codes)
CREATE TABLE IF NOT EXISTS client_passwords (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  password_hash TEXT UNIQUE NOT NULL,
  label         TEXT,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Contact info table (singleton)
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

-- Insert default contact info row
INSERT INTO contact_info (email, city, hours, description)
SELECT 'info@canyork.com', 'Ibiza, Spain', 'By appointment', 'For inquiries about artworks, acquisitions, and private viewings.'
WHERE NOT EXISTS (SELECT 1 FROM contact_info);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-images', 'artwork-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'artwork-images');

CREATE POLICY "Allow service upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'artwork-images' AND auth.role() = 'service_role');

CREATE POLICY "Allow service update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'artwork-images' AND auth.role() = 'service_role');

CREATE POLICY "Allow service delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'artwork-images' AND auth.role() = 'service_role');

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visible artists" ON artists FOR SELECT USING (visible = true OR auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON artists FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visible artworks" ON artworks FOR SELECT USING (visible = true OR auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON artworks FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE artwork_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read artwork images" ON artwork_images FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON artwork_images FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON invitations FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE client_passwords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON client_passwords FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE contact_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read contact" ON contact_info FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON contact_info FOR ALL USING (auth.role() = 'service_role');
