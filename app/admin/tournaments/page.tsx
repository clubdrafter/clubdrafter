import { createServiceClient } from "@/lib/supabase/server"
import { AdminTournamentsClient } from '@/components/admin/AdminTournamentsClient'

export default async function AdminTournamentsPage() {
  const supabase = createServiceClient()
  const { data: tournaments } = await supabase.from('tournaments').select('*').order('created_at')
  return <AdminTournamentsClient tournaments={tournaments || []} />
}
