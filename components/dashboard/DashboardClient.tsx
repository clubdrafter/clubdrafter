'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Clock, Trophy, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import { toast } from '@/components/shared/Toaster'
import { getStatusLabel, getStatusColor, cn } from '@/lib/utils'
import type { Auction, AuctionParticipant } from '@/types'

type Participation = AuctionParticipant & { auction: Auction }

interface Props {
  userId: string
  participations: Participation[]
  hostedAuctions: Auction[]
}

export function DashboardClient({ userId, participations, hostedAuctions }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [parts, setParts] = useState<Participation[]>(participations)
  const [hosted, setHosted] = useState<Auction[]>(hostedAuctions)

  // Real-time: subscribe to participation changes
  useEffect(() => {
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_participants', filter: `user_id=eq.${userId}` },
        () => router.refresh()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' },
        () => router.refresh()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, supabase, router])

  async function handleAccept(participationId: string, auctionId: string) {
    const { error } = await supabase
      .from('auction_participants')
      .update({ invite_status: 'accepted' })
      .eq('id', participationId)
    if (error) { toast.error('Could not accept invite'); return }
    setParts(prev => prev.map(p => p.id === participationId ? { ...p, invite_status: 'accepted' } : p))
    toast.success('Invite accepted!')
  }

  async function handleReject(participationId: string) {
    const { error } = await supabase
      .from('auction_participants')
      .update({ invite_status: 'rejected' })
      .eq('id', participationId)
    if (error) { toast.error('Could not reject invite'); return }
    setParts(prev => prev.filter(p => p.id !== participationId))
    toast.info('Invite rejected')
  }

  // Merge hosted + participated, deduplicate
  const hostedIds = new Set(hosted.map(a => a.id))
  const allRows: Array<{ auction: Auction; participation: Participation | null; isHost: boolean }> = [
    ...hosted.map(a => ({ auction: a, participation: parts.find(p => p.auction.id === a.id) || null, isHost: true })),
    ...parts.filter(p => !hostedIds.has(p.auction.id)).map(p => ({ auction: p.auction, participation: p, isHost: false })),
  ]

  function getAction(row: typeof allRows[0]) {
    const { auction, participation, isHost } = row
    const status = auction.status
    const inviteStatus = participation?.invite_status

    if (inviteStatus === 'pending') {
      return (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="success" onClick={() => handleAccept(participation!.id, auction.id)}>
            <CheckCircle size={14} /> Accept
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(participation!.id)}>
            <XCircle size={14} /> Reject
          </Button>
        </div>
      )
    }

    if (isHost) {
      return (
        <Button size="sm" variant="secondary" onClick={() => router.push(`/auction/${auction.id}`)}>
          Manage
        </Button>
      )
    }

    if (status === 'upcoming') {
      const canJoin = auction.start_time
        ? Date.now() >= new Date(auction.start_time).getTime() - 15 * 60 * 1000
        : false
      return (
        <Button size="sm" variant="secondary" onClick={() => router.push(`/auction/${auction.id}/league`)}>
          View League
        </Button>
      )
    }

    if (status === 'live_auction') {
      return (
        <Button size="sm" variant="primary" onClick={() => router.push(`/auction/${auction.id}`)}>
          Join
        </Button>
      )
    }

    if (status === 'league_live') {
      return (
        <Button size="sm" variant="secondary" onClick={() => router.push(`/auction/${auction.id}/team`)}>
          View Team
        </Button>
      )
    }

    if (status === 'completed') {
      return (
        <Button size="sm" variant="ghost" onClick={() => router.push(`/auction/${auction.id}/performance`)}>
          View Performance
        </Button>
      )
    }

    return null
  }

  function getStatusBadge(row: typeof allRows[0]) {
    const inviteStatus = row.participation?.invite_status
    if (inviteStatus === 'pending') return <Badge variant="yellow">Invitation</Badge>

    const s = row.auction.status
    const map: Record<string, 'yellow' | 'green' | 'blue' | 'default'> = {
      upcoming:     'yellow',
      live_auction: 'green',
      league_live:  'blue',
      completed:    'default',
    }
    return <Badge variant={map[s] || 'default'}>{getStatusLabel(s)}</Badge>
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f4ff]">My Auctions</h1>
          <p className="text-sm text-[#8892aa] mt-0.5">Manage your leagues and auctions</p>
        </div>
        <Link href="/auction/new">
          <Button>
            <Plus size={16} /> New Auction
          </Button>
        </Link>
      </div>

      {/* Table / Empty state */}
      {allRows.length === 0 ? (
        <div className="card-glow p-10 flex flex-col items-center gap-4 text-center">
          <Trophy size={40} className="text-[#2a3347]" />
          <div>
            <p className="text-[#f0f4ff] font-semibold">No auctions yet</p>
            <p className="text-sm text-[#8892aa] mt-1">Create your first auction or wait for an invitation</p>
          </div>
          <Link href="/auction/new">
            <Button>
              <Plus size={16} /> Start a new auction
            </Button>
          </Link>
        </div>
      ) : (
        <div className="card-glow overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a3347] text-[#5a6478] text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Auction Name</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Host</th>
                  <th className="text-left px-5 py-3 font-medium">Starts</th>
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {allRows.map((row, i) => (
                  <tr key={row.auction.id} className={`border-b border-[#2a3347] last:border-0 hover:bg-[#1e2535]/50 transition-colors ${i % 2 === 0 ? '' : 'bg-[#161b27]/30'}`}>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-[#f0f4ff]">{row.auction.league_name}</p>
                        <p className="text-xs text-[#5a6478]">{row.auction.tournament?.name} · {row.isHost ? 'You are host' : 'Player'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(row)}</td>
                    <td className="px-5 py-3.5 text-[#8892aa]">
                      {row.isHost ? <span className="text-[#4f7cff]">You</span> : row.auction.host?.display_name}
                    </td>
                    <td className="px-5 py-3.5">
                      {row.auction.start_time ? (
                        row.auction.status === 'upcoming'
                          ? <CountdownTimer targetDate={row.auction.start_time} compact />
                          : <span className="text-[#5a6478] text-xs">Started</span>
                      ) : (
                        <span className="text-[#5a6478] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">{getAction(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-[#2a3347]">
            {allRows.map(row => (
              <div key={row.auction.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[#f0f4ff]">{row.auction.league_name}</p>
                    <p className="text-xs text-[#5a6478] mt-0.5">{row.auction.tournament?.name} · {row.isHost ? 'Host' : 'Player'}</p>
                  </div>
                  {getStatusBadge(row)}
                </div>
                {row.auction.start_time && row.auction.status === 'upcoming' && (
                  <div className="flex items-center gap-1.5 text-xs text-[#8892aa]">
                    <Clock size={12} />
                    <CountdownTimer targetDate={row.auction.start_time} compact />
                  </div>
                )}
                {getAction(row)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
