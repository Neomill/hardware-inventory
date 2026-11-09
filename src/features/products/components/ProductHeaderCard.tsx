import { Ban, History, PackagePlus, Pencil } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { StatusPill } from '@/components/common/StatusPill'
import { StockStatusPill } from '@/components/common/StatusPills'
import { ROUTES } from '@/app/routes'
import { deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { formatCurrency, formatNumber } from '@/lib/format'

type ProductHeaderCardProps = {
  product: Product
  onEdit: () => void
}

/** Name, facts and actions for one product (spec 04 s.7.2). */
export function ProductHeaderCard({ product, onEdit }: ProductHeaderCardProps) {
  const facts: [string, string][] = [
    ['Product Code', product.sku],
    ['Category', product.category],
    ['Unit', product.unit],
    ['Price', formatCurrency(product.price)],
    ['Low-Stock Alert At', `${formatNumber(product.reorderLevel)} ${product.unit}`],
  ]

  return (
    <section className="card flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="break-words text-2xl font-bold text-navy-900">{product.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <StockStatusPill status={deriveStockStatus(product.stock, product.reorderLevel)} />
            {product.isActive ? (
              <StatusPill tone="success">Active</StatusPill>
            ) : (
              <StatusPill tone="neutral" icon={Ban}>
                Not for sale
              </StatusPill>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button to={ROUTES.receiveStockFor(product.id)} icon={PackagePlus}>
            Receive Stock
          </Button>
          <Button to={ROUTES.movementsFor(product.id)} icon={History}>
            Stock history
          </Button>
          <Button variant="navy" icon={Pencil} onClick={onEdit}>
            Edit Product
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3 lg:grid-cols-5">
        {facts.map(([term, value]) => (
          <div key={term} className="min-w-0">
            <dt className="text-sm font-semibold text-navy-800">{term}</dt>
            <dd className="mt-1 break-words font-semibold text-navy-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
