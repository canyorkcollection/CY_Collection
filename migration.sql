-- Run this in Supabase SQL Editor to ensure all columns exist
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks)

-- artists table: add missing columns
ALTER TABLE artists ADD COLUMN IF NOT EXISTS bio_long TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS death_year INTEGER;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE;

-- artworks table: visible flag (if not exists)
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE;

-- invitations table: label + used_at (if not exist)
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- Update existing rows to be visible by default
UPDATE artists SET visible = TRUE WHERE visible IS NULL;
UPDATE artworks SET visible = TRUE WHERE visible IS NULL;
