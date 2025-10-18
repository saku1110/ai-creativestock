-- Migration: Add beauty sub-category support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'beauty_sub_category') THEN
    CREATE TYPE beauty_sub_category AS ENUM ('skincare', 'haircare', 'oralcare');
  END IF;
END $$;

ALTER TABLE video_assets
  ADD COLUMN IF NOT EXISTS beauty_sub_category beauty_sub_category;

-- Optional: ensure existing beauty records get a default sub-category
UPDATE video_assets
  SET beauty_sub_category = 'haircare'
  WHERE category = 'beauty'
    AND beauty_sub_category IS NULL
    AND EXISTS (
      SELECT 1 FROM unnest(tags) AS tag
      WHERE tag ILIKE '%%hair%%'
    );
