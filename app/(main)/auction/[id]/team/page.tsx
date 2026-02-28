import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { TeamLeaderboard } from '@/components/league/TeamLeaderboard'

interface Props { params: Promise<{ id: string }> }

export default async function TeamPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: auction } = await service
    .from('auctions')
    .select('*, tournament:tournaments(*)')
    .eq('id', id)
    .single()
  if (!auction) notFound()

  if (auction.status !== 'league_live' && auction.status !== 'completed') {
    redirect(`/auction/${id}/league`)
  }

  const { data: myPart } = await service
    .from('auction_participants')
    .select('*')
    .eq('auction_id', id)
    .eq('user_id', user.id)
    .single()
  if (!myPart) redirect(`/auction/${id}/league`)

  const { data: allParticipants } = await service
    .from('auction_participants')
    .select('*, user:user_profiles(*)')
    .eq('auction_id', id)
    .eq('invite_status', 'accepted')

  const { data: allAuctionPlayers } = await service
    .from('auction_players')
    .select('*, player:players(*)')
    .eq('auction_id', id)
    .eq('auction_status', 'sold')

  const playerIds = (allAuctionPlayers || []).map((ap: { player_id: string }) => ap.player_id)
  const { data: stats } = playerIds.length
    ? await service.from('player_match_stats').select('player_id, points_raw').in('player_id', playerIds)
    : { data: [] }

  const pointsMap: Record<string, number> = {}
  ;(stats || []).forEach((s: { player_id: string; points_raw: number }) => {
    pointsMap[s.player_id] = (pointsMap[s.player_id] || 0) + s.points_raw
  })

  return (
    <TeamLeaderboard
      auction={auction}
      allParticipants={allParticipants || []}
      auctionPlayers={allAuctionPlayers || []}
      pointsMap={pointsMap}
      myParticipationId={myPart.id}
      myCaptainId={myPart.captain_id}
      myVcId={myPart.vc_id}
      captainChangeCount={myPart.captain_change_count}
      userId={user.id}
    />
  )
}
