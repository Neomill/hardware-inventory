import { Package, Plus } from 'lucide-react'

import { StatusPill } from '@/components/common/StatusPill'
import { deriveStockStatus, STOCK_STATUS_TONES } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { formatCurrency, formatNumber } from '@/lib/format'

type PosProductGridProps = {
  products: Product[]
  onSelect: (product: Product) => void
}

export function PosProductGrid({ products, onSelect }: PosProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="card px-5 py-12 text-center text-sm text-muted">
        No products match that search.
      </p>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {products.map((product) => {
        const status = deriveStockStatus(product.stock, product.reorderLevel)
        // Selling below zero is impossible, so the control is disabled rather
        // than failing after the tap (DESIGN-ERRATA E7).
        const soldOut = product.stock <= 0

        return (
          <li key={product.id} className="card flex flex-col p-3">
            <span className="flex h-24 items-center justify-center rounded-lg bg-slate-50 text-slate-300">
              <Package className="h-9 w-9" aria-hidden />
            </span>

            <p className="mt-3 line-clamp-2 min-h-10 text-sm font-medium text-navy-900">
              {product.name}
            </p>

            <p className="mt-1 text-sm text-navy-800">
              {formatCurrency(product.price)} <span className="text-muted">/ {product.unit}</span>
            </p>

            <div className="mt-2">
              <StatusPill tone={STOCK_STATUS_TONES[status]}>
                {formatNumber(product.stock)} {product.unit}
              </StatusPill>
            </div>

            <button
              type="button"
              onClick={() => onSelect(product)}
              disabled={soldOut}
              className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-navy-800 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
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
