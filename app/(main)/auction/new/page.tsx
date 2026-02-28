import { NewAuctionFlow } from '@/components/auction/NewAuctionFlow'
import { createClient } from '@/lib/supabase/server'

export default async function NewAuctionPage() {
  const supabase = await createClient()
  const { data: tournaments } = await supabase.from('tournaments').select('*').order('created_at')
  return <NewAuctionFlow tournaments={tournaments || []} />
}
