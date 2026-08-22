import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type IconTone = 'blue' | 'orange' | 'amber' | 'indigo' | 'green'

const TONE_STYLES: Record<IconTone, string> = {
  blue: 'bg-blue-50 text-blue-600',
  orange: 'bg-brand-50 text-brand-600',
  amber: 'bg-amber-50 text-amber-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  green: 'bg-emerald-50 text-emerald-600',
}

type IconTileProps = {
  icon: LucideIcon
  tone: IconTone
  className?: string
}

/** Rounded icon plate used by the KPI cards and the note widget. */
export function IconTile({ icon: Icon, tone, className }: IconTileProps) {
  return (
    <span
      className={cn(
        'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
        TONE_STYLES[tone],
        className,
      )}
    >
      <Icon className="h-7 w-7" aria-hidden />
    </span>
  )
}
