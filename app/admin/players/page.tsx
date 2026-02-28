import { createServiceClient } from "@/lib/supabase/server"
import { AdminPlayersClient } from '@/components/admin/AdminPlayersClient'

export default async function AdminPlayersPage() {
  const supabase = createServiceClient()
  const { data: players }     = await supabase.from('players').select('*, tournament:tournaments(name, slug)').order('name')
  const { data: tournaments } = await supabase.from('tournaments').select('*').order('name')

  return <AdminPlayersClient players={players || []} tournaments={tournaments || []} />
}
