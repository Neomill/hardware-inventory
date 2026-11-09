import { Package, Plus } from 'lucide-react'

import { StockStatusPill } from '@/components/common/StatusPills'
import { deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { formatCurrency } from '@/lib/format'

type PosProductGridProps = {
  products: Product[]
  onSelect: (product: Product) => void
}

export function PosProductGrid({ products, onSelect }: PosProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="card px-5 py-12 text-center text-base text-muted">
        No products match that search.
      </p>
    )
  }

  return (
    // Columns follow the space left beside the cart, not the screen width: with
    // the larger text sizes, fixed breakpoint columns squeezed cards too thin.
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
      {products.map((product) => {
        const status = deriveStockStatus(product.stock, product.reorderLevel)
        // Selling below zero is impossible, so the control is disabled rather
        // than failing after the tap (DESIGN-ERRATA E7).
        const soldOut = product.stock <= 0

        return (
          <li key={product.id} className="card flex flex-col p-3">
            <span className="flex h-24 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
              <Package className="h-9 w-9" aria-hidden />
            </span>

            <p className="mt-3 line-clamp-2 min-h-12 text-base font-semibold text-navy-900">
              {product.name}
            </p>

            <p className="mt-1 text-base tabular-nums text-navy-800">
              {formatCurrency(product.price)} <span className="text-muted">/ {product.unit}</span>
            </p>

            <div className="mt-2">
              <StockStatusPill status={status} stock={product.stock} unit={product.unit} />
            </div>

            <button
              type="button"
              onClick={() => onSelect(product)}
              disabled={soldOut}
              // Every card has an Add button, so each needs the product in its name.
              aria-label={soldOut ? `${product.name}: Out of Stock` : `Add ${product.name}`}
              className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-navy-800 text-base font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
            >
              {soldOut ? (
                'Out of Stock'
              ) : (
                <>
                  <Plus className="h-5 w-5" aria-hidden />
                  Add
                </>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
