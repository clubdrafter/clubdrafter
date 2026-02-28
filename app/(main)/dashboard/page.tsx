import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: participations } = await service
    .from('auction_participants')
    .select(`
      *,
      auction:auctions(
        *,
        tournament:tournaments(name, sport, slug),
        host:user_profiles!auctions_host_id_fkey(id, display_name, username)
      )
    `)
    .eq('user_id', user.id)
    .neq('invite_status', 'rejected')
    .order('created_at', { ascending: false })

  const { data: hostedAuctions } = await service
    .from('auctions')
    .select(`
      *,
      tournament:tournaments(name, sport, slug),
      host:user_profiles!auctions_host_id_fkey(id, display_name, username)
    `)
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardClient
      userId={user.id}
      participations={participations || []}
      hostedAuctions={hostedAuctions || []}
    />
  )
}
