import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/** `error` is announced assertively (role="alert"); every other tone politely (role="status"). */
export type AlertTone = 'info' | 'success' | 'warning' | 'error'

const TONE_STYLES: Record<AlertTone, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
}

const TONE_ICONS: Record<AlertTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
}

type AlertProps = {
  tone: AlertTone
  children: React.ReactNode
  className?: string
}

/** Plain-language message. Errors are never silent (handbook section 17). */
export function Alert({ tone, children, className }: AlertProps) {
  const Icon = TONE_ICONS[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        TONE_STYLES[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <p className="flex-1">{children}</p>
    </div>
  )
}
