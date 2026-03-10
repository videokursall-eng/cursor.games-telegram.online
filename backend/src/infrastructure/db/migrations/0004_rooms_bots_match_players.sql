-- Rooms: add bot_count (0..5)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bot_count INT NOT NULL DEFAULT 0;
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_bot_count_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_bot_count_check CHECK (bot_count >= 0 AND bot_count <= 5);

-- Match players: allow NULL user_id for bots
ALTER TABLE match_players ALTER COLUMN user_id DROP NOT NULL;
