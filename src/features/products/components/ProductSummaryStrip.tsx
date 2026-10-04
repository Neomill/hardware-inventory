import { AlertTriangle, Boxes, FileText, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { IconTile, type IconTone } from '@/components/common/IconTile'
import type { ProductSummary } from '@/features/products/types'
import { formatCurrency, formatNumber } from '@/lib/format'

type SummaryStat = {
  label: string
  value: string
  caption: string
  icon: LucideIcon
  tone: IconTone
}

type ProductSummaryStripProps = {
  summary: ProductSummary
}

/** Four inventory-wide figures in one panel, as the design groups them. */
export function ProductSummaryStrip({ summary }: ProductSummaryStripProps) {
  const stats: SummaryStat[] = [
    {
      label: 'Total Products',
      value: formatNumber(summary.totalProducts),
      caption: 'Active products',
      icon: Tag,
      tone: 'blue',
    },
    {
      label: 'Total Stock Value',
      value: formatCurrency(summary.totalStockValue),
      caption: 'Based on current stock',
      icon: Boxes,
      tone: 'green',
    },
    {
      label: 'Low Stock Items',
      value: formatNumber(summary.lowStockCount),
      caption: 'Items need restocking',
      icon: AlertTriangle,
      tone: 'amber',
    },
    {
      label: 'Out of Stock',
      value: formatNumber(summary.outOfStockCount),
      caption: 'Items out of stock',
      icon: FileText,
      tone: 'indigo',
    },
  ]

  return (
    <section className="card grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-4">
          <IconTile icon={stat.icon} tone={stat.tone} />
          <div className="min-w-0">
            <p className="card-title">{stat.label}</p>
            <p className="mt-0.5 truncate text-xl font-bold text-navy-900">{stat.value}</p>
            <p className="mt-0.5 truncate text-xs text-muted">{stat.caption}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
