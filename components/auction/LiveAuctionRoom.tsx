'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Gavel, Wallet, Users, CheckCircle, Clock, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/shared/Toaster'
import { formatCr, getRoleLabel, getRoleColor, cn } from '@/lib/utils'
import { calcMaxSpendable, meetsMinimumCriteria, countRoles } from '@/lib/auction-logic'
import type { Auction, AuctionParticipant, AuctionPlayer, Player } from '@/types'

interface Props {
  auction: Auction
  participation: AuctionParticipant
  allParticipants: (AuctionParticipant & { user: { display_name: string; username: string } })[]
  auctionPlayers: (AuctionPlayer & { player: Player })[]
  userId: string
  isHost: boolean
}

const BID_INCREMENTS = [0.5, 1, 2, 5] // Cr

export function LiveAuctionRoom({ auction: initialAuction, participation: initialPart, allParticipants, auctionPlayers: initialPool, userId, isHost }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [auction, setAuction]     = useState(initialAuction)
  const [myPart, setMyPart]       = useState(initialPart)
  const [pool, setPool]           = useState(initialPool)
  const [timer, setTimer]         = useState(0)
  const [bidding, setBidding]     = useState(false)
  const [completing, setCompleting] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const resolvedForRef = useRef<string | null>(null) // tracks which timer_ends_at we've already resolved

  // Timer countdown — auto-calls resolve when the timer hits 0.
  // Any authenticated participant can trigger resolve; the server deduplicates.
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!auction.timer_ends_at) { setTimer(0); return }

    const calc = () => {
      const diff = Math.max(0, Math.ceil((new Date(auction.timer_ends_at!).getTime() - Date.now()) / 1000))
      setTimer(diff)

      if (diff === 0 && auction.current_player_id && resolvedForRef.current !== auction.timer_ends_at) {
        resolvedForRef.current = auction.timer_ends_at!
        fetch(`/api/auctions/${auction.id}/timer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resolve' }),
        })
      }
    }
    calc()
    timerRef.current = setInterval(calc, 250)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [auction.timer_ends_at, auction.current_player_id, auction.id])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`auction:${auction.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auction.id}` },
        (payload) => setAuction(prev => ({ ...prev, ...payload.new }))
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_participants', filter: `auction_id=eq.${auction.id}` },
        (payload) => {
          if ((payload.new as AuctionParticipant).user_id === userId) {
            setMyPart(prev => ({ ...prev, ...(payload.new as AuctionParticipant) }))
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_players', filter: `auction_id=eq.${auction.id}` },
        (payload) => {
          setPool(prev => prev.map(ap =>
            ap.id === (payload.new as AuctionPlayer).id ? { ...ap, ...(payload.new as AuctionPlayer) } : ap
          ))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [auction.id, userId, supabase])

  const currentPlayer = auction.current_player_id
    ? pool.find(ap => ap.player_id === auction.current_player_id)?.player
    : null

  const myRoster = pool.filter(ap => ap.owner_participant_id === myPart.id)
  const roleCounts = countRoles(myRoster.map(ap => ap.player!))
  const maxSpendable = calcMaxSpendable(myPart.wallet_cr, myRoster.length, auction.rules)
  const rules = auction.rules

  const canComplete = meetsMinimumCriteria({
    playersBought: myRoster.length,
    roster: myRoster.map(ap => ({ player: ap.player! })),
    rules,
    foreignCount: roleCounts.FOREIGN,
  })

  const currentBidder = allParticipants.find(p => p.user_id === auction.current_bidder_id)
  const amLeading     = auction.current_bidder_id === userId
  const canBid        = !myPart.is_finalized && auction.status === 'live_auction' && !!currentPlayer

  async function placeBid(incrementCr: number) {
    const proposedBid = (auction.current_bid_cr || 0) + incrementCr
    if (proposedBid > myPart.wallet_cr) { toast.error('Insufficient wallet balance'); return }
    if (proposedBid > maxSpendable)     { toast.error('Not enough balance to complete minimum squad'); return }

    setBidding(true)
    const res = await fetch(`/api/auctions/${auction.id}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_cr: proposedBid }),
    })
    setBidding(false)
    const data = await res.json()
    if (!res.ok) toast.error(data.error || 'Bid failed')
  }

  async function handleCompleteAuction() {
    if (!canComplete) return
    setCompleting(true)
    const res = await fetch(`/api/auctions/${auction.id}/complete`, { method: 'POST' })
    setCompleting(false)
    if (!res.ok) { toast.error('Could not mark complete'); return }
    toast.success('Marked as complete!')
    setMyPart(prev => ({ ...prev, is_finalized: true }))
  }

  async function handleStartAuction() {
    if (!isHost) return
    const res = await fetch(`/api/auctions/${auction.id}/timer`, { method: 'POST' })
    if (!res.ok) toast.error('Could not start auction')
  }

  // Waiting room
  if (auction.status === 'upcoming') {
    const msUntil = auction.start_time ? new Date(auction.start_time).getTime() - Date.now() : Infinity
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 text-center animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-[#4f7cff]/10 border border-[#4f7cff]/20 flex items-center justify-center">
          <Clock size={28} className="text-[#4f7cff]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#f0f4ff]">Waiting for auction to start</h2>
          {auction.start_time && (
            <p className="text-[#8892aa] mt-1 text-sm">
              Starts in <span className="text-yellow-400 font-mono font-semibold">
                {Math.max(0, Math.floor(msUntil / 1000))}s
              </span>
            </p>
          )}
        </div>
        {isHost && (
          <Button onClick={handleStartAuction}>Start Auction Now</Button>
        )}
      </div>
    )
  }

  // Auction ended
  if (auction.status === 'league_live' || auction.status === 'completed') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 text-center animate-fade-in-up">
        <Trophy size={48} className="text-[#4f7cff]" />
        <div>
          <h2 className="text-xl font-bold text-[#f0f4ff]">Auction Complete!</h2>
          <p className="text-[#8892aa] mt-1">The auction has ended. Check out your team.</p>
        </div>
        <Button onClick={() => router.push(`/auction/${auction.id}/team`)}>View My Team</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#f0f4ff]">{auction.league_name}</h1>
          <p className="text-xs text-[#5a6478]">Live Auction · Round {auction.auction_round}</p>
        </div>
        <Badge variant="green">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* ── Player on the block ── */}
      {currentPlayer ? (
        <div className="card-glow p-5 flex flex-col gap-4 animate-slide-right">
          {/* Timer */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8892aa] uppercase tracking-wider">
              {auction.timer_mode === 'no_bid' ? 'Place first bid' : 'Bid timer'}
            </span>
            <div className={cn('font-mono text-2xl font-black', timer <= 5 && auction.timer_mode === 'bid' ? 'timer-critical' : 'text-[#f0f4ff]')}>
              {timer}s
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[#2a3347] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', timer <= 5 ? 'bg-red-400' : 'bg-[#4f7cff]')}
              style={{ width: `${Math.min(100, (timer / (auction.timer_mode === 'no_bid' ? 30 : 8)) * 100)}%` }}
            />
          </div>

          {/* Player card */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#252d3d] flex items-center justify-center text-2xl font-black text-[#4f7cff]">
              {currentPlayer.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#f0f4ff] text-lg leading-tight truncate">{currentPlayer.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', getRoleColor(currentPlayer.role))}>
                  {getRoleLabel(currentPlayer.role)}
                </span>
                <span className="text-xs text-[#5a6478]">{currentPlayer.club}</span>
                {currentPlayer.is_foreign && <Badge variant="purple">Foreign</Badge>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#5a6478]">Current Bid</p>
              <p className={cn('text-xl font-black transition-all', amLeading ? 'text-green-400' : 'text-[#f0f4ff]')}>
                {auction.current_bid_cr > 0 ? formatCr(auction.current_bid_cr) : '—'}
              </p>
              {currentBidder && (
                <p className="text-xs text-[#8892aa] mt-0.5">
                  {currentBidder.user_id === userId ? 'You' : currentBidder.user?.display_name}
                </p>
              )}
            </div>
          </div>

          {/* Bid buttons */}
          {canBid && !myPart.is_finalized ? (
            <div className="grid grid-cols-4 gap-2">
              {BID_INCREMENTS.map(inc => {
                const newBid = (auction.current_bid_cr || 0) + inc
                const disabled = newBid > maxSpendable || bidding
                return (
                  <button
                    key={inc}
                    disabled={disabled}
                    onClick={() => placeBid(inc)}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-bold border transition-all btn-3d',
                      disabled
                        ? 'border-[#2a3347] text-[#5a6478] bg-[#1a1f2e] cursor-not-allowed'
                        : 'border-[#4f7cff]/30 bg-[#4f7cff]/10 text-[#4f7cff] hover:bg-[#4f7cff]/20 active:scale-95'
                    )}
                  >
                    +{inc} Cr
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-2">
              {myPart.is_finalized
                ? <p className="text-sm text-green-400 flex items-center justify-center gap-2"><CheckCircle size={14} /> You are marked complete</p>
                : <p className="text-sm text-[#5a6478]">Bidding disabled</p>
              }
            </div>
          )}
        </div>
      ) : (
        <div className="card-glow p-8 text-center">
          <Gavel size={32} className="text-[#2a3347] mx-auto mb-3" />
          <p className="text-[#8892aa] text-sm">Waiting for next player…</p>
        </div>
      )}

      {/* ── My Stats ── */}
      <div className="card-glow overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4"
          onClick={() => setStatsOpen(v => !v)}
        >
          <span className="font-semibold text-[#f0f4ff] flex items-center gap-2">
            <Wallet size={16} className="text-[#4f7cff]" /> My Stats
          </span>
          {statsOpen ? <ChevronUp size={16} className="text-[#5a6478]" /> : <ChevronDown size={16} className="text-[#5a6478]" />}
        </button>

        {statsOpen && (
          <div className="px-4 pb-4 flex flex-col gap-4 animate-fade-in">
            {/* Wallet */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1e2535] rounded-xl p-3">
                <p className="text-xs text-[#5a6478]">Wallet Balance</p>
                <p className="text-lg font-bold text-[#f0f4ff] mt-0.5">{formatCr(myPart.wallet_cr)}</p>
              </div>
              <div className="bg-[#1e2535] rounded-xl p-3">
                <p className="text-xs text-[#5a6478]">Max Spendable</p>
                <p className="text-lg font-bold text-yellow-400 mt-0.5">{formatCr(maxSpendable)}</p>
              </div>
            </div>

            {/* Role quota */}
            <div>
              <p className="text-xs text-[#5a6478] mb-2 uppercase tracking-wider">Team Composition</p>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'BAT',  current: roleCounts.BAT,     required: rules.min_batsmen },
                  { label: 'BOWL', current: roleCounts.BOWL,    required: rules.min_bowlers },
                  { label: 'WK',   current: roleCounts.WK,      required: rules.min_wk },
                  { label: 'AR',   current: roleCounts.AR,      required: rules.min_allrounders },
                  { label: 'FOR',  current: roleCounts.FOREIGN, required: rules.max_foreign },
                ].map(q => (
                  <div key={q.label} className={cn('bg-[#1e2535] rounded-lg p-2 text-center', q.current >= q.required ? 'border border-green-500/20' : 'border border-[#2a3347]')}>
                    <p className="text-xs text-[#5a6478]">{q.label}</p>
                    <p className={`text-sm font-bold ${q.current >= q.required ? 'text-green-400' : 'text-[#f0f4ff]'}`}>
                      {q.current}/{q.required}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchased players */}
            {myRoster.length > 0 && (
              <div>
                <p className="text-xs text-[#5a6478] mb-2 uppercase tracking-wider">My Squad ({myRoster.length})</p>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {myRoster.map(ap => (
                    <div key={ap.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#1e2535] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded border', getRoleColor(ap.player!.role))}>{ap.player!.role}</span>
                        <span className="text-sm text-[#f0f4ff] truncate">{ap.player!.name}</span>
                      </div>
                      <span className="text-xs text-[#8892aa] shrink-0 ml-2">{formatCr(ap.purchase_price_cr || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete Auction */}
      {!myPart.is_finalized && (
        <Button
          variant={canComplete ? 'success' : 'secondary'}
          fullWidth
          disabled={!canComplete}
          loading={completing}
          onClick={handleCompleteAuction}
        >
          <CheckCircle size={16} />
          {canComplete ? 'Complete My Auction' : `Complete (need ${rules.min_squad_size - myRoster.length} more players)`}
        </Button>
      )}

      {/* Participants status */}
      <div className="card-glow p-4">
        <p className="text-xs text-[#5a6478] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={12} /> Participants
        </p>
        <div className="grid grid-cols-2 gap-2">
          {allParticipants.map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 bg-[#1e2535] rounded-lg">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#f0f4ff] truncate">{p.user?.display_name}</p>
                <p className="text-xs text-[#5a6478]">{formatCr(p.wallet_cr)}</p>
              </div>
              {p.is_finalized && <CheckCircle size={12} className="text-green-400 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
