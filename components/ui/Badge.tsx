import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'green' | 'red' | 'yellow' | 'blue' | 'purple'
}

const variants = {
  default: 'bg-[#252d3d] text-[#8892aa] border-[#2a3347]',
  green:   'bg-green-400/10 text-green-400 border-green-400/20',
  red:     'bg-red-400/10 text-red-400 border-red-400/20',
  yellow:  'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  blue:    'bg-blue-400/10 text-blue-400 border-blue-400/20',
  purple:  'bg-purple-400/10 text-purple-400 border-purple-400/20',
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
