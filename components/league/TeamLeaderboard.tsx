'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Users, Crown, Star, Target, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/shared/Toaster'
import { formatCr, getRoleColor, getRoleLabel, cn } from '@/lib/utils'
import type { Auction, AuctionParticipant, AuctionPlayer, Player } from '@/types'

type ParticipantRow = AuctionParticipant & { user: { display_name: string; username: string } }
type AuctionPlayerRow = AuctionPlayer & { player: Player }

interface Props {
  auction: Auction
  allParticipants: ParticipantRow[]
  auctionPlayers: AuctionPlayerRow[]
  pointsMap: Record<string, number>
  myParticipationId: string
  myCaptainId: string | null
  myVcId: string | null
  captainChangeCount: number
  userId: string
}

const TABS = [
  { id: 'score',  label: 'Score',   icon: <Trophy size={14} /> },
  { id: 'teams',  label: 'Teams',   icon: <Users size={14} /> },
  { id: 'cvc',    label: 'C/VC',    icon: <Crown size={14} /> },
  { id: 'quota',  label: 'Quota',   icon: <Target size={14} /> },
]

export function TeamLeaderboard({ auction, allParticipants, auctionPlayers, pointsMap, myParticipationId, myCaptainId, myVcId, captainChangeCount, userId }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState('score')

  // C/VC selection state
  const [captainId, setCaptainId]       = useState<string | null>(myCaptainId)
  const [vcId, setVcId]                 = useState<string | null>(myVcId)
  const [editMode, setEditMode]         = useState(!myCaptainId)
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [saving, setSaving]             = useState(false)

  const rules = auction.rules
  const maxChanges = rules?.max_captain_changes ?? 3
  const changeLimitReached = captainChangeCount >= maxChanges

  const hasUnsavedChanges = captainId !== myCaptainId || vcId !== myVcId

  function getPlayerPoints(playerId: string): number {
    return pointsMap[playerId] || 0
  }

  function getTeamScore(participantId: string): number {
    const roster = auctionPlayers.filter(ap => ap.owner_participant_id === participantId)
    return roster.reduce((sum, ap) => sum + getPlayerPoints(ap.player_id), 0)
  }

  const leaderboard = allParticipants
    .map(p => ({ participant: p, score: getTeamScore(p.id) }))
    .sort((a, b) => b.score - a.score)

  const myRoster = auctionPlayers
    .filter(ap => ap.owner_participant_id === myParticipationId)
    .sort((a, b) => getPlayerPoints(b.player_id) - getPlayerPoints(a.player_id))

  async function handleSaveCVC() {
    if (!captainId || !vcId) { toast.error('Select both Captain and Vice Captain'); return }
    if (captainId === vcId) { toast.error('Captain and Vice Captain must be different players'); return }
    setSaving(true)
    const res = await fetch(`/api/auctions/${auction.id}/cvc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captain_id: captainId, vc_id: vcId }),
    })
    setSaving(false)
    setConfirmOpen(false)
    if (!res.ok) { toast.error('Could not save. Try again.'); return }
    toast.success('Captain and Vice Captain saved!')
    setEditMode(false)
    router.refresh()
  }

  function RosterTable({ participantId, title, showCVC }: { participantId: string; title: string; showCVC?: boolean }) {
    const roster = auctionPlayers
      .filter(ap => ap.owner_participant_id === participantId)
      .sort((a, b) => getPlayerPoints(b.player_id) - getPlayerPoints(a.player_id))
    const totalScore = roster.reduce((s, ap) => s + getPlayerPoints(ap.player_id), 0)

    return (
      <div className="card-glow overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a3347] flex items-center justify-between">
          <h3 className="font-semibold text-[#f0f4ff] text-sm">{title}</h3>
          <span className="text-xs text-[#4f7cff] font-semibold">{totalScore} pts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#5a6478] border-b border-[#2a3347]">
                <th className="text-left px-4 py-2">Player</th>
                <th className="text-left px-4 py-2 hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-2 hidden sm:table-cell">Club</th>
                <th className="text-right px-4 py-2">Points</th>
              </tr>
            </thead>
            <tbody>
              {roster.map(ap => {
                const isCap  = ap.player_id === captainId
                const isVC   = ap.player_id === vcId
                const pts    = getPlayerPoints(ap.player_id)
                return (
                  <tr key={ap.id} className="border-b border-[#2a3347]/50 last:border-0 hover:bg-[#1e2535]/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[#f0f4ff] font-medium">{ap.player?.name}</span>
                        {showCVC && isCap  && <Badge variant="yellow"><Crown size={9} /> C</Badge>}
                        {showCVC && isVC   && <Badge variant="blue"><Star size={9} /> VC</Badge>}
                        {ap.player?.is_foreign && <Badge variant="purple">FOR</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded border', getRoleColor(ap.player?.role || ''))}>{ap.player?.role}</span>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-[#8892aa]">{ap.player?.club}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#f0f4ff]">{pts}</td>
                  </tr>
                )
              })}
              {roster.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-4 text-center text-[#5a6478]">No players in squad</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl hover:bg-[#1e2535] transition-colors text-[#8892aa] hover:text-[#f0f4ff]">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#f0f4ff] truncate">{auction.league_name}</h1>
          <p className="text-xs text-[#5a6478]">{auction.tournament?.name} · League Live</p>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── Score tab ── */}
      {tab === 'score' && (
        <div className="card-glow overflow-hidden animate-fade-in">
          <div className="px-5 py-3.5 border-b border-[#2a3347]">
            <h3 className="font-semibold text-[#f0f4ff]">Leaderboard</h3>
          </div>
          <div>
            {leaderboard.map(({ participant, score }, idx) => (
              <div key={participant.id} className={cn(
                'flex items-center gap-4 px-5 py-3.5 border-b border-[#2a3347] last:border-0',
                participant.user_id === userId && 'bg-[#4f7cff]/5'
              )}>
                <span className={cn('w-6 text-sm font-bold text-center', idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-[#8892aa]' : idx === 2 ? 'text-amber-600' : 'text-[#5a6478]')}>
                  {idx + 1}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#252d3d] flex items-center justify-center text-sm font-bold text-[#4f7cff]">
                  {participant.user.display_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f0f4ff] truncate">
                    {participant.user.display_name}
                    {participant.user_id === userId && <span className="text-xs text-[#4f7cff] ml-1">(You)</span>}
                  </p>
                </div>
                <span className="font-bold text-[#f0f4ff]">{score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Teams tab ── */}
      {tab === 'teams' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* My team first */}
          <RosterTable
            participantId={myParticipationId}
            title="My Team"
            showCVC
          />
          {/* Other participants */}
          {allParticipants
            .filter(p => p.id !== myParticipationId)
            .sort((a, b) => a.user.display_name.localeCompare(b.user.display_name))
            .map(p => (
              <RosterTable key={p.id} participantId={p.id} title={`${p.user.display_name}'s Team`} />
            ))}
        </div>
      )}

      {/* ── C/VC tab ── */}
      {tab === 'cvc' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8892aa]">Changes: {captainChangeCount}/{maxChanges}</p>
            </div>
            <div className="flex gap-2">
              {hasUnsavedChanges && !changeLimitReached && (
                <Button size="sm" onClick={() => setConfirmOpen(true)}>
                  <Save size={14} /> Save
                </Button>
              )}
              {!editMode && !changeLimitReached && (
                <Button size="sm" variant="secondary" onClick={() => setEditMode(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>

          {changeLimitReached && (
            <div className="card-glow p-3 flex items-center gap-2 border-yellow-500/20 bg-yellow-500/5">
              <AlertCircle size={15} className="text-yellow-400" />
              <p className="text-sm text-yellow-400">Captain change limit reached ({maxChanges})</p>
            </div>
          )}

          <div className="card-glow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#5a6478] text-xs border-b border-[#2a3347]">
                  <th className="text-left px-4 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">Player</th>
                  <th className="text-right px-4 py-2.5">Bought</th>
                  <th className="text-center px-4 py-2.5">C</th>
                  <th className="text-center px-4 py-2.5">VC</th>
                </tr>
              </thead>
              <tbody>
                {myRoster.map((ap, idx) => {
                  const isCap = captainId === ap.player_id
                  const isVC  = vcId === ap.player_id
                  return (
                    <tr key={ap.id} className="border-b border-[#2a3347]/50 last:border-0 hover:bg-[#1e2535]/50 transition-colors">
                      <td className="px-4 py-2.5 text-[#5a6478]">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[#f0f4ff]">{ap.player?.name}</p>
                        <p className="text-xs text-[#5a6478]">{ap.player?.club}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#8892aa]">{formatCr(ap.purchase_price_cr || 0)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          disabled={!editMode || isVC || changeLimitReached}
                          onClick={() => setCaptainId(isCap ? null : ap.player_id)}
                          className={cn(
                            'w-7 h-7 rounded-full text-xs font-bold border transition-all',
                            isCap ? 'bg-yellow-500 border-yellow-500 text-black' : 'border-[#2a3347] text-[#5a6478]',
                            editMode && !isVC && !changeLimitReached && 'hover:border-yellow-500 hover:text-yellow-500 cursor-pointer',
                            (!editMode || isVC || changeLimitReached) && 'opacity-40 cursor-not-allowed'
                          )}
                        >C</button>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          disabled={!editMode || isCap || changeLimitReached}
                          onClick={() => setVcId(isVC ? null : ap.player_id)}
                          className={cn(
                            'w-7 h-7 rounded-full text-xs font-bold border transition-all',
                            isVC ? 'bg-blue-500 border-blue-500 text-white' : 'border-[#2a3347] text-[#5a6478]',
                            editMode && !isCap && !changeLimitReached && 'hover:border-blue-500 hover:text-blue-500 cursor-pointer',
                            (!editMode || isCap || changeLimitReached) && 'opacity-40 cursor-not-allowed'
                          )}
                        >VC</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Current selection summary */}
          <div className="flex gap-3">
            <div className="flex-1 card-glow p-3 text-center">
              <p className="text-xs text-[#5a6478]">Captain</p>
              <p className="text-sm font-semibold text-yellow-400 mt-0.5">
                {captainId ? myRoster.find(ap => ap.player_id === captainId)?.player?.name || '—' : '—'}
              </p>
            </div>
            <div className="flex-1 card-glow p-3 text-center">
              <p className="text-xs text-[#5a6478]">Vice Captain</p>
              <p className="text-sm font-semibold text-blue-400 mt-0.5">
                {vcId ? myRoster.find(ap => ap.player_id === vcId)?.player?.name || '—' : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Quota tab ── */}
      {tab === 'quota' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {[...allParticipants].sort((a, b) => {
            if (a.id === myParticipationId) return -1
            if (b.id === myParticipationId) return 1
            return a.user.display_name.localeCompare(b.user.display_name)
          }).map(p => {
            const roster = auctionPlayers.filter(ap => ap.owner_participant_id === p.id)
            const counts = { BAT: 0, BOWL: 0, WK: 0, AR: 0, FOREIGN: 0 }
            roster.forEach(ap => {
              if (ap.player) {
                counts[ap.player.role as keyof typeof counts] = (counts[ap.player.role as keyof typeof counts] || 0) + 1
                if (ap.player.is_foreign) counts.FOREIGN++
              }
            })
            const quotas = [
              { role: 'BAT',  current: counts.BAT,     required: auction.rules?.min_batsmen || 3 },
              { role: 'BOWL', current: counts.BOWL,    required: auction.rules?.min_bowlers || 3 },
              { role: 'WK',   current: counts.WK,      required: auction.rules?.min_wk || 1 },
              { role: 'AR',   current: counts.AR,      required: auction.rules?.min_allrounders || 1 },
              { role: 'FOR',  current: counts.FOREIGN, required: auction.rules?.max_foreign || 3, isMax: true },
            ]
            return (
              <div key={p.id} className="card-glow overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a3347] flex items-center justify-between">
                  <h3 className="font-semibold text-[#f0f4ff] text-sm">
                    {p.id === myParticipationId ? 'My Quota' : `${p.user.display_name}'s Quota`}
                  </h3>
                  <span className="text-xs text-[#5a6478]">{roster.length} players</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[#5a6478] border-b border-[#2a3347]">
                        <th className="text-left px-4 py-2">Role</th>
                        <th className="text-center px-4 py-2">Required</th>
                        <th className="text-center px-4 py-2">Current</th>
                        <th className="text-center px-4 py-2">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotas.map(q => {
                        const pending = q.isMax ? Math.max(0, q.required - q.current) : Math.max(0, q.required - q.current)
                        const met = q.isMax ? q.current <= q.required : q.current >= q.required
                        return (
                          <tr key={q.role} className="border-b border-[#2a3347]/50 last:border-0">
                            <td className="px-4 py-2 font-medium text-[#f0f4ff]">{q.role}</td>
                            <td className="px-4 py-2 text-center text-[#8892aa]">{q.isMax ? `≤${q.required}` : q.required}</td>
                            <td className={cn('px-4 py-2 text-center font-semibold', met ? 'text-green-400' : 'text-red-400')}>{q.current}</td>
                            <td className="px-4 py-2 text-center text-[#8892aa]">{pending > 0 ? pending : <CheckCircle size={12} className="text-green-400 mx-auto" />}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* C/VC save confirmation modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Save Captain & Vice Captain">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#8892aa]">Are you sure you want to save these changes? This will count as a captain change.</p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setConfirmOpen(false)}>No, cancel</Button>
            <Button fullWidth loading={saving} onClick={handleSaveCVC}>Yes, save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
