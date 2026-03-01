'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Mail, User, CheckCircle, XCircle, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  initialEmail?: string
  auctionId?: string
}

export function SignupForm({ initialEmail, auctionId }: Props = {}) {
  // Anon client used only for username availability check (SELECT on user_profiles)
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername]       = useState('')
  const [email, setEmail]             = useState(initialEmail ?? '')
  const [password, setPassword]       = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed]           = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [done, setDone]               = useState(false)

  const isValidEmail  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
  const passwordMatch = password === confirmPw && confirmPw.length > 0

  const pwRules = [
    { met: password.length >= 8, label: '8+ characters' },
    { met: /[A-Z]/.test(password),  label: 'Uppercase' },
    { met: /[0-9]/.test(password),  label: 'Number' },
  ]

  // Username availability check (debounced)
  useEffect(() => {
    if (username.length < 3) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    const id = setTimeout(async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
    return () => clearTimeout(id)
  }, [username, supabase])

  const canSubmit =
    displayName.trim().length >= 2 &&
    username.length >= 3 &&
    usernameStatus === 'available' &&
    isValidEmail &&
    passwordValid &&
    passwordMatch &&
    agreed

  async function handleSignup() {
    if (!canSubmit) return
    setLoading(true); setError('')

    // Server-side route uses the service role key to guarantee the profile row
    // is created even if the database trigger fails due to RLS or a constraint issue.
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        username: username.toLowerCase(),
        display_name: displayName.trim(),
        ...(auctionId ? { auction_id: auctionId } : {}),
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Something went wrong. Please try again.')
      return
    }
    setDone(true)
  }

  // ── Success screen
  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 text-center animate-fade-in-up py-4">
        <div className="w-14 h-14 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center">
          <Mail size={24} className="text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0f4ff]">Check your inbox</h2>
          <p className="text-sm text-[#8892aa] mt-2 max-w-xs">
            We sent a verification link to{' '}
            <strong className="text-[#f0f4ff]">{email}</strong>.{' '}
            Click it to activate your account.
          </p>
        </div>
        <p className="text-xs text-[#5a6478]">Didn't receive it? Check your spam folder.</p>
        <Link href="/login" className="text-sm text-[#4f7cff] hover:underline">Back to sign in</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-[#f0f4ff]">Create account</h2>
        <p className="text-sm text-[#8892aa] mt-1">Join Clubdrafter and start drafting.</p>
      </div>

      {/* Full Name */}
      <Input
        label="Full Name"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        placeholder="Your name shown in the app"
        prefix={<User size={15} />}
        autoFocus
      />

      {/* Username */}
      <div className="flex flex-col gap-1">
        <Input
          label="Username"
          value={username}
          onChange={e => { setUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase()); setError('') }}
          placeholder="e.g. virat_fan"
          prefix={<span className="text-[#5a6478] text-sm">@</span>}
          hint="Letters, numbers, underscores. Min 3 chars."
        />
        {usernameStatus === 'available' && username.length >= 3 && (
          <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Available</span>
        )}
        {usernameStatus === 'taken' && (
          <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} /> Username taken</span>
        )}
        {usernameStatus === 'checking' && (
          <span className="text-xs text-[#5a6478]">Checking…</span>
        )}
      </div>

      {/* Email */}
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        placeholder="you@example.com"
        prefix={<Mail size={15} />}
      />

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#8892aa]">Password</label>
        <div className="relative flex items-center">
          <Lock size={15} className="absolute left-3 text-[#5a6478]" />
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Create a strong password"
            className="w-full rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] placeholder:text-[#5a6478] pl-9 pr-10 py-2.5 text-sm h-11 focus:border-[#4f7cff] transition-colors outline-none"
          />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 text-[#5a6478] hover:text-[#8892aa]">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="flex gap-3 mt-0.5">
            {pwRules.map(r => (
              <span key={r.label} className={`text-xs flex items-center gap-1 ${r.met ? 'text-green-400' : 'text-[#5a6478]'}`}>
                {r.met ? <CheckCircle size={10} /> : <XCircle size={10} />} {r.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#8892aa]">Confirm Password</label>
        <div className="relative flex items-center">
          <Lock size={15} className="absolute left-3 text-[#5a6478]" />
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            placeholder="Repeat your password"
            className="w-full rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] placeholder:text-[#5a6478] pl-9 pr-10 py-2.5 text-sm h-11 focus:border-[#4f7cff] transition-colors outline-none"
          />
          <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 text-[#5a6478] hover:text-[#8892aa]">
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirmPw.length > 0 && !passwordMatch && (
          <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={10} /> Passwords don't match</span>
        )}
        {confirmPw.length > 0 && passwordMatch && (
          <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={10} /> Passwords match</span>
        )}
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 rounded accent-[#4f7cff]"
        />
        <span className="text-sm text-[#8892aa]">
          I agree to the{' '}
          <span className="text-[#4f7cff] hover:underline cursor-pointer">Terms of Service</span>
          {' '}and{' '}
          <span className="text-[#4f7cff] hover:underline cursor-pointer">Privacy Policy</span>
        </span>
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button fullWidth loading={loading} onClick={handleSignup} disabled={!canSubmit}>
        Create account
      </Button>

      <p className="text-sm text-[#5a6478] text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-[#4f7cff] hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
