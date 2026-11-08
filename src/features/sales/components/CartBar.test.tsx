import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CartBar } from '@/features/sales/components/CartBar'
import { cartBarSummary } from '@/features/sales/lib/cartBar'
import { formatCurrency } from '@/lib/format'

function render(summary: ReturnType<typeof cartBarSummary>): string {
  return renderToString(<CartBar summary={summary} cartId="pos-cart" onViewCart={() => {}} />)
}

describe('CartBar', () => {
  it('renders nothing for an empty cart', () => {
    expect(render(cartBarSummary({ itemCount: 0, total: 0 }, 0, 0))).toBe('')
  })

  it('shows the count, the total and a labelled button that points at the cart', () => {
    const html = render(cartBarSummary({ itemCount: 4, total: 98_765 }, 2, 0))

    expect(html).toContain('4 items')
    expect(html).toContain(formatCurrency(98_765))
    expect(html).toContain('aria-controls="pos-cart"')
    expect(html).toContain('aria-label="View cart, 4 items, total')
    expect(html).toContain('View cart')
  })

  it('is hidden at xl (cart beside the grid) and in print', () => {
    const html = render(cartBarSummary({ itemCount: 1, total: 100 }, 1, 0))

    expect(html).toMatch(/class="[^"]*\bsticky\b[^"]*\bxl:hidden\b[^"]*\bprint:hidden\b/)
  })

  it('warns about unavailable lines', () => {
    expect(render(cartBarSummary({ itemCount: 0, total: 0 }, 1, 1))).toContain(
      '1 unavailable item to remove',
    )
  })
})
