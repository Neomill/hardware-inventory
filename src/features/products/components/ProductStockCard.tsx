import { SectionCard } from '@/components/common/SectionCard'
import { StockStatusPill } from '@/components/common/StatusPills'
import { formatSignedQuantity } from '@/components/common/statusTones'
import type { MovementTotals } from '@/domain/inventory'
import { deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { formatNumber } from '@/lib/format'

type ProductStockCardProps = {
  product: Product
  /** summarizeMovements over every movement of this product. */
  totals: MovementTotals
}

export function ProductStockCard({ product, totals }: ProductStockCardProps) {
  const rows: [string, string][] = [
    ['Received (opening stock included)', formatNumber(totals.received)],
    ['Sold', formatNumber(totals.sold)],
    ['Returned from cancelled sales', formatNumber(totals.reversed)],
    ['Corrected (net)', formatSignedQuantity(totals.adjusted)],
  ]

  return (
    <SectionCard title="Stock">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-navy-800">Current Stock</p>
          <p className="text-4xl font-bold tabular-nums text-navy-900">
            {formatNumber(product.stock)}{' '}
            <span className="text-lg font-semibold text-muted">{product.unit}</span>
          </p>
          <StockStatusPill
            status={deriveStockStatus(product.stock, product.reorderLevel)}
            className="w-fit"
          />
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-4 sm:max-w-xl lg:grid-cols-4">
          {rows.map(([term, value]) => (
            <div key={term} className="rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-sm text-muted">{term}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-navy-900">
                {value} <span className="text-sm font-medium text-muted">{product.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionCard>
  )
}
