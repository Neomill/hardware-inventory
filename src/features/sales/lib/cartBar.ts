import type { SaleTotals } from '@/domain/sale'
import { formatItemCount } from '@/features/sales/lib/salesMetrics'
import { formatCurrency } from '@/lib/format'

export type CartBarSummary = {
  /** "3 items" */
  countLabel: string
  /** The cart total, formatted from integer centavos. VAT is inclusive, never added (D1). */
  totalLabel: string
  /** Shown under the count when the cart holds a line that cannot be sold. */
  warning: string | null
  /** Full name of the "View cart" button for screen readers. */
  accessibleLabel: string
}

/**
 * What the sticky cart bar on narrow screens shows, or null when it should be
 * hidden. The bar exists only to reach the cart without scrolling past every
 * product; an empty cart has nothing to review, hold or check out.
 *
 * `cartLineCount` is the raw cart length, so a cart holding only unavailable
 * lines still shows the bar and the cashier can reach the cart to remove them.
 */
export function cartBarSummary(
  totals: Pick<SaleTotals, 'itemCount' | 'total'>,
  cartLineCount: number,
  unavailableCount: number,
): CartBarSummary | null {
  if (cartLineCount <= 0) {
    return null
  }

  const countLabel = formatItemCount(totals.itemCount)
  const totalLabel = formatCurrency(totals.total)
  const warning =
    unavailableCount > 0
      ? `${unavailableCount === 1 ? '1 unavailable item' : `${unavailableCount} unavailable items`} to remove`
      : null

  return {
    countLabel,
    totalLabel,
    warning,
    accessibleLabel: `View cart, ${countLabel}, total ${totalLabel}${warning ? `, ${warning}` : ''}`,
  }
}
