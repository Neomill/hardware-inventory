import { ArrowRight, Package, Trash2 } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { CartTotals } from '@/features/sales/components/CartTotals'
import type { CartEntry } from '@/features/sales/hooks/useCart'
import type { SaleTotals } from '@/domain/sale'
import { formatCurrency, formatNumber } from '@/lib/format'

type CartPanelProps = {
  entries: CartEntry[]
  totals: SaleTotals
  taxRate: number
  onQuantityChange: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  onClear: () => void
  onCheckout: () => void
}

/**
 * Always-visible running sale. Nothing here is hidden behind a menu: the
 * cashier can see every line, change any quantity and read the total at once.
 */
export function CartPanel({
  entries,
  totals,
  taxRate,
  onQuantityChange,
  onRemove,
  onClear,
  onCheckout,
}: CartPanelProps) {
  return (
    <section className="card flex flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-navy-900">
          Current Sale ({formatNumber(totals.itemCount)} items)
        </h2>

        {entries.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 transition-colors hover:text-rose-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Clear
          </button>
        ) : null}
      </header>

      {entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
            <Package className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-sm text-muted">
            Tap <strong className="text-navy-900">Add</strong> on a product to start this sale.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map(({ line, product }) => (
            <li key={line.productId} className="flex flex-col gap-2 px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-navy-900">
                    {line.productName}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatCurrency(line.unitPrice)} / {line.unit}
                  </span>
                </span>

                <span className="shrink-0 text-sm font-bold tabular-nums text-navy-900">
                  {formatCurrency(line.lineTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <QuantityStepper
                  value={line.quantity}
                  onChange={(quantity) => onQuantityChange(line.productId, quantity)}
                  min={1}
                  max={product.stock}
                  label={`${line.productName} quantity`}
                />

                <button
                  type="button"
                  onClick={() => onRemove(line.productId)}
                  aria-label={`Remove ${line.productName}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-4 px-5 py-4">
        <CartTotals totals={totals} taxRate={taxRate} />

        <Button
          variant="primary"
          icon={ArrowRight}
          onClick={onCheckout}
          disabled={entries.length === 0}
          className="h-14 text-base"
        >
          Proceed to Checkout
        </Button>
      </div>
    </section>
  )
}
