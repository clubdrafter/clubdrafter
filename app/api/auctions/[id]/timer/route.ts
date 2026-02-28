import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const NO_BID_TIMER = 30 // seconds

/** Called by host to start auction, or by client timer to resolve expired timers */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: auctionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const action = body.action || 'start' // 'start' | 'resolve'

  const service = createServiceClient()

  const { data: auction } = await service
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single()

  if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ── Start auction (host only)
  if (action === 'start') {
    if (auction.host_id !== user.id) return NextResponse.json({ error: 'Only host can start' }, { status: 403 })

    const nextPlayer = await pickNextPlayer(service, auctionId)
    if (!nextPlayer) return NextResponse.json({ error: 'No players in pool' }, { status: 400 })

    const timerEndsAt = new Date(Date.now() + NO_BID_TIMER * 1000).toISOString()
    await service.from('auctions').update({
      status: 'live_auction',
      current_player_id: nextPlayer.player_id,
      current_bid_cr: 0,
      current_bidder_id: null,
      timer_mode: 'no_bid',
      timer_ends_at: timerEndsAt,
    }).eq('id', auctionId)

    return NextResponse.json({ success: true })
  }

  // ── Resolve expired timer (any authenticated participant can call)
  if (action === 'resolve') {
    if (!auction.timer_ends_at) return NextResponse.json({ skipped: true })
    const expired = new Date(auction.timer_ends_at).getTime() <= Date.now()
    if (!expired) return NextResponse.json({ skipped: 'not expired yet' })

    if (auction.timer_mode === 'no_bid' && auction.current_bid_cr === 0) {
      // Mark unsold
      await service.from('auction_players').update({ auction_status: 'unsold' }).eq('player_id', auction.current_player_id).eq('auction_id', auctionId)
      await advanceToNextPlayer(service, auctionId, auction)
    } else if (auction.timer_mode === 'bid' && auction.current_bidder_id) {
      // Sell to highest bidder
      await sellCurrentPlayer(service, auctionId, auction)
      await advanceToNextPlayer(service, auctionId, auction)
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

async function pickNextPlayer(service: ReturnType<typeof createServiceClient>, auctionId: string) {
  const { data } = await service
    .from('auction_players')
    .select('player_id')
    .eq('auction_id', auctionId)
    .eq('auction_status', 'unauctioned')
  if (!data?.length) return null
  // Random pick
  return data[Math.floor(Math.random() * data.length)]
}

async function sellCurrentPlayer(service: ReturnType<typeof createServiceClient>, auctionId: string, auction: Record<string, unknown>) {
  // Find the winner's participant record
  const { data: winner } = await service
    .from('auction_participants')
    .select('id, wallet_cr')
    .eq('auction_id', auctionId)
    .eq('user_id', auction.current_bidder_id)
    .single()

  if (!winner) return

  const price = auction.current_bid_cr as number

  await Promise.all([
    service.from('auction_players').update({
      auction_status: 'sold',
      owner_participant_id: winner.id,
      purchase_price_cr: price,
    }).eq('player_id', auction.current_player_id as string).eq('auction_id', auctionId),

    service.from('auction_participants').update({
      wallet_cr: (winner.wallet_cr as number) - price,
    }).eq('id', winner.id),
  ])
}

async function advanceToNextPlayer(service: ReturnType<typeof createServiceClient>, auctionId: string, auction: Record<string, unknown>) {
  const next = await pickNextPlayer(service, auctionId)

  // Check if all teams are finalized
  const { data: participants } = await service
    .from('auction_participants')
    .select('is_finalized')
    .eq('auction_id', auctionId)
    .eq('invite_status', 'accepted')
  const allFinalized = participants?.every((p: { is_finalized: boolean }) => p.is_finalized)

  if (!next || allFinalized) {
    // Auction over → transition to league_live
    await service.from('auctions').update({
      status: 'league_live',
      current_player_id: null,
      current_bid_cr: 0,
      current_bidder_id: null,
      timer_mode: null,
      timer_ends_at: null,
    }).eq('id', auctionId)
    return
  }

  const timerEndsAt = new Date(Date.now() + 30 * 1000).toISOString()
  await service.from('auctions').update({
    current_player_id: next.player_id,
    current_bid_cr: 0,
    current_bidder_id: null,
    timer_mode: 'no_bid',
    timer_ends_at: timerEndsAt,
  }).eq('id', auctionId)
}
