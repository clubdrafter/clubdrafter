import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { meetsMinimumCriteria, countRoles } from '@/lib/auction-logic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: auctionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: auction } = await service
    .from('auctions')
    .select('rules')
    .eq('id', auctionId)
    .single()
  if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: participant } = await service
    .from('auction_participants')
    .select('id, wallet_cr')
    .eq('auction_id', auctionId)
    .eq('user_id', user.id)
    .single()
  if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })

  const { data: roster } = await service
    .from('auction_players')
    .select('*, player:players(*)')
    .eq('auction_id', auctionId)
    .eq('owner_participant_id', participant.id)
    .eq('auction_status', 'sold')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rosterAny = (roster || []) as any[]
  const roleCounts = countRoles(rosterAny.map((r: any) => r.player).filter(Boolean))
  const canComplete = meetsMinimumCriteria({
    playersBought: rosterAny.length,
    roster: rosterAny.map((r: any) => ({ player: r.player })),
    rules: auction.rules,
    foreignCount: roleCounts.FOREIGN,
  })

  if (!canComplete) return NextResponse.json({ error: 'Minimum squad requirements not met' }, { status: 422 })

  await service
    .from('auction_participants')
    .update({ is_finalized: true })
    .eq('id', participant.id)

  return NextResponse.json({ success: true })
}
