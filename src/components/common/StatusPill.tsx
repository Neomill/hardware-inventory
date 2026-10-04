import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Semantic tones plus two hue tones (orange, violet) for categories that need
 * more than five distinct colours, such as payment methods.
 */
export type PillTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'orange' | 'violet'

/**
 * Pill colours live here alone. Which tone a status uses is in statusTones.ts.
 * Every pair passes WCAG AA for the 12px semibold label.
 */
const TONE_STYLES: Record<PillTone, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  info: 'bg-blue-50 text-blue-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
  neutral: 'bg-slate-100 text-slate-700',
  orange: 'bg-orange-50 text-orange-700',
  violet: 'bg-violet-50 text-violet-700',
}

type StatusPillProps = {
  tone: PillTone
  children: ReactNode
  /** Leading icon, so the state is not told by colour alone. */
  icon?: LucideIcon
  className?: string
}

export function StatusPill({ tone, children, icon: Icon, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        TONE_STYLES[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </span>
  )
}
