import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Trophy, Users, Zap, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0f1117] overflow-hidden relative flex flex-col items-center">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[#4f7cff] opacity-[0.06] blur-[120px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[400px] rounded-full bg-[#a855f7] opacity-[0.05] blur-[100px]" />
        <div className="absolute top-[40%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#22c55e] opacity-[0.04] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#4f7cff 1px, transparent 1px), linear-gradient(90deg, #4f7cff 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Nav */}
      <nav className="relative z-10 w-full max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4f7cff] flex items-center justify-center shadow-[0_0_20px_rgba(79,124,255,0.4)]">
            <Trophy size={16} className="text-white" />
          </div>
          <span className="text-[#f0f4ff] font-bold text-lg tracking-tight">Clubdrafter</span>
        </div>
        <Link href="/login">
          <Button variant="secondary" size="sm">Sign in</Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4f7cff]/10 border border-[#4f7cff]/20 mb-6 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-[#4f7cff]">IPL Fantasy Auction — Season 2025</span>
        </div>

        <h1 className="animate-fade-in-up text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#f0f4ff] leading-tight tracking-tight max-w-3xl">
          Build your dream team.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4f7cff] to-[#a855f7]">
            Win the league.
          </span>
        </h1>

        <p className="animate-fade-in-up animate-delay-100 mt-5 text-[#8892aa] text-base sm:text-lg max-w-xl leading-relaxed">
          Host a live IPL fantasy auction with your friends. Bid on real players,
          build your squad, and compete across the full tournament.
        </p>

        <div className="animate-fade-in-up animate-delay-200 mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="min-w-[180px]">
              Start Playing Free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg" className="min-w-[140px]">
              Log in
            </Button>
          </Link>
        </div>

        <div className="animate-fade-in-up animate-delay-300 mt-12 flex flex-wrap justify-center gap-3">
          {[
            { icon: <Zap size={14} />,    text: 'Live real-time auction' },
            { icon: <Users size={14} />,  text: 'Up to 9 teams' },
            { icon: <Star size={14} />,   text: '₹100 Cr wallet per team' },
            { icon: <Trophy size={14} />, text: 'Full IPL season scoring' },
          ].map(f => (
            <span key={f.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161b27] border border-[#2a3347] text-xs text-[#8892aa]">
              <span className="text-[#4f7cff]">{f.icon}</span>
              {f.text}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-5 pb-20">
        <h2 className="text-center text-xl font-bold text-[#f0f4ff] mb-8">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { n: '01', title: 'Create a league',  desc: 'Set up your auction rules, invite up to 9 friends, and schedule the event.' },
            { n: '02', title: 'Bid live',          desc: 'Players appear randomly. Bid fast — you have 8 seconds after each bid.' },
            { n: '03', title: 'Track & compete',   desc: 'Points update after every match. Climb the leaderboard all season long.' },
          ].map((step, i) => (
            <div key={step.n} className={`card-glow p-5 flex flex-col gap-3 animate-fade-in-up`} style={{ animationDelay: `${(i + 1) * 100}ms` }}>
              <span className="text-3xl font-black text-[#4f7cff]/20">{step.n}</span>
              <h3 className="font-semibold text-[#f0f4ff]">{step.title}</h3>
              <p className="text-sm text-[#8892aa] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 w-full border-t border-[#2a3347] py-6 px-5 text-center text-xs text-[#5a6478]">
        © {new Date().getFullYear()} Clubdrafter. All rights reserved.
      </footer>
    </main>
  )
}
