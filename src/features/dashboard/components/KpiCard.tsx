import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { IconTile, type IconTone } from '@/components/common/IconTile'

type KpiCardProps = {
  label: string
  value: string
  icon: LucideIcon
  tone: IconTone
  footer?: ReactNode
}

/**
 * Dashboard KPI tile. Unlike StatCard it never truncates the figure: when the
 * tile is too narrow for icon and figure side by side (four across beside the
 * sidebar), the figure drops under the icon, and a figure longer still wraps
 * rather than being cut with an ellipsis.
 */
export function KpiCard({ label, value, icon, tone, footer }: KpiCardProps) {
  return (
    <article className="card flex min-w-0 flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <IconTile icon={icon} tone={tone} />
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
    </article>
  )
}
