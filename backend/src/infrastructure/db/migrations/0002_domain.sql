CREATE TABLE profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  avatar_url TEXT,
  rating INT NOT NULL DEFAULT 1000,
  games_played INT NOT NULL DEFAULT 0,
  games_won INT NOT NULL DEFAULT 0,
  games_lost INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_user_id_idx ON profiles(user_id);

CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id),
  variant TEXT NOT NULL,
  max_players INT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  bet_amount NUMERIC(18,2),
  currency VARCHAR(8),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rooms_status_idx ON rooms(status);
CREATE INDEX rooms_owner_idx ON rooms(owner_user_id);

CREATE TABLE room_members (
  id BIGSERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id),
  seat_index INT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE (room_id, seat_index),
  UNIQUE (room_id, user_id)
);
CREATE INDEX room_members_room_id_idx ON room_members(room_id);

CREATE TABLE invites (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  from_user_id BIGINT NOT NULL REFERENCES users(id),
  to_user_id BIGINT REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX invites_status_idx ON invites(status);
CREATE INDEX invites_room_idx ON invites(room_id);

CREATE TABLE matches (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id),
  variant TEXT NOT NULL,
  status TEXT NOT NULL,
  trump_suit CHAR(1) NOT NULL,
  state_version BIGINT NOT NULL DEFAULT 0,
  last_state JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX matches_room_id_idx ON matches(room_id);
CREATE INDEX matches_status_idx ON matches(status);

CREATE TABLE match_players (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  seat_index INT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL,
  cards_in_hand INT NOT NULL DEFAULT 0,
  cards_taken INT NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (match_id, user_id),
  UNIQUE (match_id, seat_index)
);
CREATE INDEX match_players_match_idx ON match_players(match_id);

CREATE TABLE deck_snapshots (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  version BIGINT NOT NULL,
  remaining_count INT NOT NULL,
  discard_count INT NOT NULL,
  trump_card TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, version)
);

CREATE TABLE turn_states (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  turn_number INT NOT NULL,
  attacker_id BIGINT NOT NULL REFERENCES users(id),
  defender_id BIGINT NOT NULL REFERENCES users(id),
  phase TEXT NOT NULL,
  table_cards JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, turn_number)
);

CREATE TABLE action_logs (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  seq BIGINT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  client_action_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, seq)
);
CREATE INDEX action_logs_match_idx ON action_logs(match_id);

CREATE TABLE reconnect_tokens (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);
CREATE INDEX reconnect_tokens_match_idx ON reconnect_tokens(match_id);
CREATE INDEX reconnect_tokens_status_idx ON reconnect_tokens(status);

CREATE TABLE stat_aggregates (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  period TEXT NOT NULL,
  bucket_date DATE NOT NULL,
  matches_played INT NOT NULL DEFAULT 0,
  matches_won INT NOT NULL DEFAULT 0,
  avg_turn_time_ms BIGINT NOT NULL DEFAULT 0,
  max_streak INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period, bucket_date)
);

CREATE TABLE cosmetic_items (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rarity TEXT NOT NULL,
  price NUMERIC(18,2),
  currency VARCHAR(8),
  is_limited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchases (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  external_id TEXT,
  amount NUMERIC(18,2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status TEXT NOT NULL,
  item_id BIGINT REFERENCES cosmetic_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX purchases_user_idx ON purchases(user_id);
CREATE INDEX purchases_status_idx ON purchases(status);

