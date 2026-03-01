'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function AdminLogout() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-xs text-[#5a6478] hover:text-red-400 transition-colors"
    >
      <LogOut size={13} /> Sign out
    </button>
  )
}
