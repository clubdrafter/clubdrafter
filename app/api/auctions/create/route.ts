import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { tournament_id, league_name, status, start_time, rules } = body

  if (!tournament_id || !league_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const service = createServiceClient()

  // Create the auction (service role bypasses RLS circular reference)
  const { data: auction, error } = await service
    .from('auctions')
    .insert({ tournament_id, league_name, host_id: user.id, status: status || 'upcoming', start_time: start_time || null, rules })
    .select()
    .single()

  if (error || !auction) {
    return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 })
  }

  // Add host as accepted participant
  await service.from('auction_participants').insert({
    auction_id: auction.id,
    user_id: user.id,
    invite_status: 'accepted',
    wallet_cr: rules?.wallet_cr ?? 100,
  })

  // Populate player pool from tournament
  const { data: players } = await service
    .from('players')
    .select('id')
    .eq('tournament_id', tournament_id)

  if (players?.length) {
    await service.from('auction_players').insert(
      players.map((p: { id: string }) => ({
        auction_id: auction.id,
        player_id: p.id,
        auction_status: 'unauctioned',
      }))
    )
  }

  return NextResponse.json({ auctionId: auction.id })
}
