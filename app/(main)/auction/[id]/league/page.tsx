import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ViewLeague } from '@/components/league/ViewLeague'

interface Props { params: Promise<{ id: string }> }

export default async function LeaguePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: auction } = await service
    .from('auctions')
    .select('*, tournament:tournaments(*), host:user_profiles!auctions_host_id_fkey(*)')
    .eq('id', id)
    .single()
  if (!auction) notFound()

  const { data: myParticipation } = await service
    .from('auction_participants')
    .select('*')
    .eq('auction_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isHost = auction.host_id === user.id

  const { data: participants } = await service
    .from('auction_participants')
    .select('*, user:user_profiles(*)')
    .eq('auction_id', id)
    .order('created_at')

  return (
    <ViewLeague
      auction={auction}
      participants={participants || []}
      myParticipation={myParticipation}
      isHost={isHost}
      userId={user.id}
    />
  )
}
