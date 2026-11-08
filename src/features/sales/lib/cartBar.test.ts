import { describe, expect, it } from 'vitest'

import { cartBarSummary } from '@/features/sales/lib/cartBar'
import { formatCurrency } from '@/lib/format'

describe('cartBarSummary', () => {
  it('is hidden when the cart is empty', () => {
    expect(cartBarSummary({ itemCount: 0, total: 0 }, 0, 0)).toBeNull()
  })

  it('shows the item count and the total from centavos, with no VAT added', () => {
    const summary = cartBarSummary({ itemCount: 3, total: 123_450 }, 2, 0)

    expect(summary).toEqual({
      countLabel: '3 items',
      totalLabel: formatCurrency(123_450),
      warning: null,
      accessibleLabel: `View cart, 3 items, total ${formatCurrency(123_450)}`,
    })
  })

  it('uses the singular for one item', () => {
    expect(cartBarSummary({ itemCount: 1, total: 5000 }, 1, 0)?.countLabel).toBe('1 item')
  })

  it('still shows when only unavailable lines are left, so they can be removed', () => {
    const summary = cartBarSummary({ itemCount: 0, total: 0 }, 1, 1)

    expect(summary?.warning).toBe('1 unavailable item to remove')
    expect(summary?.accessibleLabel).toContain('1 unavailable item to remove')
  })

  it('counts several unavailable lines', () => {
    expect(cartBarSummary({ itemCount: 2, total: 1000 }, 4, 2)?.warning).toBe(
      '2 unavailable items to remove',
    )
  })
})
