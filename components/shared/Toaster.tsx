'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: string
  message: string
  type: ToastType
}

// Simple event-bus so any component can fire toasts without a context provider
type Listener = (toast: Toast) => void
const listeners: Listener[] = []

export function toast(message: string, type: ToastType = 'info') {
  const t: Toast = { id: Math.random().toString(36).slice(2), message, type }
  listeners.forEach(fn => fn(t))
}
toast.success = (msg: string) => toast(msg, 'success')
toast.error   = (msg: string) => toast(msg, 'error')
toast.info    = (msg: string) => toast(msg, 'info')

const icons = {
  success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
  error:   <AlertCircle size={16} className="text-red-400 shrink-0" />,
  info:    <Info        size={16} className="text-blue-400 shrink-0" />,
}

const borders = {
  success: 'border-green-500/30',
  error:   'border-red-500/30',
  info:    'border-blue-500/30',
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000)
    }
    listeners.push(handler)
    return () => { listeners.splice(listeners.indexOf(handler), 1) }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl',
            'bg-[#1e2535] border shadow-xl animate-fade-in-up',
            'max-w-[320px] min-w-[240px]',
            borders[t.type]
          )}
        >
          {icons[t.type]}
          <span className="text-sm text-[#f0f4ff] flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="text-[#5a6478] hover:text-[#f0f4ff] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
