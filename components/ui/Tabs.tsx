'use client'

import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn(
      'flex gap-1 bg-[#161b27] border border-[#2a3347] rounded-xl p-1',
      className
    )}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            active === tab.id
              ? 'bg-[#4f7cff] text-white shadow-sm'
              : 'text-[#8892aa] hover:text-[#f0f4ff] hover:bg-[#1e2535]'
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
