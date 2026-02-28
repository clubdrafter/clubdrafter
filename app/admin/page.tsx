import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [{ count: userCount }, { count: playerCount }, { count: auctionCount }] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('auctions').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Total Users',    value: userCount || 0,   href: '/admin/users',    color: 'text-blue-400' },
    { label: 'Total Players',  value: playerCount || 0, href: '/admin/players',  color: 'text-green-400' },
    { label: 'Total Auctions', value: auctionCount || 0, href: '/admin/tournaments', color: 'text-purple-400' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[#f0f4ff]">Admin Overview</h1>
        <p className="text-sm text-[#8892aa] mt-1">Platform statistics and management</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="card-glow p-5 hover:border-[#3a4560] transition-colors">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-sm text-[#8892aa] mt-1">{s.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
