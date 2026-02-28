import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCr(cr: number): string {
  if (cr >= 100) return `₹${cr} Cr`
  if (cr >= 1) return `₹${cr} Cr`
  return `₹${(cr * 100).toFixed(0)} L`
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0s'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'upcoming': return 'text-yellow-400 bg-yellow-400/10'
    case 'live_auction': return 'text-green-400 bg-green-400/10'
    case 'league_live': return 'text-blue-400 bg-blue-400/10'
    case 'completed': return 'text-gray-400 bg-gray-400/10'
    case 'accepted': return 'text-green-400 bg-green-400/10'
    case 'pending': return 'text-yellow-400 bg-yellow-400/10'
    case 'rejected': return 'text-red-400 bg-red-400/10'
    default: return 'text-gray-400 bg-gray-400/10'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'upcoming': return 'Upcoming'
    case 'live_auction': return 'Live Auction'
    case 'league_live': return 'League Live'
    case 'completed': return 'Completed'
    default: return status
  }
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'BAT': return 'Batsman'
    case 'BOWL': return 'Bowler'
    case 'WK': return 'Wicket Keeper'
    case 'AR': return 'All-Rounder'
    default: return role
  }
}

export function getRoleColor(role: string): string {
  switch (role) {
    case 'BAT': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    case 'BOWL': return 'text-red-400 bg-red-400/10 border-red-400/20'
    case 'WK': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    case 'AR': return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
    default: return 'text-gray-400 bg-gray-400/10'
  }
}
