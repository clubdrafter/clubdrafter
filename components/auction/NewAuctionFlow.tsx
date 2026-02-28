'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Info, Users, Gavel, Star, Calendar, Send, CheckCircle, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/shared/Toaster'
import { DEFAULT_RULES } from '@/lib/auction-logic'
import type { Tournament, AuctionRules } from '@/types'

type Step = 'name' | 'intro' | 'rules' | 'invite'

interface Props { tournaments: Tournament[] }

export function NewAuctionFlow({ tournaments }: Props) {
  const router = useRouter()

  const [step, setStep]           = useState<Step>('name')
  const [leagueName, setLeagueName] = useState('')
  const [tournament, setTournament] = useState<Tournament | null>(tournaments[0] || null)
  const [rules, setRules]           = useState<AuctionRules>({ ...DEFAULT_RULES })
  const [startDate, setStartDate]   = useState('')
  const [startTime, setStartTime]   = useState('')
  const [inviteInputs, setInviteInputs] = useState<string[]>([''])
  const [loading, setLoading]       = useState(false)

  function setRule<K extends keyof AuctionRules>(key: K, value: AuctionRules[K]) {
    setRules(r => ({ ...r, [key]: value }))
  }

  function RuleRow({ label, value, note }: { label: string; value: string | number; note?: string }) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-[#2a3347] last:border-0">
        <span className="text-sm text-[#8892aa]">{label}</span>
        <div className="text-right">
          <span className="text-sm font-medium text-[#f0f4ff]">{value}</span>
          {note && <p className="text-xs text-[#5a6478]">{note}</p>}
        </div>
      </div>
    )
  }

  async function handleCreate() {
    const startDateTime = startDate && startTime ? new Date(`${startDate}T${startTime}`).toISOString() : null
    setLoading(true)

    const res = await fetch('/api/auctions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournament_id: tournament!.id,
        league_name: leagueName.trim(),
        status: 'upcoming',
        start_time: startDateTime,
        rules,
      }),
    })

    if (!res.ok) {
      toast.error('Could not create auction')
      setLoading(false)
      return
    }

    const { auctionId } = await res.json()

    // Send invites
    const emails = inviteInputs.filter(e => e.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()))
    if (emails.length) {
      await fetch('/api/auctions/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId, emails }),
      })
    }

    setLoading(false)
    toast.success('Auction created!')
    router.push(`/auction/${auctionId}/league`)
  }

  // ── Step: League Name
  if (step === 'name') {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto animate-fade-in-up">
        <StepIndicator current={0} total={4} />
        <div>
          <h1 className="text-2xl font-bold text-[#f0f4ff]">Name your league</h1>
          <p className="text-sm text-[#8892aa] mt-1">
            Congratulations! You have been selected by BCCI to manage the{' '}
            <span className="text-[#4f7cff]">{leagueName || '______'}</span>.
          </p>
        </div>

        <Input
          label="League Name"
          value={leagueName}
          onChange={e => setLeagueName(e.target.value)}
          placeholder="e.g. Bhai Log IPL League"
          autoFocus
        />

        {tournaments.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8892aa]">Tournament</label>
            <div className="grid grid-cols-2 gap-2">
              {tournaments.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTournament(t)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                    tournament?.id === t.id
                      ? 'border-[#4f7cff] bg-[#4f7cff]/10 text-[#4f7cff]'
                      : 'border-[#2a3347] bg-[#1e2535] text-[#8892aa] hover:border-[#3a4560]'
                  }`}
                >
                  {t.name} {t.season || ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}><ArrowLeft size={16} /> Back</Button>
          <Button fullWidth disabled={!leagueName.trim()} onClick={() => setStep('intro')}>
            Continue <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: Game Intro
  if (step === 'intro') {
    const phases = [
      { title: 'Pre-Auction Phase',          desc: 'Invite friends, configure rules, and schedule your auction date and time.' },
      { title: 'Auction Phase',              desc: 'Players appear randomly. Bid live using your ₹100 Cr wallet. 30s to place the first bid, 8s per bid after that.' },
      { title: 'League Phase',               desc: 'Track your team\'s performance match by match. Points update automatically after each IPL match.' },
      { title: 'Final Results',              desc: 'Once the season ends, see the full leaderboard and your team\'s final score.' },
    ]
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto animate-fade-in-up">
        <StepIndicator current={1} total={4} />
        <div>
          <h1 className="text-2xl font-bold text-[#f0f4ff]">How it works</h1>
          <p className="text-sm text-[#8892aa] mt-1">Here's what happens during your league.</p>
        </div>

        <div className="flex flex-col gap-3">
          {phases.map((p, i) => (
            <div key={p.title} className="card-glow p-4 flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4f7cff]/15 text-[#4f7cff] text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-[#f0f4ff]">{p.title}</p>
                <p className="text-xs text-[#8892aa] mt-0.5 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStep('name')}><ArrowLeft size={16} /> Back</Button>
          <Button fullWidth onClick={() => setStep('rules')}>Configure Rules <ArrowRight size={16} /></Button>
        </div>
      </div>
    )
  }

  // ── Step: Rules
  if (step === 'rules') {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto animate-fade-in-up">
        <StepIndicator current={2} total={4} />
        <div>
          <h1 className="text-2xl font-bold text-[#f0f4ff]">Configure rules</h1>
          <p className="text-sm text-[#8892aa] mt-1">Review and adjust auction rules for your league.</p>
        </div>

        {/* Teams */}
        <Card>
          <h3 className="font-semibold text-[#f0f4ff] flex items-center gap-2 mb-3"><Users size={16} className="text-[#4f7cff]" /> Teams</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8892aa]">Number of teams</p>
                <p className="text-xs text-[#5a6478]">Min 3, max 9</p>
              </div>
              <input
                type="number" min={3} max={9}
                value={rules.num_teams}
                onChange={e => setRule('num_teams', Math.min(9, Math.max(3, parseInt(e.target.value) || 3)))}
                className="w-16 text-center rounded-lg bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] py-1.5 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8892aa]">Max squad size</p>
                <p className="text-xs text-[#5a6478]">Players per team</p>
              </div>
              <input
                type="number" min={11} max={25}
                value={rules.squad_size}
                onChange={e => setRule('squad_size', Math.min(25, Math.max(11, parseInt(e.target.value) || 11)))}
                className="w-16 text-center rounded-lg bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] py-1.5 text-sm"
              />
            </div>
            <RuleRow label="Starting wallet"         value="₹100 Cr per team" />
            <RuleRow label="Team composition (min)"   value="1 WK · 3 BAT · 3 BOWL · 1 AR" note="Fixed rule" />
            <RuleRow label="Foreign players (max)"    value={`${rules.max_foreign}`} note="Fixed rule" />
            <RuleRow label="Captain + Vice Captain"   value="Required at all times" note="Fixed rule" />
          </div>
        </Card>

        {/* Auction & Bidding */}
        <Card>
          <h3 className="font-semibold text-[#f0f4ff] flex items-center gap-2 mb-3"><Gavel size={16} className="text-[#4f7cff]" /> Auction & Bidding</h3>
          <div className="flex flex-col gap-0.5">
            <RuleRow label="Player order"          value="Random draw"           note="Fixed rule" />
            <RuleRow label="Bidder per team"        value="One designated bidder" note="Fixed rule" />
            <RuleRow label="Bid increments"         value="Multiples of ₹0.10 Cr" note="Min ₹0.10 Cr" />
            <RuleRow label="No-bid timer"           value="30 seconds"            note="Player marked unsold" />
            <RuleRow label="Bid timer"              value="8 seconds"             note="Resets on each bid" />
            <RuleRow label="Round 2 min bid"        value="₹0.20 Cr"              note="Fixed rule" />
            <RuleRow label="Round 3 min bid"        value="₹0.30 Cr"              note="Fixed rule" />
            <RuleRow label="Auto-allocation"        value="Players auto-assigned if min not met" note="Fixed rule" />
          </div>
        </Card>

        {/* Points System */}
        <Card>
          <h3 className="font-semibold text-[#f0f4ff] flex items-center gap-2 mb-3"><Star size={16} className="text-[#4f7cff]" /> Points System</h3>
          <div className="flex flex-col gap-0.5">
            <RuleRow label="1 run"             value="1 point"        />
            <RuleRow label="1 wicket"          value="25 points"      />
            <RuleRow label="Catch / Stump / Run out" value="8 points" />
            <RuleRow label="Captain"           value="2× points"      />
            <RuleRow label="Vice Captain"      value="1.5× points"    />
            <RuleRow label="Top XI scoring"    value="Only top 11 count" note="Fixed rule" />
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm text-[#8892aa]">Max Captain/VC changes</p>
                <p className="text-xs text-[#5a6478]">Per team, before toss</p>
              </div>
              <input
                type="number" min={0} max={10}
                value={rules.max_captain_changes}
                onChange={e => setRule('max_captain_changes', Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-16 text-center rounded-lg bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] py-1.5 text-sm"
              />
            </div>
          </div>
        </Card>

        {/* Auction Schedule */}
        <Card>
          <h3 className="font-semibold text-[#f0f4ff] flex items-center gap-2 mb-3"><Calendar size={16} className="text-[#4f7cff]" /> Auction Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8892aa]">Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] px-3 py-2 text-sm focus:border-[#4f7cff] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8892aa]">Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] px-3 py-2 text-sm focus:border-[#4f7cff] transition-colors"
              />
            </div>
          </div>
          {!startDate && <p className="text-xs text-yellow-400/70 mt-2 flex items-center gap-1"><Info size={11} /> No date set — auction can be started manually from the league page</p>}
        </Card>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStep('intro')}><ArrowLeft size={16} /> Back</Button>
          <Button fullWidth onClick={() => setStep('invite')}>Invite Friends <ArrowRight size={16} /></Button>
        </div>
      </div>
    )
  }

  // ── Step: Invite
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto animate-fade-in-up">
      <StepIndicator current={3} total={4} />
      <div>
        <h1 className="text-2xl font-bold text-[#f0f4ff]">Invite friends</h1>
        <p className="text-sm text-[#8892aa] mt-1">Enter email addresses of players to invite. You can add more later.</p>
      </div>

      <div className="flex flex-col gap-2">
        {inviteInputs.map((val, i) => (
          <div key={i} className="flex gap-2">
            <Input
              type="email"
              value={val}
              onChange={e => {
                const next = [...inviteInputs]
                next[i] = e.target.value
                setInviteInputs(next)
              }}
              placeholder="friend@example.com"
              className="flex-1"
            />
            {inviteInputs.length > 1 && (
              <button
                onClick={() => setInviteInputs(prev => prev.filter((_, j) => j !== i))}
                className="text-[#5a6478] hover:text-red-400 transition-colors p-2"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        {inviteInputs.length < rules.num_teams - 1 && (
          <button
            onClick={() => setInviteInputs(prev => [...prev, ''])}
            className="flex items-center gap-2 text-sm text-[#4f7cff] hover:underline mt-1"
          >
            <Plus size={14} /> Add another
          </button>
        )}
      </div>

      <div className="card-glow p-4 bg-[#1e2535]/50">
        <p className="text-xs text-[#8892aa] leading-relaxed">
          <strong className="text-[#f0f4ff]">Summary:</strong> <span className="text-[#4f7cff]">{leagueName}</span> · {tournament?.name} ·{' '}
          {rules.num_teams} teams · ₹{rules.wallet_cr} Cr wallet ·{' '}
          {startDate && startTime ? `Starts ${startDate} at ${startTime}` : 'No start time set'}
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setStep('rules')}><ArrowLeft size={16} /> Back</Button>
        <Button fullWidth loading={loading} onClick={handleCreate}>
          <Send size={16} /> Create & Send Invites
        </Button>
      </div>
    </div>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ['Name', 'Intro', 'Rules', 'Invite']
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            i < current ? 'bg-[#4f7cff] text-white' :
            i === current ? 'bg-[#4f7cff]/20 border border-[#4f7cff] text-[#4f7cff]' :
            'bg-[#1e2535] border border-[#2a3347] text-[#5a6478]'
          }`}>
            {i < current ? <CheckCircle size={12} /> : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i === current ? 'text-[#f0f4ff]' : 'text-[#5a6478]'}`}>{labels[i]}</span>
          {i < total - 1 && <div className={`flex-1 h-px w-6 ${i < current ? 'bg-[#4f7cff]' : 'bg-[#2a3347]'}`} />}
        </div>
      ))}
    </div>
  )
}
