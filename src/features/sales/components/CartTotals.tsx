import type { SaleTotals } from '@/domain/sale'
import { formatCurrency } from '@/lib/format'

type CartTotalsProps = {
  totals: SaleTotals
  taxRate: number
}

/**
 * Prices already include VAT, so the total is the sum of the lines less any
 * discount. The VAT line is shown for reference and is never added (decision
 * D1) -- the design's checkout added it on top, which is E2.
 */
export function CartTotals({ totals, taxRate }: CartTotalsProps) {
  const vatLabel = `${Math.round(taxRate * 100)}%`

  return (
    <div className="rounded-xl bg-slate-50 px-4 py-4 tabular-nums">
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-navy-800">Subtotal ({totals.itemCount} items)</dt>
          <dd className="font-semibold text-navy-900">{formatCurrency(totals.subtotal)}</dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-navy-800">Discount</dt>
          <dd className="font-semibold text-navy-900">
            {formatCurrency(totals.discountAmount)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3">
        <span className="text-base font-bold uppercase tracking-wide text-navy-900">Total</span>
        <span className="text-2xl font-bold text-navy-900">{formatCurrency(totals.total)}</span>
      </div>

      <p className="mt-1 text-right text-xs text-muted">
        Includes VAT ({vatLabel}) of {formatCurrency(totals.vat.vat)}
      </p>
    </div>
  )
}
