import { SectionCard } from '@/components/common/SectionCard'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import { STOCK_TEXT_STYLES } from '@/components/common/statusTones'
import { deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'

const COLUMNS: SummaryColumn<Product>[] = [
  {
    id: 'product',
    header: 'Product',
    cell: (product) => product.name,
    cellClassName: 'font-medium',
  },
  {
    id: 'stock',
    header: 'Current Stock',
    cell: (product) => (
      <span
        className={cn(
          'font-semibold tabular-nums',
          STOCK_TEXT_STYLES[deriveStockStatus(product.stock, product.reorderLevel)],
        )}
      >
        {formatNumber(product.stock)}
      </span>
    ),
  },
  {
    id: 'unit',
    header: 'Unit',
    cell: (product) => product.unit,
    cellClassName: 'text-muted',
  },
  {
    id: 'reorder',
    header: 'Reorder At',
    cell: (product) => formatNumber(product.reorderLevel),
    cellClassName: 'tabular-nums',
  },
]

type LowStockCardProps = {
  items: Product[]
}

export function LowStockCard({ items }: LowStockCardProps) {
  return (
    <SectionCard
      title="Low Stock Items"
      className="min-w-0"
      action={<ViewAllLink to={ROUTES.productsByStock('restock')} />}
    >
      <SummaryTable
        columns={COLUMNS}
        rows={items}
        rowKey={(product) => product.id}
        emptyMessage="Every product is above its reorder level."
      />
    </SectionCard>
  )
}
