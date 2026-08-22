import { SectionCard } from '@/components/common/SectionCard'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import type { LowStockItem } from '@/features/dashboard/types'
import { formatNumber } from '@/lib/format'

const COLUMNS: SummaryColumn<LowStockItem>[] = [
  {
    id: 'product',
    header: 'Product',
    cell: (item) => item.name,
    cellClassName: 'font-medium',
  },
  {
    id: 'stock',
    header: 'Current Stock',
    cell: (item) => formatNumber(item.currentStock),
    cellClassName: 'font-semibold text-rose-600',
  },
  {
    id: 'unit',
    header: 'Unit',
    cell: (item) => item.unit,
    cellClassName: 'text-muted',
  },
  {
    id: 'reorder',
    header: 'Reorder Level',
    cell: (item) => formatNumber(item.reorderLevel),
  },
]

type LowStockCardProps = {
  items: LowStockItem[]
}

export function LowStockCard({ items }: LowStockCardProps) {
  return (
    <SectionCard title="Low Stock Items" action={<ViewAllLink to={ROUTES.lowStockProducts} />}>
      <SummaryTable
        columns={COLUMNS}
        rows={items}
        rowKey={(item) => item.id}
        emptyMessage="Every product is above its reorder level."
      />
    </SectionCard>
  )
}
