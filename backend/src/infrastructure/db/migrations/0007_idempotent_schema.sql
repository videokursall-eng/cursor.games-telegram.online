-- Idempotent schema fixes: ensure all critical columns and indexes exist on any DB state

-- rooms: ensure all extra columns exist
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bot_count INT NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS scenario TEXT DEFAULT 'mixed';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS auto_start_on_full BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS allow_late_join BOOLEAN NOT NULL DEFAULT FALSE;

-- Drop and re-add bot_count check constraint idempotently
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_bot_count_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_bot_count_check CHECK (bot_count >= 0 AND bot_count <= 5);

-- match_players: allow NULL user_id for bots
ALTER TABLE match_players ALTER COLUMN user_id DROP NOT NULL;

-- profiles: ensure updated_at column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS rooms_status_idx ON rooms(status);
CREATE INDEX IF NOT EXISTS rooms_owner_idx ON rooms(owner_user_id);
CREATE INDEX IF NOT EXISTS room_members_room_id_idx ON room_members(room_id);
CREATE INDEX IF NOT EXISTS matches_room_id_idx ON matches(room_id);
CREATE INDEX IF NOT EXISTS matches_status_idx ON matches(status);
CREATE INDEX IF NOT EXISTS match_players_match_idx ON match_players(match_id);
CREATE INDEX IF NOT EXISTS analytics_events_type_idx ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS action_logs_match_idx ON action_logs(match_id);
CREATE INDEX IF NOT EXISTS reconnect_tokens_match_idx ON reconnect_tokens(match_id);
CREATE INDEX IF NOT EXISTS reconnect_tokens_status_idx ON reconnect_tokens(status);
CREATE INDEX IF NOT EXISTS purchases_user_idx ON purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_status_idx ON purchases(status);
CREATE INDEX IF NOT EXISTS invites_status_idx ON invites(status);
CREATE INDEX IF NOT EXISTS invites_room_idx ON invites(room_id);
