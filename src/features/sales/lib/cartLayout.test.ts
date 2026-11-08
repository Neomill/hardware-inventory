import { describe, expect, it } from 'vitest'

import {
  CART_BOTTOM_GAP_PX,
  CART_MIN_HEIGHT_PX,
  CART_STICKY_TOP_PX,
  canProceedToCheckout,
  stickyPanelMaxHeight,
} from '@/features/sales/lib/cartLayout'

describe('stickyPanelMaxHeight', () => {
  it('fills the space under the column when the page has not scrolled', () => {
    expect(stickyPanelMaxHeight({ viewportBottom: 880, panelTop: 120 })).toBe(
      880 - 120 - CART_BOTTOM_GAP_PX,
    )
  })

  it('gets the full height once the column sticks at the top', () => {
    expect(stickyPanelMaxHeight({ viewportBottom: 880, panelTop: CART_STICKY_TOP_PX })).toBe(
      880 - CART_STICKY_TOP_PX - CART_BOTTOM_GAP_PX,
    )
  })

  it('does not grow while the column is pushed up', () => {
    expect(stickyPanelMaxHeight({ viewportBottom: 880, panelTop: -200 })).toBe(
      880 - CART_STICKY_TOP_PX - CART_BOTTOM_GAP_PX,
    )
  })

  it('ends with the product grid at the end of the page, so its header stays in view', () => {
    const beside = { top: -3000, bottom: 740 }

    expect(stickyPanelMaxHeight({ viewportBottom: 880, panelTop: -100, beside })).toBe(
      740 - CART_STICKY_TOP_PX,
    )
  })

  it('ignores a product grid that ends below the visible area', () => {
    const beside = { top: -500, bottom: 5000 }

    expect(stickyPanelMaxHeight({ viewportBottom: 880, panelTop: 16, beside })).toBe(
      880 - 16 - CART_BOTTOM_GAP_PX,
    )
  })

  it('ignores a product grid shorter than the cart (a narrow search), which never pushes it', () => {
    const beside = { top: 120, bottom: 360 }

    expect(stickyPanelMaxHeight({ viewportBottom: 880, panelTop: 120, beside })).toBe(
      880 - 120 - CART_BOTTOM_GAP_PX,
    )
  })

  it('never goes below the minimum on a short window', () => {
    expect(stickyPanelMaxHeight({ viewportBottom: 400, panelTop: 120 })).toBe(CART_MIN_HEIGHT_PX)
  })

  it('rounds down to whole pixels', () => {
    expect(stickyPanelMaxHeight({ viewportBottom: 800.6, panelTop: 100.2, minHeight: 0 })).toBe(684)
  })
})

describe('canProceedToCheckout', () => {
  it('needs a sellable line', () => {
    expect(canProceedToCheckout(0, 0)).toBe(false)
    expect(canProceedToCheckout(2, 0)).toBe(true)
  })

  it('is blocked while an unavailable line is in the cart', () => {
    expect(canProceedToCheckout(2, 1)).toBe(false)
  })
})
