import type { SaleTotals } from '@/domain/sale'
import { formatItemCount } from '@/features/sales/lib/salesMetrics'
import { formatCurrency, formatTaxRatePercent } from '@/lib/format'
import { cn } from '@/lib/utils'

type CartTotalsProps = {
  totals: SaleTotals
  taxRate: number
  /**
   * Leaves out the Subtotal and Discount rows when there is no discount (they
   * would only repeat the total), so the cart beside the grid has room for
   * more lines.
   */
  compact?: boolean
}

/**
 * Prices already include VAT, so the total is the sum of the lines less any
 * discount. The VAT line is shown for reference and is never added (decision
 * D1) -- the design's checkout added it on top, which is E2.
 */
export function CartTotals({ totals, taxRate, compact = false }: CartTotalsProps) {
  const vatLabel = formatTaxRatePercent(taxRate)
  const showBreakdown = !compact || totals.discountAmount > 0

  return (
    <div className="rounded-xl bg-slate-50 px-4 py-4 tabular-nums">
      {showBreakdown ? (
        <dl className="space-y-2 text-base">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-navy-800">Subtotal ({formatItemCount(totals.itemCount)})</dt>
            <dd className="font-semibold text-navy-900">{formatCurrency(totals.subtotal)}</dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="text-navy-800">Discount</dt>
            <dd className="font-semibold text-navy-900">{formatCurrency(totals.discountAmount)}</dd>
          </div>
        </dl>
      ) : null}

      <div
        className={cn(
          'flex flex-wrap items-baseline justify-between gap-x-3',
          showBreakdown && 'mt-3 border-t border-slate-200 pt-3',
        )}
      >
        <span className="text-lg font-bold text-navy-900">Total</span>
        <span className="text-3xl font-bold text-navy-900">{formatCurrency(totals.total)}</span>
      </div>

      <p className="mt-1 text-right text-sm text-muted">
        Includes VAT ({vatLabel}) of {formatCurrency(totals.vat.vat)}
      </p>
    </div>
  )
}
