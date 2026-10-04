import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { IconTile, type IconTone } from '@/components/common/IconTile'

type StatCardProps = {
  label: string
  value: string
  icon: LucideIcon
  tone: IconTone
  /** Line under the value. Two children spread apart; one child sits left. */
  footer?: ReactNode
  /** Adds a divided footer row linking to the full view. */
  action?: { to: string; label: string }
  iconShape?: 'square' | 'circle'
}

/**
 * KPI tile: icon plate, label, headline figure, and a supporting line. The
 * figure is never truncated: in a narrow tile it drops under the icon, and a
 * longer figure still wraps rather than being cut with an ellipsis.
 */
export function StatCard({ label, value, icon, tone, footer, action, iconShape }: StatCardProps) {
  return (
    <article className="card flex min-w-0 flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <IconTile icon={icon} tone={tone} shape={iconShape} />
        <div className="min-w-0 flex-1 basis-36">
          <p className="card-title">{label}</p>
          <p className="mt-1 text-2xl font-bold leading-tight tabular-nums text-navy-900 [overflow-wrap:anywhere]">
            {value}
          </p>
        </div>
      </div>

      {footer ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
          {footer}
        </div>
      ) : null}

      {action ? (
        <Link
          to={action.to}
          className="-mx-5 -mb-5 mt-1 flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-sm font-semibold text-navy-700 transition-colors hover:bg-navy-50"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </article>
  )
}
