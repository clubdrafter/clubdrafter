import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { forwardRef, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, fullWidth = false, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed btn-3d'

    const variants = {
      primary:   'bg-[#4f7cff] hover:bg-[#6b93ff] text-white shadow-[0_4px_16px_rgba(79,124,255,0.3)] hover:shadow-[0_6px_20px_rgba(79,124,255,0.45)]',
      secondary: 'bg-[#1e2535] hover:bg-[#252d3d] text-[#f0f4ff] border border-[#2a3347] hover:border-[#3a4560]',
      ghost:     'bg-transparent hover:bg-[#1e2535] text-[#8892aa] hover:text-[#f0f4ff]',
      danger:    'bg-[#ef4444] hover:bg-[#f87171] text-white shadow-[0_4px_12px_rgba(239,68,68,0.25)]',
      success:   'bg-[#22c55e] hover:bg-[#4ade80] text-white shadow-[0_4px_12px_rgba(34,197,94,0.25)]',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-5 py-2.5 text-sm h-10',
      lg: 'px-6 py-3 text-base h-12',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {loading ? <LoadingSpinner size="sm" /> : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
