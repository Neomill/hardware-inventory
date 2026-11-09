import { ListOrdered, Package, Plus } from 'lucide-react'

import { StockStatusPill } from '@/components/common/StatusPills'
import { deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { formatCurrency, formatNumber } from '@/lib/format'

type PosProductGridProps = {
  products: Product[]
  /** Quantity of each product already in the cart, by product id. */
  inCart: ReadonlyMap<string, number>
  /** One tap adds one (senior UX plan, Phase 5). */
  onAdd: (product: Product) => void
  /** Opens the quantity dialog, for bulk items such as nails or cement. */
  onChooseQuantity: (product: Product) => void
}

export function PosProductGrid({ products, inCart, onAdd, onChooseQuantity }: PosProductGridProps) {
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
        const quantityInCart = inCart.get(product.id) ?? 0
        // Selling below zero is impossible, so the control is disabled rather
        // than failing after the tap (DESIGN-ERRATA E7).
        const soldOut = product.stock <= 0
        const allInCart = !soldOut && quantityInCart >= product.stock

        return (
          <li key={product.id} className="card flex flex-col p-3">
            <span className="relative flex h-24 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
              <Package className="h-9 w-9" aria-hidden />
              {quantityInCart > 0 ? (
                // The count on the card, like a badge on a phone app icon.
                <span className="absolute right-2 top-2 rounded-full bg-brand-700 px-2.5 py-1 text-sm font-bold text-white">
                  {formatNumber(quantityInCart)} in cart
                </span>
              ) : null}
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

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onAdd(product)}
                disabled={soldOut || allInCart}
                // Every card has these buttons, so each needs the product in its name.
                aria-label={
                  soldOut
                    ? `${product.name}: Out of Stock`
                    : allInCart
                      ? `${product.name}: All in Cart`
                      : `Add 1 ${product.name}`
                }
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-navy-800 text-base font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
              >
                {soldOut ? (
                  'Out of Stock'
                ) : allInCart ? (
                  'All in Cart'
                ) : (
                  <>
                    <Plus className="h-5 w-5" aria-hidden />
                    Add 1
                  </>
                )}
              </button>

              {soldOut ? null : (
                <button
                  type="button"
                  onClick={() => onChooseQuantity(product)}
                  aria-label={`Choose quantity of ${product.name}`}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-base font-semibold text-navy-800 transition-colors hover:bg-navy-50"
                >
                  <ListOrdered className="h-5 w-5" aria-hidden />
                  Choose Quantity
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
