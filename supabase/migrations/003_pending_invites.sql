-- ============================================================
-- Pending invites for users who haven't signed up yet.
-- When the user registers, /api/auth/signup claims these rows
-- and creates auction_participants entries automatically.
-- Run this in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL,
  auction_id  UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  wallet_cr   NUMERIC(6,2) NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email, auction_id)
);

-- Service role reads/writes; no user-facing RLS needed
ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated access — only the service role (bypasses RLS) touches this table
