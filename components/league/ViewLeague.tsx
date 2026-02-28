'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import { getStatusLabel, cn } from '@/lib/utils'
import type { Auction, AuctionParticipant } from '@/types'

type ParticipantRow = AuctionParticipant & { user: { display_name: string; username: string; avatar_url: string | null } }

interface Props {
  auction: Auction
  participants: ParticipantRow[]
  myParticipation: AuctionParticipant | null
  isHost: boolean
  userId: string
}

export function ViewLeague({ auction: initialAuction, participants: initialParts, myParticipation, isHost, userId }: Props) {
  const router  = useRouter()
  const supabase = createClient()

  const [auction, setAuction]       = useState(initialAuction)
  const [participants, setParticipants] = useState(initialParts)

  useEffect(() => {
    const channel = supabase
      .channel(`league:${auction.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_participants', filter: `auction_id=eq.${auction.id}` },
        () => router.refresh()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auction.id}` },
        payload => setAuction(prev => ({ ...prev, ...(payload.new as Auction) }))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [auction.id, supabase, router])

  const accepted = participants.filter(p => p.invite_status === 'accepted').sort((a, b) => a.user.display_name.localeCompare(b.user.display_name))
  const pending  = participants.filter(p => p.invite_status === 'pending').sort((a, b) => a.user.display_name.localeCompare(b.user.display_name))
  const rejected = participants.filter(p => p.invite_status === 'rejected').sort((a, b) => a.user.display_name.localeCompare(b.user.display_name))

  function ParticipantRow({ p, badge }: { p: ParticipantRow; badge?: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-[#2a3347] last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#252d3d] flex items-center justify-center text-sm font-bold text-[#4f7cff]">
            {p.user.display_name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-[#f0f4ff]">
              {p.user.display_name}
              {p.user_id === userId && <span className="text-xs text-[#4f7cff] ml-1.5">(You)</span>}
            </p>
            <p className="text-xs text-[#5a6478]">@{p.user.username}</p>
          </div>
        </div>
        {badge}
      </div>
    )
  }

  const canJoinAuction = auction.status === 'live_auction' && myParticipation?.invite_status === 'accepted'

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl hover:bg-[#1e2535] transition-colors text-[#8892aa] hover:text-[#f0f4ff]">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#f0f4ff] truncate">{auction.league_name}</h1>
          <p className="text-xs text-[#5a6478]">{auction.tournament?.name} · {getStatusLabel(auction.status)}</p>
        </div>
        <Badge variant={auction.status === 'live_auction' ? 'green' : auction.status === 'upcoming' ? 'yellow' : 'default'}>
          {getStatusLabel(auction.status)}
        </Badge>
      </div>

      {/* Auction info */}
      {auction.status === 'upcoming' && auction.start_time && (
        <div className="card-glow p-4 flex items-center gap-3">
          <Clock size={18} className="text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm text-[#8892aa]">Auction starts in</p>
            <CountdownTimer targetDate={auction.start_time} className="text-lg" />
          </div>
        </div>
      )}

      {/* CTA */}
      {canJoinAuction && (
        <Button fullWidth onClick={() => router.push(`/auction/${auction.id}`)}>
          Join Live Auction
        </Button>
      )}

      {/* Accepted participants */}
      <div className="card-glow overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#2a3347] flex items-center justify-between">
          <h3 className="font-semibold text-[#f0f4ff] flex items-center gap-2">
            <Users size={15} className="text-[#4f7cff]" />
            Players ({accepted.length})
          </h3>
          <Badge variant="green">{accepted.length} accepted</Badge>
        </div>
        <div className="px-5">
          {accepted.length === 0 ? (
            <p className="py-5 text-sm text-center text-[#5a6478]">Waiting for players to join the league…</p>
          ) : (
            accepted.map(p => (
              <ParticipantRow key={p.id} p={p} badge={<CheckCircle size={15} className="text-green-400" />} />
            ))
          )}
        </div>
      </div>

      {/* Admin: pending + rejected */}
      {isHost && pending.length > 0 && (
        <div className="card-glow overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#2a3347]">
            <h3 className="font-semibold text-[#f0f4ff] flex items-center gap-2">
              <AlertCircle size={15} className="text-yellow-400" /> Pending Invitations
            </h3>
          </div>
          <div className="px-5">
            {pending.map(p => (
              <ParticipantRow key={p.id} p={p} badge={<Badge variant="yellow">Pending</Badge>} />
            ))}
          </div>
        </div>
      )}

      {isHost && rejected.length > 0 && (
        <div className="card-glow overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#2a3347]">
            <h3 className="font-semibold text-[#f0f4ff] flex items-center gap-2">
              <XCircle size={15} className="text-red-400" /> Declined Invitations
            </h3>
          </div>
          <div className="px-5">
            {rejected.map(p => (
              <ParticipantRow key={p.id} p={p} badge={<Badge variant="red">Declined</Badge>} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
