'use client'

import { useEffect, useState } from 'react'
import { formatCountdown } from '@/lib/utils'

interface CountdownTimerProps {
  targetDate: string | null
  onExpired?: () => void
  className?: string
  compact?: boolean
}

export function CountdownTimer({ targetDate, onExpired, className = '', compact = false }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!targetDate) return
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000))
      setSeconds(diff)
      if (diff === 0) onExpired?.()
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate, onExpired])

  if (!targetDate) return null

  if (compact) {
    return (
      <span className={`font-mono text-sm font-semibold text-yellow-400 ${className}`}>
        {formatCountdown(seconds)}
      </span>
    )
  }

  return (
    <span className={`font-mono font-semibold text-yellow-400 ${className}`}>
      {formatCountdown(seconds)}
    </span>
  )
}
