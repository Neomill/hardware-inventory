import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SubmitButtonProps = {
  children: ReactNode
  icon?: LucideIcon
  disabled?: boolean
  className?: string
}

/**
 * The shared Button only renders type="button" or a link, so forms here use
 * this primary-styled submit control instead (same height, colours, radius).
 */
export function SubmitButton({ children, icon: Icon, disabled, className }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  )
}
