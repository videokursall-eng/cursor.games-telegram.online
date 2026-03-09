INSERT INTO users (id, tg_id, username)
VALUES (1, 100001, 'dev_player_1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (user_id, rating, games_played, games_won, games_lost, longest_streak)
VALUES (1, 1200, 10, 6, 4, 3)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO cosmetic_items (code, type, name, description, rarity, price, currency, is_limited)
VALUES
  ('back_green', 'card_back', 'Зелёная рубашка', 'Классическая зелёная рубашка', 'common', 100, 'RUB', false),
  ('table_green', 'table_theme', 'Зелёный стол', 'Стандартный зелёный стол', 'common', 0, 'RUB', false)
ON CONFLICT (code) DO NOTHING;

