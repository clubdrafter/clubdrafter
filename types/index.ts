// ─── Database row types (mirror Supabase schema) ─────────────────────────────

export type Sport = 'cricket' | 'football' | 'basketball'

export type Tournament = {
  id: string
  name: string
  sport: Sport
  slug: string
  season: string | null
  created_at: string
}

export type UserProfile = {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export type AuctionStatus =
  | 'upcoming'
  | 'live_auction'
  | 'league_live'
  | 'completed'

export type InviteStatus = 'pending' | 'accepted' | 'rejected'

export type AuctionRules = {
  num_teams: number           // 3–9
  squad_size: number          // default 13
  wallet_cr: number           // default 100
  min_bid: number             // 10 (multiples of 10)
  round2_min_bid: number      // 20
  round3_min_bid: number      // 30
  // Team composition minimums
  min_batsmen: number         // 3
  min_bowlers: number         // 3
  min_wk: number              // 1
  min_allrounders: number     // 1
  max_foreign: number         // 3
  min_squad_size: number      // 11
  // Scoring
  points_per_run: number      // 1
  points_per_wicket: number   // 25
  points_per_catch: number    // 8
  points_per_stump_runout: number // 8
  captain_multiplier: number  // 2
  vc_multiplier: number       // 1.5
  max_captain_changes: number // 3
}

export type Auction = {
  id: string
  tournament_id: string
  league_name: string
  host_id: string
  status: AuctionStatus
  start_time: string | null
  rules: AuctionRules
  current_player_id: string | null
  current_bid_cr: number
  current_bidder_id: string | null
  timer_mode: 'no_bid' | 'bid' | null
  timer_ends_at: string | null
  auction_round: number
  created_at: string
  // Joined
  tournament?: Tournament
  host?: UserProfile
}

export type AuctionParticipant = {
  id: string
  auction_id: string
  user_id: string
  invite_status: InviteStatus
  wallet_cr: number
  is_finalized: boolean
  captain_id: string | null
  vc_id: string | null
  captain_change_count: number
  created_at: string
  // Joined
  user?: UserProfile
}

export type PlayerRole = 'BAT' | 'BOWL' | 'WK' | 'AR'

export type Player = {
  id: string
  tournament_id: string
  name: string
  role: PlayerRole
  club: string
  nationality: string
  is_foreign: boolean
  base_price_cr: number
  image_url: string | null
  created_at: string
}

export type AuctionPlayerStatus = 'unauctioned' | 'sold' | 'unsold'

export type AuctionPlayer = {
  id: string
  auction_id: string
  player_id: string
  auction_status: AuctionPlayerStatus
  owner_participant_id: string | null
  purchase_price_cr: number | null
  is_released: boolean
  // Joined
  player?: Player
  owner?: AuctionParticipant
}

export type Bid = {
  id: string
  auction_id: string
  player_id: string
  participant_id: string
  amount_cr: number
  created_at: string
}

export type Match = {
  id: string
  tournament_id: string
  match_number: number
  team_a: string
  team_b: string
  match_date: string | null
  status: 'scheduled' | 'live' | 'completed'
  created_at: string
}

export type PlayerMatchStats = {
  id: string
  player_id: string
  match_id: string
  runs: number
  wickets: number
  catches: number
  stumpings_runouts: number
  points_raw: number
  created_at: string
  // Joined
  player?: Player
  match?: Match
}

// ─── Computed / view types ────────────────────────────────────────────────────

export type TeamRoster = {
  participant: AuctionParticipant
  players: (AuctionPlayer & { player: Player; points: number })[]
  total_score: number
  quota: RoleQuota
}

export type RoleQuota = {
  BAT: { required: number; current: number }
  BOWL: { required: number; current: number }
  WK: { required: number; current: number }
  AR: { required: number; current: number }
  FOREIGN: { required: number; current: number }
}

export type LeaderboardEntry = {
  rank: number
  participant: AuctionParticipant
  total_score: number
}

// ─── Realtime broadcast payloads ─────────────────────────────────────────────

export type AuctionBroadcast =
  | { type: 'player_up'; player: Player; auction_player_id: string }
  | { type: 'bid_placed'; amount_cr: number; bidder_id: string; timer_ends_at: string }
  | { type: 'player_sold'; player: Player; winner_id: string; price_cr: number }
  | { type: 'player_unsold'; player: Player }
  | { type: 'auction_ended' }
  | { type: 'wallet_update'; participant_id: string; wallet_cr: number }
