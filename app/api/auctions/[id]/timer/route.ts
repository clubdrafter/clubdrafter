import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function broadcastToAuction(auctionId: string, payload: Record<string, unknown>) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({
        messages: [{ topic: `realtime:auction:${auctionId}`, event: payload.type, payload }],
      }),
    })
  } catch {
    // Non-critical — postgres_changes is the fallback
  }
}

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

    broadcastToAuction(auctionId, { type: 'player_up', player_id: nextPlayer.player_id, timer_ends_at: timerEndsAt, auction_status: 'live_auction' })
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
      broadcastToAuction(auctionId, { type: 'player_unsold', player_id: auction.current_player_id })
      const next = await advanceToNextPlayer(service, auctionId, auction)
      if (next.ended) broadcastToAuction(auctionId, { type: 'auction_ended' })
      else broadcastToAuction(auctionId, { type: 'player_up', player_id: next.player_id!, timer_ends_at: next.timer_ends_at! })
    } else if (auction.timer_mode === 'bid' && auction.current_bidder_id) {
      // Sell to highest bidder
      const sold = await sellCurrentPlayer(service, auctionId, auction)
      broadcastToAuction(auctionId, { type: 'player_sold', player_id: auction.current_player_id, winner_participant_id: sold.winner_participant_id, price_cr: sold.price })
      broadcastToAuction(auctionId, { type: 'wallet_update', participant_id: sold.winner_participant_id, wallet_cr: sold.new_wallet_cr })
      const next = await advanceToNextPlayer(service, auctionId, auction)
      if (next.ended) broadcastToAuction(auctionId, { type: 'auction_ended' })
      else broadcastToAuction(auctionId, { type: 'player_up', player_id: next.player_id!, timer_ends_at: next.timer_ends_at! })
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
  const { data: winner } = await service
    .from('auction_participants')
    .select('id, wallet_cr')
    .eq('auction_id', auctionId)
    .eq('user_id', auction.current_bidder_id)
    .single()

  if (!winner) return { winner_participant_id: '', price: 0, new_wallet_cr: 0 }

  const price = auction.current_bid_cr as number
  const new_wallet_cr = (winner.wallet_cr as number) - price

  await Promise.all([
    service.from('auction_players').update({
      auction_status: 'sold',
      owner_participant_id: winner.id,
      purchase_price_cr: price,
    }).eq('player_id', auction.current_player_id as string).eq('auction_id', auctionId),

    service.from('auction_participants').update({
      wallet_cr: new_wallet_cr,
    }).eq('id', winner.id),
  ])

  return { winner_participant_id: winner.id as string, price, new_wallet_cr }
}

async function advanceToNextPlayer(service: ReturnType<typeof createServiceClient>, auctionId: string, auction: Record<string, unknown>): Promise<{ ended: boolean; player_id?: string; timer_ends_at?: string }> {
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
    return { ended: true }
  }

  const timerEndsAt = new Date(Date.now() + 30 * 1000).toISOString()
  await service.from('auctions').update({
    current_player_id: next.player_id,
    current_bid_cr: 0,
    current_bidder_id: null,
    timer_mode: 'no_bid',
    timer_ends_at: timerEndsAt,
  }).eq('id', auctionId)
  return { ended: false, player_id: next.player_id, timer_ends_at: timerEndsAt }
}
