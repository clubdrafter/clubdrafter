'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { getRoleColor, cn } from '@/lib/utils'
import type { Auction, AuctionParticipant, AuctionPlayer, Player } from '@/types'

type ParticipantRow = AuctionParticipant & { user: { display_name: string; username: string } }
type AuctionPlayerRow = AuctionPlayer & { player: Player }

interface Props {
  auction: Auction
  participants: ParticipantRow[]
  auctionPlayers: AuctionPlayerRow[]
  pointsMap: Record<string, number>
  userId: string
}

export function PerformancePage({ auction, participants, auctionPlayers, pointsMap, userId }: Props) {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  function getTeamScore(participantId: string): number {
    return auctionPlayers
      .filter(ap => ap.owner_participant_id === participantId)
      .reduce((s, ap) => s + (pointsMap[ap.player_id] || 0), 0)
  }

  const leaderboard = participants
    .map(p => ({ participant: p, score: getTeamScore(p.id) }))
    .sort((a, b) => b.score - a.score)

  const selectedParticipant = selectedUserId ? participants.find(p => p.user?.display_name === selectedUserId || p.id === selectedUserId) : null
  const selectedRoster = selectedParticipant
    ? auctionPlayers
        .filter(ap => ap.owner_participant_id === selectedParticipant.id)
        .sort((a, b) => (pointsMap[b.player_id] || 0) - (pointsMap[a.player_id] || 0))
    : []

  // Drill-down view
  if (selectedParticipant) {
    const totalScore = selectedRoster.reduce((s, ap) => s + (pointsMap[ap.player_id] || 0), 0)
    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto animate-fade-in-up">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedUserId(null)} className="p-2 rounded-xl hover:bg-[#1e2535] transition-colors text-[#8892aa] hover:text-[#f0f4ff]">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#f0f4ff]">{selectedParticipant.user.display_name}&apos;s Team</h1>
            <p className="text-xs text-[#5a6478]">Total: {totalScore} points</p>
          </div>
        </div>

        <div className="card-glow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#5a6478] text-xs border-b border-[#2a3347]">
                <th className="text-left px-4 py-2.5">Player</th>
                <th className="text-left px-4 py-2.5 hidden sm:table-cell">Club</th>
                <th className="text-right px-4 py-2.5">Points</th>
              </tr>
            </thead>
            <tbody>
              {selectedRoster.map(ap => (
                <tr key={ap.id} className="border-b border-[#2a3347]/50 last:border-0 hover:bg-[#1e2535]/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded border', getRoleColor(ap.player?.role || ''))}>{ap.player?.role}</span>
                      <span className="font-medium text-[#f0f4ff]">{ap.player?.name}</span>
                      {ap.player?.is_foreign && <Badge variant="purple">FOR</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-[#8892aa]">{ap.player?.club}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#f0f4ff]">{pointsMap[ap.player_id] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Final results table
  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl hover:bg-[#1e2535] transition-colors text-[#8892aa] hover:text-[#f0f4ff]">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#f0f4ff]">Final Results</h1>
          <p className="text-xs text-[#5a6478]">{auction.league_name} · {auction.tournament?.name}</p>
        </div>
      </div>

      <div className="card-glow overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#2a3347] flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" />
          <h3 className="font-semibold text-[#f0f4ff]">League Standings</h3>
        </div>
        <div>
          {leaderboard.map(({ participant, score }, idx) => (
            <button
              key={participant.id}
              onClick={() => setSelectedUserId(participant.id)}
              className={cn(
                'w-full flex items-center gap-4 px-5 py-4 border-b border-[#2a3347] last:border-0 hover:bg-[#1e2535] transition-colors text-left',
                participant.user_id === userId && 'bg-[#4f7cff]/5'
              )}
            >
              <span className={cn('w-8 text-lg font-black text-center', idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-[#9aa0aa]' : idx === 2 ? 'text-amber-600' : 'text-[#5a6478]')}>
                {idx + 1}
              </span>
              {idx === 0 && <Trophy size={18} className="text-yellow-400 -ml-1" />}
              <div className="w-9 h-9 rounded-full bg-[#252d3d] flex items-center justify-center text-base font-bold text-[#4f7cff]">
                {participant.user.display_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#f0f4ff]">
                  {participant.user.display_name}
                  {participant.user_id === userId && <span className="text-xs text-[#4f7cff] ml-1.5">(You)</span>}
                </p>
                <p className="text-xs text-[#5a6478]">@{participant.user.username}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-[#f0f4ff]">{score}</p>
                <p className="text-xs text-[#5a6478]">points</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
