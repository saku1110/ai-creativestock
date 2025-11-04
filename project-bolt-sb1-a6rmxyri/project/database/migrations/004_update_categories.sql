-- Migration: Update video categories to {beauty, diet, business, lifestyle, romance, pet}
-- 1) Add new enum values if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'video_category' AND e.enumlabel = 'diet') THEN
    ALTER TYPE video_category ADD VALUE 'diet';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'video_category' AND e.enumlabel = 'romance') THEN
    ALTER TYPE video_category ADD VALUE 'romance';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'video_category' AND e.enumlabel = 'pet') THEN
    ALTER TYPE video_category ADD VALUE 'pet';
  END IF;
END $$;

-- 2) Remap existing rows
UPDATE video_assets SET category = 'diet' WHERE category = 'fitness';
UPDATE video_assets SET category = 'beauty' WHERE category = 'haircare';

-- Note: Removing enum values is disruptive; keep legacy values for backward compatibility.
-- UI/ingestion will use the new set going forward.

