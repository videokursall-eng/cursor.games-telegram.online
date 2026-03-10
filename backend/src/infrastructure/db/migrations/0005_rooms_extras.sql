-- Additional room settings: name, scenario, auto start, late join flag
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS scenario TEXT DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS auto_start_on_full BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_late_join BOOLEAN NOT NULL DEFAULT FALSE;

