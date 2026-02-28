import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { LiveAuctionRoom } from '@/components/auction/LiveAuctionRoom'

interface Props { params: Promise<{ id: string }> }

export default async function AuctionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: auction } = await service
    .from('auctions')
    .select(`*, tournament:tournaments(*), host:user_profiles!auctions_host_id_fkey(*)`)
    .eq('id', id)
    .single()

  if (!auction) notFound()

  // Must be accepted participant
  const { data: participation } = await service
    .from('auction_participants')
    .select('*')
    .eq('auction_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!participation || participation.invite_status !== 'accepted') {
    redirect(`/auction/${id}/league`)
  }

  const { data: allParticipants } = await service
    .from('auction_participants')
    .select('*, user:user_profiles(*)')
    .eq('auction_id', id)
    .eq('invite_status', 'accepted')

  const { data: auctionPlayers } = await service
    .from('auction_players')
    .select('*, player:players(*)')
    .eq('auction_id', id)

  return (
    <LiveAuctionRoom
      auction={auction}
      participation={participation}
      allParticipants={allParticipants || []}
      auctionPlayers={auctionPlayers || []}
      userId={user.id}
      isHost={auction.host_id === user.id}
    />
  )
}
