'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, User, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/shared/Toaster'

type Step = 'email' | 'otp' | 'profile'

const OTP_LENGTH = 4

export function SignupForm() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]               = useState<Step>('email')
  const [email, setEmail]             = useState('')
  const [otp, setOtp]                 = useState(['', '', '', ''])
  const [password, setPassword]       = useState('')
  const [username, setUsername]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [agreed, setAgreed]           = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)

  // Resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

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

  async function handleSendOtp() {
    if (!isValidEmail) { setError('Enter a valid email address'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('otp')
    setResendCooldown(60)
    otpRefs.current[0]?.focus()
  }

  async function handleVerifyOtp() {
    const code = otp.join('')
    if (code.length < OTP_LENGTH) { setError('Enter the full code'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setLoading(false)
    if (err) { setError('Incorrect or expired code'); return }
    setStep('profile')
  }

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    setError('')
    if (val && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus()
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'Enter' && otp.join('').length === OTP_LENGTH) handleVerifyOtp()
  }

  async function handleCreateAccount() {
    if (!username || !displayName || !passwordValid || !agreed) return
    if (usernameStatus !== 'available') { setError('Choose an available username'); return }
    setLoading(true); setError('')

    // Update user password and metadata
    const { error: pwErr } = await supabase.auth.updateUser({
      password,
      data: {
        username: username.toLowerCase(),
        display_name: displayName,
      },
    })
    if (pwErr) { setLoading(false); setError(pwErr.message); return }

    // Upsert profile (trigger may have already created it)
    await supabase.from('user_profiles').upsert({
      id: (await supabase.auth.getUser()).data.user?.id,
      email,
      username: username.toLowerCase(),
      display_name: displayName,
    })

    setLoading(false)
    toast.success('Account created! Welcome to Clubdrafter.')
    router.push('/dashboard')
    router.refresh()
  }

  // ── OTP step
  if (step === 'otp') {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-[#f0f4ff]">Check your email</h2>
          <p className="text-sm text-[#8892aa] mt-1">
            We sent a 4-digit code to <strong className="text-[#f0f4ff]">{email}</strong>.{' '}
            <button onClick={() => setStep('email')} className="text-[#4f7cff] hover:underline">Change</button>
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { otpRefs.current[i] = el }}
              className="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleOtpKeyDown(i, e)}
            />
          ))}
        </div>
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <Button fullWidth loading={loading} onClick={handleVerifyOtp} disabled={otp.join('').length < OTP_LENGTH}>
          Verify
        </Button>

        <div className="text-center">
          {resendCooldown > 0 ? (
            <p className="text-xs text-[#5a6478]">Resend in {resendCooldown}s</p>
          ) : (
            <button onClick={handleSendOtp} className="text-xs text-[#4f7cff] hover:underline">
              Resend code
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Profile step
  if (step === 'profile') {
    const pwRules = [
      { met: password.length >= 8, label: 'At least 8 characters' },
      { met: /[A-Z]/.test(password), label: 'One uppercase letter' },
      { met: /[0-9]/.test(password), label: 'One number' },
    ]
    const canCreate = username.length >= 3 && displayName.length >= 2 && passwordValid && agreed && usernameStatus === 'available'

    return (
      <div className="flex flex-col gap-5 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-[#f0f4ff]">Create your account</h2>
          <p className="text-sm text-[#8892aa] mt-1">Almost there — set up your profile.</p>
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <Input
            label="Username"
            value={username}
            onChange={e => { setUsername(e.target.value.replace(/[^a-z0-9_]/gi, '')); setError('') }}
            placeholder="e.g. virat_fan"
            prefix={<User size={15} />}
            hint="Letters, numbers, underscores. Min 3 chars."
          />
          {usernameStatus === 'available' && username.length >= 3 && (
            <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Available</span>
          )}
          {usernameStatus === 'taken' && (
            <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} /> Username taken</span>
          )}
        </div>

        <Input
          label="Display Name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Your name shown in the app"
        />

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#8892aa]">Password</label>
          <div className="relative flex items-center">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] placeholder:text-[#5a6478] px-4 pr-10 py-2.5 text-sm h-11 focus:border-[#4f7cff] transition-colors"
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 text-[#5a6478] hover:text-[#8892aa]">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 mt-1">
            {pwRules.map(r => (
              <span key={r.label} className={`text-xs flex items-center gap-1 ${r.met ? 'text-green-400' : 'text-[#5a6478]'}`}>
                {r.met ? <CheckCircle size={10} /> : <XCircle size={10} />} {r.label}
              </span>
            ))}
          </div>
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
            <span className="text-[#4f7cff] cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#4f7cff] cursor-pointer hover:underline">Privacy Policy</span>
          </span>
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button fullWidth loading={loading} onClick={handleCreateAccount} disabled={!canCreate}>
          Create account
        </Button>
      </div>
    )
  }

  // ── Email step
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-[#f0f4ff]">Create account</h2>
        <p className="text-sm text-[#8892aa] mt-1">Enter your email to get started.</p>
      </div>

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSendOtp() }}
        error={error}
        placeholder="you@example.com"
        prefix={<Mail size={15} />}
        autoFocus
      />

      <Button fullWidth loading={loading} onClick={handleSendOtp} disabled={!isValidEmail}>
        Send verification code
      </Button>

      <p className="text-sm text-[#5a6478] text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-[#4f7cff] hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
