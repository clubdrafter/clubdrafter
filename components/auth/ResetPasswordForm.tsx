'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/shared/Toaster'

export function ResetPasswordForm() {
  const router  = useRouter()
  const supabase = createClient()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const rules = [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { met: /[0-9]/.test(password), label: 'One number' },
  ]
  const passwordValid = rules.every(r => r.met)
  const matches = password === confirm && confirm.length > 0

  async function handleSave() {
    if (!passwordValid) { setError('Password does not meet requirements'); return }
    if (!matches) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    toast.success('Password updated successfully!')
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-[#f0f4ff]">Set new password</h2>
        <p className="text-sm text-[#8892aa] mt-1">Choose a strong password for your account.</p>
      </div>

      {/* New password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#8892aa]">New Password</label>
        <div className="relative flex items-center">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="New password"
            className="w-full rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] placeholder:text-[#5a6478] px-4 pr-10 py-2.5 text-sm h-11 focus:border-[#4f7cff] transition-colors"
          />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 text-[#5a6478] hover:text-[#8892aa]">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          {rules.map(r => (
            <span key={r.label} className={`text-xs flex items-center gap-1.5 ${r.met ? 'text-green-400' : 'text-[#5a6478]'}`}>
              {r.met ? <CheckCircle size={11} /> : <XCircle size={11} />} {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Confirm password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#8892aa]">Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setError('') }}
          placeholder="Repeat password"
          className="w-full rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] placeholder:text-[#5a6478] px-4 py-2.5 text-sm h-11 focus:border-[#4f7cff] transition-colors"
        />
        {confirm.length > 0 && (
          <span className={`text-xs flex items-center gap-1.5 ${matches ? 'text-green-400' : 'text-red-400'}`}>
            {matches ? <CheckCircle size={11} /> : <XCircle size={11} />}
            {matches ? 'Passwords match' : 'Passwords do not match'}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button fullWidth loading={loading} onClick={handleSave} disabled={!passwordValid || !matches}>
        Save password
      </Button>
    </div>
  )
}
