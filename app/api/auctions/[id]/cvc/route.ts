import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: auctionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { captain_id, vc_id } = await request.json()
  if (!captain_id || !vc_id || captain_id === vc_id) {
    return NextResponse.json({ error: 'Captain and VC must be different players' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: participant } = await service
    .from('auction_participants')
    .select('id, captain_id, vc_id, captain_change_count')
    .eq('auction_id', auctionId)
    .eq('user_id', user.id)
    .single()

  if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })

  const { data: auction } = await service.from('auctions').select('rules, status').eq('id', auctionId).single()
  if (!auction || auction.status === 'completed') return NextResponse.json({ error: 'Auction completed' }, { status: 400 })

  const maxChanges = auction.rules?.max_captain_changes ?? 3
  if (participant.captain_change_count >= maxChanges) {
    return NextResponse.json({ error: 'Captain change limit reached' }, { status: 422 })
  }

  // Count changes: if captain changed +1, if vc changed +1
  let changeCount = participant.captain_change_count
  if (captain_id !== participant.captain_id) changeCount++
  if (vc_id !== participant.vc_id) changeCount++

  // Verify both players are in their roster
  const { data: playerCheck } = await service
    .from('auction_players')
    .select('player_id')
    .eq('auction_id', auctionId)
    .eq('owner_participant_id', participant.id)
    .in('player_id', [captain_id, vc_id])

  if (!playerCheck || playerCheck.length < 2) {
    return NextResponse.json({ error: 'Selected players not in your squad' }, { status: 400 })
  }

  await service
    .from('auction_participants')
    .update({ captain_id, vc_id, captain_change_count: Math.min(changeCount, maxChanges) })
    .eq('id', participant.id)

  return NextResponse.json({ success: true })
}
