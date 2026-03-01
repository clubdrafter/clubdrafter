import Link from 'next/link'
import { Mail } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col items-center gap-5 text-center py-4 animate-fade-in-up">
      <div className="w-14 h-14 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center">
        <Mail size={24} className="text-green-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-[#f0f4ff]">Check your inbox</h2>
        <p className="text-sm text-[#8892aa] mt-2 max-w-xs">
          We sent you a verification link. Click it to activate your account and get started.
        </p>
      </div>
      <p className="text-xs text-[#5a6478]">Didn't receive it? Check your spam folder.</p>
      <Link href="/login" className="text-sm text-[#4f7cff] hover:underline">Back to sign in</Link>
    </div>
  )
}
