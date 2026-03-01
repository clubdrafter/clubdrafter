'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin() {
    if (!username || !password) { setError('Enter credentials'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      setLoading(false)
      setError('Invalid username or password')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="card-glow p-8 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-[#4f7cff]/10 border border-[#4f7cff]/20 flex items-center justify-center">
              <Shield size={22} className="text-[#4f7cff]" />
            </div>
            <h1 className="text-xl font-bold text-[#f0f4ff]">Admin Access</h1>
            <p className="text-sm text-[#5a6478]">Clubdrafter internal panel</p>
          </div>

          <div className="flex flex-col gap-4">
            <Input
              label="Username"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleLogin() }}
              placeholder="admin"
              autoFocus
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8892aa]">Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] placeholder:text-[#5a6478] px-4 pr-10 py-2.5 text-sm h-11 focus:border-[#4f7cff] transition-colors outline-none"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 text-[#5a6478] hover:text-[#8892aa]">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <Button fullWidth loading={loading} onClick={handleLogin} disabled={!username || !password}>
              Sign in to Admin
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
