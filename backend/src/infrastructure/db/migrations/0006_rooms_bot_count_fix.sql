-- Safety migration for existing production DBs: ensure rooms.bot_count exists
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS bot_count INT NOT NULL DEFAULT 0;

