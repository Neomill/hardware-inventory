import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { IconTile, type IconTone } from '@/components/common/IconTile'

type StatCardProps = {
  label: string
  value: string
  icon: LucideIcon
  tone: IconTone
  /** Line under the value. Two children spread apart; one child sits left. */
  footer: ReactNode
}

/** KPI tile: icon plate, label, headline figure, and a supporting line. */
export function StatCard({ label, value, icon, tone, footer }: StatCardProps) {
  return (
    <article className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-4">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0">
          <p className="card-title">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-navy-900">{value}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">{footer}</div>
    </article>
  )
}
