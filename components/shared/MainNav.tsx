'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trophy, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

export function MainNav({ profile }: { profile: UserProfile | null }) {
  const router  = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-[#0f1117]/95 backdrop-blur border-b border-[#2a3347]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4f7cff] flex items-center justify-center shadow-[0_0_12px_rgba(79,124,255,0.35)]">
            <Trophy size={14} className="text-white" />
          </div>
          <span className="text-[#f0f4ff] font-bold tracking-tight">Clubdrafter</span>
        </Link>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[#1e2535] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#252d3d] border border-[#2a3347] flex items-center justify-center">
              <User size={14} className="text-[#8892aa]" />
            </div>
            <span className="text-sm text-[#f0f4ff] hidden sm:block">{profile?.display_name || 'Account'}</span>
            <ChevronDown size={14} className={`text-[#5a6478] transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#161b27] border border-[#2a3347] rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in">
                <div className="px-3 py-2.5 border-b border-[#2a3347]">
                  <p className="text-sm font-medium text-[#f0f4ff]">{profile?.display_name}</p>
                  <p className="text-xs text-[#5a6478]">@{profile?.username}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#8892aa] hover:text-[#f0f4ff] hover:bg-[#1e2535] transition-colors"
                  >
                    <Settings size={14} /> Account settings
                  </button>
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
