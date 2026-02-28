import Link from 'next/link'
import { Trophy } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#4f7cff] opacity-[0.05] blur-[100px]" />
      </div>

      {/* Logo bar */}
      <div className="relative z-10 px-5 py-4 flex justify-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4f7cff] flex items-center justify-center">
            <Trophy size={14} className="text-white" />
          </div>
          <span className="text-[#f0f4ff] font-bold tracking-tight">Clubdrafter</span>
        </Link>
      </div>

      {/* Page content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
