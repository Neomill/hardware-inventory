import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type PillTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

/**
 * Semantic colours live here alone, so status colouring stays consistent
 * across payment methods, stock states and transaction types.
 */
const TONE_STYLES: Record<PillTone, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  info: 'bg-blue-50 text-blue-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
  neutral: 'bg-slate-100 text-slate-700',
}

type StatusPillProps = {
  tone: PillTone
  children: ReactNode
  className?: string
}

export function StatusPill({ tone, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
