import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateBid } from '@/lib/auction-logic'

const BID_TIMER_SECONDS = 8

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: auctionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount_cr } = await request.json()
  if (typeof amount_cr !== 'number' || amount_cr <= 0) {
    return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 })
  }

  const service = createServiceClient()

  // Fetch auction state
  const { data: auction } = await service
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .eq('status', 'live_auction')
    .single()

  if (!auction) return NextResponse.json({ error: 'Auction not live' }, { status: 400 })
  if (!auction.current_player_id) return NextResponse.json({ error: 'No active player' }, { status: 400 })

  // Fetch participant
  const { data: participant } = await service
    .from('auction_participants')
    .select('*')
    .eq('auction_id', auctionId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single()

  if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  if (participant.is_finalized) return NextResponse.json({ error: 'Your auction is finalized' }, { status: 400 })

  // Fetch current player
  const { data: player } = await service
    .from('players')
    .select('*')
    .eq('id', auction.current_player_id)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 400 })

  // Fetch my roster for validation
  const { data: roster } = await service
    .from('auction_players')
    .select('*, player:players(*)')
    .eq('auction_id', auctionId)
    .eq('owner_participant_id', participant.id)
    .eq('auction_status', 'sold')

  const foreignCount = (roster || []).filter((r: { player?: { is_foreign?: boolean } }) => r.player?.is_foreign).length

  // Server-side bid validation
  const validationError = validateBid({
    proposedBidCr: amount_cr,
    currentBidCr: auction.current_bid_cr,
    walletCr: participant.wallet_cr,
    playersBought: (roster || []).length,
    rules: auction.rules,
    myRoster: roster || [],
    currentPlayer: player,
    foreignCount,
    round: auction.auction_round,
  })

  if (validationError) return NextResponse.json({ error: validationError }, { status: 422 })

  const timerEndsAt = new Date(Date.now() + BID_TIMER_SECONDS * 1000).toISOString()

  // Update auction with new bid
  const { error: updateErr } = await service
    .from('auctions')
    .update({
      current_bid_cr: amount_cr,
      current_bidder_id: user.id,
      timer_mode: 'bid',
      timer_ends_at: timerEndsAt,
    })
    .eq('id', auctionId)
    .eq('current_bid_cr', auction.current_bid_cr) // optimistic lock

  if (updateErr) return NextResponse.json({ error: 'Bid conflict — try again' }, { status: 409 })

  // Record bid history
  await service.from('bids').insert({
    auction_id: auctionId,
    player_id: auction.current_player_id,
    participant_id: participant.id,
    amount_cr,
  })

  // Schedule timer resolution (lightweight: polled or handled by a cron)
  // For now we use Supabase pg_cron or a server action called from the client timer
  return NextResponse.json({ success: true, timer_ends_at: timerEndsAt })
}
