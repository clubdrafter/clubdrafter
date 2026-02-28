import type { AuctionRules, AuctionPlayer, Player, AuctionParticipant } from '@/types'

/**
 * Calculate the maximum a participant can bid on the current player.
 * Formula: wallet - (remaining_slots_needed - 1) * min_bid
 * The -1 accounts for this current player they're bidding on.
 */
export function calcMaxSpendable(
  walletCr: number,
  playersBought: number,
  rules: AuctionRules
): number {
  const slotsRemaining = rules.squad_size - playersBought
  if (slotsRemaining <= 0) return walletCr
  // Must reserve enough for remaining slots after buying this one
  const mustReserve = Math.max(0, (slotsRemaining - 1)) * (rules.min_bid / 100)
  return Math.max(0, walletCr - mustReserve)
}

/**
 * Validate a bid server-side.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateBid(params: {
  proposedBidCr: number
  currentBidCr: number
  walletCr: number
  playersBought: number
  rules: AuctionRules
  myRoster: AuctionPlayer[]
  currentPlayer: Player
  foreignCount: number
  round: number
}): string | null {
  const { proposedBidCr, currentBidCr, walletCr, playersBought, rules, myRoster, currentPlayer, foreignCount, round } = params

  const minBidCr = getMinBidForRound(round, rules) / 100

  // Must exceed current bid
  if (proposedBidCr <= currentBidCr) {
    return `Bid must be higher than current bid of ₹${currentBidCr} Cr`
  }

  // Minimum bid increment
  if (proposedBidCr < minBidCr) {
    return `Minimum bid is ₹${minBidCr} Cr`
  }

  // Must be multiple of 10L (0.1 Cr)
  const asPaise = Math.round(proposedBidCr * 100)
  if (asPaise % 10 !== 0) {
    return 'Bid must be in multiples of ₹0.10 Cr (10 Lakhs)'
  }

  // Wallet check
  if (proposedBidCr > walletCr) {
    return 'Insufficient wallet balance'
  }

  // Max spendable (reserve for remaining squad)
  const maxSpendable = calcMaxSpendable(walletCr, playersBought, rules)
  if (proposedBidCr > maxSpendable) {
    return 'Not enough balance to complete minimum squad after this bid'
  }

  // Foreign player limit
  if (currentPlayer.is_foreign && foreignCount >= rules.max_foreign) {
    return 'Foreign player limit reached (max 3)'
  }

  return null
}

export function getMinBidForRound(round: number, rules: AuctionRules): number {
  if (round === 1) return rules.min_bid
  if (round === 2) return rules.round2_min_bid
  return rules.round3_min_bid
}

/**
 * Check if a team meets minimum squad requirements.
 */
export function meetsMinimumCriteria(params: {
  playersBought: number
  roster: { player: Player }[]
  rules: AuctionRules
  foreignCount: number
}): boolean {
  const { playersBought, roster, rules } = params
  if (playersBought < rules.min_squad_size) return false

  const counts = countRoles(roster.map(r => r.player))
  if (counts.BAT < rules.min_batsmen) return false
  if (counts.BOWL < rules.min_bowlers) return false
  if (counts.WK < rules.min_wk) return false
  if (counts.AR < rules.min_allrounders) return false

  return true
}

export function countRoles(players: Pick<Player, 'role' | 'is_foreign'>[]): {
  BAT: number; BOWL: number; WK: number; AR: number; FOREIGN: number
} {
  return players.reduce(
    (acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1
      if (p.is_foreign) acc.FOREIGN++
      return acc
    },
    { BAT: 0, BOWL: 0, WK: 0, AR: 0, FOREIGN: 0 }
  )
}

/**
 * Calculate points for a player in a match, applying captain/VC multipliers.
 */
export function calcPlayerPoints(stats: {
  runs: number
  wickets: number
  catches: number
  stumpings_runouts: number
}, rules: AuctionRules, isCaptain: boolean, isVC: boolean): number {
  const raw =
    stats.runs * rules.points_per_run +
    stats.wickets * rules.points_per_wicket +
    stats.catches * rules.points_per_catch +
    stats.stumpings_runouts * rules.points_per_stump_runout

  if (isCaptain) return raw * rules.captain_multiplier
  if (isVC) return raw * rules.vc_multiplier
  return raw
}

export const DEFAULT_RULES: AuctionRules = {
  num_teams: 9,
  squad_size: 13,
  wallet_cr: 100,
  min_bid: 10,
  round2_min_bid: 20,
  round3_min_bid: 30,
  min_batsmen: 3,
  min_bowlers: 3,
  min_wk: 1,
  min_allrounders: 1,
  max_foreign: 3,
  min_squad_size: 11,
  points_per_run: 1,
  points_per_wicket: 25,
  points_per_catch: 8,
  points_per_stump_runout: 8,
  captain_multiplier: 2,
  vc_multiplier: 1.5,
  max_captain_changes: 3,
}
