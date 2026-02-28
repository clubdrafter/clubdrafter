'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/shared/Toaster'

type Step = 'email' | 'password' | 'forgot'

export function LoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]         = useState<Step>('email')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleEmailContinue() {
    if (!isValidEmail) { setError('Enter a valid email address'); return }
    setLoading(true); setError('')
    // Check if user exists by attempting to sign in with a dummy password
    // We can't enumerate users directly — just move to password step
    setLoading(false)
    setStep('password')
  }

  async function handleLogin() {
    if (!password) { setError('Enter your password'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError('Incorrect email or password')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgotPassword() {
    if (!isValidEmail) { setError('Enter a valid email address'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { toast.error('Could not send reset email. Try again.'); return }
    setResetSent(true)
  }

  // ── Forgot password screen
  if (step === 'forgot') {
    if (resetSent) {
      return (
        <div className="text-center animate-fade-in-up flex flex-col gap-4">
          <div className="w-12 h-12 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center mx-auto">
            <Mail size={20} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-[#f0f4ff]">Check your email</h2>
          <p className="text-sm text-[#8892aa]">We sent a password reset link to <strong className="text-[#f0f4ff]">{email}</strong></p>
          <Button variant="secondary" fullWidth onClick={() => { setStep('password'); setResetSent(false) }}>
            Back to sign in
          </Button>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-[#f0f4ff]">Reset password</h2>
          <p className="text-sm text-[#8892aa] mt-1">We'll send a reset link to your email.</p>
        </div>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          error={error}
          placeholder="you@example.com"
          prefix={<Mail size={15} />}
          autoFocus
        />
        <div className="flex flex-col gap-2">
          <Button fullWidth loading={loading} onClick={handleForgotPassword} disabled={!isValidEmail}>
            Send reset link
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setStep('password')}>
            Back
          </Button>
        </div>
      </div>
    )
  }

  // ── Password step
  if (step === 'password') {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-[#f0f4ff]">Welcome back</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-[#8892aa]">{email}</span>
            <button onClick={() => { setStep('email'); setError('') }} className="text-xs text-[#4f7cff] hover:underline">Change</button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#8892aa]">Password</label>
          <div className="relative flex items-center">
            <Lock size={15} className="absolute left-3 text-[#5a6478]" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
              placeholder="Your password"
              autoFocus
              className="w-full rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] placeholder:text-[#5a6478] pl-9 pr-10 py-2.5 text-sm h-11 focus:border-[#4f7cff] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 text-[#5a6478] hover:text-[#8892aa] transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Button fullWidth loading={loading} onClick={handleLogin} disabled={!password}>
            Log in
          </Button>
          <button onClick={() => setStep('forgot')} className="text-sm text-[#4f7cff] hover:underline text-center mt-1">
            Forgot password?
          </button>
        </div>

        <p className="text-sm text-[#5a6478] text-center">
          No account?{' '}
          <Link href="/signup" className="text-[#4f7cff] hover:underline">Sign up</Link>
        </p>
      </div>
    )
  }

  // ── Email step
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-[#f0f4ff]">Sign in</h2>
        <p className="text-sm text-[#8892aa] mt-1">Enter your email to continue.</p>
      </div>

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleEmailContinue() }}
        error={error}
        placeholder="you@example.com"
        prefix={<Mail size={15} />}
        autoFocus
      />

      <Button fullWidth loading={loading} onClick={handleEmailContinue} disabled={!isValidEmail}>
        Continue
      </Button>

      <p className="text-sm text-[#5a6478] text-center">
        New here?{' '}
        <Link href="/signup" className="text-[#4f7cff] hover:underline">Create an account</Link>
      </p>
    </div>
  )
}
