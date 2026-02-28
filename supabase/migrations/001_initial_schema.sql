-- ============================================================
-- Clubdrafter — Initial Schema
-- Run this in your Supabase SQL editor or via supabase db push
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tournaments ─────────────────────────────────────────────
CREATE TABLE tournaments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  sport       TEXT NOT NULL CHECK (sport IN ('cricket','football','basketball')),
  slug        TEXT NOT NULL UNIQUE,
  season      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed IPL as the first tournament
INSERT INTO tournaments (name, sport, slug, season)
VALUES ('IPL', 'cricket', 'ipl', '2025');

-- ─── User Profiles ───────────────────────────────────────────
-- Extends Supabase auth.users
CREATE TABLE user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  username     TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url   TEXT,
  is_admin     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile row when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Players ─────────────────────────────────────────────────
CREATE TABLE players (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('BAT','BOWL','WK','AR')),
  club            TEXT NOT NULL,
  nationality     TEXT NOT NULL,
  is_foreign      BOOLEAN NOT NULL DEFAULT FALSE,
  base_price_cr   NUMERIC(6,2) NOT NULL DEFAULT 0.10,
  image_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_tournament ON players(tournament_id);

-- ─── Auctions ────────────────────────────────────────────────
CREATE TABLE auctions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id       UUID NOT NULL REFERENCES tournaments(id),
  league_name         TEXT NOT NULL,
  host_id             UUID NOT NULL REFERENCES user_profiles(id),
  status              TEXT NOT NULL DEFAULT 'upcoming'
                        CHECK (status IN ('upcoming','live_auction','league_live','completed')),
  start_time          TIMESTAMPTZ,
  rules               JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_player_id   UUID REFERENCES players(id),
  current_bid_cr      NUMERIC(6,2) NOT NULL DEFAULT 0,
  current_bidder_id   UUID REFERENCES user_profiles(id),
  timer_mode          TEXT CHECK (timer_mode IN ('no_bid','bid')),
  timer_ends_at       TIMESTAMPTZ,
  auction_round       INT NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auctions_host ON auctions(host_id);
CREATE INDEX idx_auctions_status ON auctions(status);

-- ─── Auction Participants ─────────────────────────────────────
CREATE TABLE auction_participants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id          UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES user_profiles(id),
  invite_status       TEXT NOT NULL DEFAULT 'pending'
                        CHECK (invite_status IN ('pending','accepted','rejected')),
  wallet_cr           NUMERIC(6,2) NOT NULL DEFAULT 100,
  is_finalized        BOOLEAN NOT NULL DEFAULT FALSE,
  captain_id          UUID REFERENCES players(id),
  vc_id               UUID REFERENCES players(id),
  captain_change_count INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (auction_id, user_id)
);

CREATE INDEX idx_ap_auction ON auction_participants(auction_id);
CREATE INDEX idx_ap_user ON auction_participants(user_id);

-- ─── Auction Players (player pool per auction) ────────────────
CREATE TABLE auction_players (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id              UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  player_id               UUID NOT NULL REFERENCES players(id),
  auction_status          TEXT NOT NULL DEFAULT 'unauctioned'
                            CHECK (auction_status IN ('unauctioned','sold','unsold')),
  owner_participant_id    UUID REFERENCES auction_participants(id),
  purchase_price_cr       NUMERIC(6,2),
  is_released             BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (auction_id, player_id)
);

CREATE INDEX idx_auction_players_auction ON auction_players(auction_id);
CREATE INDEX idx_auction_players_owner ON auction_players(owner_participant_id);

-- ─── Bids ─────────────────────────────────────────────────────
CREATE TABLE bids (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id     UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  player_id      UUID NOT NULL REFERENCES players(id),
  participant_id UUID NOT NULL REFERENCES auction_participants(id),
  amount_cr      NUMERIC(6,2) NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_auction ON bids(auction_id);
CREATE INDEX idx_bids_participant ON bids(participant_id);

-- ─── Matches ─────────────────────────────────────────────────
CREATE TABLE matches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  match_number  INT NOT NULL,
  team_a        TEXT NOT NULL,
  team_b        TEXT NOT NULL,
  match_date    TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','live','completed')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Player Match Stats ───────────────────────────────────────
CREATE TABLE player_match_stats (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id         UUID NOT NULL REFERENCES players(id),
  match_id          UUID NOT NULL REFERENCES matches(id),
  runs              INT NOT NULL DEFAULT 0,
  wickets           INT NOT NULL DEFAULT 0,
  catches           INT NOT NULL DEFAULT 0,
  stumpings_runouts INT NOT NULL DEFAULT 0,
  points_raw        NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, match_id)
);

CREATE INDEX idx_pms_player ON player_match_stats(player_id);
CREATE INDEX idx_pms_match ON player_match_stats(match_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE tournaments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_stats   ENABLE ROW LEVEL SECURITY;

-- Tournaments: read-only for everyone, write only for admins
CREATE POLICY "tournaments_read" ON tournaments FOR SELECT USING (TRUE);
CREATE POLICY "tournaments_admin" ON tournaments FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- User profiles: users can read all profiles, edit only their own
CREATE POLICY "profiles_read" ON user_profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Players: anyone can read; only admins can write
CREATE POLICY "players_read" ON players FOR SELECT USING (TRUE);
CREATE POLICY "players_admin_write" ON players FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Auctions: participants and host can read; host creates; service role for state updates
CREATE POLICY "auctions_read" ON auctions FOR SELECT
  USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auction_participants
      WHERE auction_id = auctions.id
        AND user_id = auth.uid()
        AND invite_status != 'rejected'
    )
  );

CREATE POLICY "auctions_insert_host" ON auctions FOR INSERT
  WITH CHECK (host_id = auth.uid());

-- Auction participants: participants can read their own auction's participants
CREATE POLICY "ap_read" ON auction_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR auction_id IN (
      SELECT id FROM auctions WHERE host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auction_participants ap2
      WHERE ap2.auction_id = auction_participants.auction_id
        AND ap2.user_id = auth.uid()
        AND ap2.invite_status = 'accepted'
    )
  );

CREATE POLICY "ap_insert_host" ON auction_participants FOR INSERT
  WITH CHECK (
    auction_id IN (SELECT id FROM auctions WHERE host_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "ap_update_own" ON auction_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Auction players: readable by auction participants
CREATE POLICY "auction_players_read" ON auction_players FOR SELECT
  USING (
    auction_id IN (
      SELECT id FROM auctions WHERE host_id = auth.uid()
      UNION
      SELECT auction_id FROM auction_participants WHERE user_id = auth.uid()
    )
  );

-- Bids: readable by auction participants
CREATE POLICY "bids_read" ON bids FOR SELECT
  USING (
    auction_id IN (
      SELECT auction_id FROM auction_participants WHERE user_id = auth.uid()
      UNION
      SELECT id FROM auctions WHERE host_id = auth.uid()
    )
  );

CREATE POLICY "bids_insert_participant" ON bids FOR INSERT
  WITH CHECK (
    participant_id IN (
      SELECT id FROM auction_participants WHERE user_id = auth.uid()
    )
  );

-- Matches: read-only for everyone, write for admins
CREATE POLICY "matches_read" ON matches FOR SELECT USING (TRUE);
CREATE POLICY "matches_admin" ON matches FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Player match stats: read-only for everyone, write for admins
CREATE POLICY "pms_read" ON player_match_stats FOR SELECT USING (TRUE);
CREATE POLICY "pms_admin" ON player_match_stats FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ============================================================
-- Realtime: enable for live auction tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_players;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
