-- Enable RLS & policies for slide_decks and user_dictionary
ALTER TABLE slide_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dictionary ENABLE ROW LEVEL SECURITY;

-- Allow owners full access
CREATE POLICY slide_decks_owner_policy ON slide_decks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_dictionary_owner_policy ON user_dictionary
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------- Usage tracking ----------------
CREATE TABLE IF NOT EXISTS usage_daily (
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  tokens_in INT NOT NULL DEFAULT 0,
  tokens_out INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY usage_daily_owner_policy ON usage_daily
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); 