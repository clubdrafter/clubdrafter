import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: auctionId } = await params

  // Verify the caller is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await request.json()
  if (status !== 'accepted' && status !== 'rejected') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Use service role so the UPDATE bypasses the circular RLS ap_read ↔ auctions_read policy.
  // We verify ownership manually before updating.
  const service = createServiceClient()

  const { data: part } = await service
    .from('auction_participants')
    .select('id')
    .eq('auction_id', auctionId)
    .eq('user_id', user.id)
    .single()

  if (!part) return NextResponse.json({ error: 'Participation not found' }, { status: 404 })

  const { error } = await service
    .from('auction_participants')
    .update({ invite_status: status })
    .eq('id', part.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
