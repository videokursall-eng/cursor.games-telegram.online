-- Rename telegram_id to tg_id if old schema exists (so auth.service works)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'telegram_id'
  ) THEN
    ALTER TABLE users RENAME COLUMN telegram_id TO tg_id;
  END IF;
END $$;
