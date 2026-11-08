import { ShoppingCart } from 'lucide-react'

import { Button } from '@/components/common/Button'
import type { CartBarSummary } from '@/features/sales/lib/cartBar'

type CartBarProps = {
  summary: CartBarSummary | null
  /** Id of the cart section the button jumps to. */
  cartId: string
  onViewCart: () => void
}

/**
 * Sticky cart summary for screens where the cart sits below the product grid
 * (under the `xl` breakpoint). It keeps the item count and total in view and
 * jumps to the cart, where the cashier reviews lines, holds the sale or checks
 * out. Hidden on desktop, where the cart is beside the grid, and in print.
 *
 * It is `sticky`, not `fixed`: it keeps its own place at the end of the page,
 * so scrolling to the bottom always uncovers the last row of products.
 */
export function CartBar({ summary, cartId, onViewCart }: CartBarProps) {
  if (!summary) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Cart summary"
      data-testid="pos-cart-bar"
      className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:hidden print:hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{summary.countLabel}</p>
          <p className="truncate text-lg font-bold tabular-nums text-navy-900">
            {summary.totalLabel}
          </p>
          {summary.warning ? (
            <p className="text-xs font-medium text-rose-700">{summary.warning}</p>
          ) : null}
        </div>

        <Button
          variant="primary"
          icon={ShoppingCart}
          onClick={onViewCart}
          aria-label={summary.accessibleLabel}
          aria-controls={cartId}
          className="shrink-0"
        >
          View cart
        </Button>
      </div>
    </div>
  )
}
