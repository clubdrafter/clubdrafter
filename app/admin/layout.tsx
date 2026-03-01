import Link from 'next/link'
import { Shield, Users, UserCircle, Trophy, BarChart3 } from 'lucide-react'
import { AdminLogout } from '@/components/admin/AdminLogout'

export const dynamic = 'force-dynamic'

const navItems = [
  { href: '/admin',             label: 'Overview',    icon: <BarChart3 size={15} /> },
  { href: '/admin/players',     label: 'Players',     icon: <UserCircle size={15} /> },
  { href: '/admin/tournaments', label: 'Tournaments', icon: <Trophy size={15} /> },
  { href: '/admin/users',       label: 'Users',       icon: <Users size={15} /> },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <header className="bg-[#161b27] border-b border-[#2a3347] px-5 py-3 flex items-center gap-3">
        <Shield size={18} className="text-[#4f7cff]" />
        <span className="font-bold text-[#f0f4ff]">Clubdrafter Admin</span>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-xs text-[#5a6478] hover:text-[#4f7cff] transition-colors">
            ← Back to app
          </Link>
          <AdminLogout />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 bg-[#161b27] border-r border-[#2a3347] p-3 flex flex-col gap-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#8892aa] hover:text-[#f0f4ff] hover:bg-[#1e2535] transition-colors"
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
