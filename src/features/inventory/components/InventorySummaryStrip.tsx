import { AlertTriangle, PackageX, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { IconTile, type IconTone } from '@/components/common/IconTile'
import type { InventorySummary } from '@/features/inventory/lib/inventoryQuery'
import { formatNumber } from '@/lib/format'

type SummaryStat = {
  label: string
  value: number
  caption: string
  icon: LucideIcon
  tone: IconTone
}

type InventorySummaryStripProps = {
  summary: InventorySummary
}

export function InventorySummaryStrip({ summary }: InventorySummaryStripProps) {
  const stats: SummaryStat[] = [
    {
      label: 'SKUs',
      value: summary.skuCount,
      caption: 'Active products',
      icon: Tag,
      tone: 'blue',
    },
    {
      label: 'Low Stock',
      value: summary.lowStockCount,
      caption: 'At or below reorder level',
      icon: AlertTriangle,
      tone: 'amber',
    },
    {
      label: 'Out of Stock',
      value: summary.outOfStockCount,
      caption: 'Nothing left to sell',
      icon: PackageX,
      tone: 'orange',
    },
  ]

  return (
    <section className="card grid gap-5 p-5 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-4">
          <IconTile icon={stat.icon} tone={stat.tone} />
          <div className="min-w-0">
            <p className="card-title">{stat.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-navy-900">
              {formatNumber(stat.value)}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">{stat.caption}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
