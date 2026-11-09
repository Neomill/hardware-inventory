/**
 * Where the POS cart lives and how tall it may be.
 *
 * At Tailwind's `xl` breakpoint the cart is a column beside the product grid;
 * below it the cart opens in a bottom sheet from the sticky cart bar. The page
 * renders exactly one of the two, so no control or id is ever duplicated.
 */
export const POS_CART_BESIDE_GRID_QUERY = '(min-width: 1280px)'

/** Gap kept between the sticky cart column and the top of the scroll area (`top-4`). */
export const CART_STICKY_TOP_PX = 16
/** Gap kept between the cart column and the bottom of the scroll area. */
export const CART_BOTTOM_GAP_PX = 16
/**
 * Below this the column stops shrinking: header and footer alone take about
 * 360px, so the lines keep some room on a short window and the page scrolls.
 */
export const CART_MIN_HEIGHT_PX = 420

type StickyHeightInput = {
  /** Bottom edge of the visible scroll area, in viewport pixels. */
  viewportBottom: number
  /** Current top edge of the cart column, in viewport pixels. */
  panelTop: number
  /**
   * The column beside the cart (the product grid), whose end is where the
   * sticky cart has to stop. Near the end of the page the cart shrinks to end
   * there rather than being pushed up and losing its header.
   */
  beside?: { top: number; bottom: number }
  stickyTop?: number
  bottomGap?: number
  minHeight?: number
}

/**
 * Tallest the sticky cart column can be and still show its footer (totals,
 * Proceed to Checkout, Pause Sale) inside the visible scroll area.
 *
 * Before the page scrolls, the column starts lower (under the page title), so
 * it is shorter; once it sticks at `stickyTop` it gets the full height. At
 * the very end of the page it ends where its container ends, so its header
 * stays in view too.
 */
export function stickyPanelMaxHeight({
  viewportBottom,
  panelTop,
  beside,
  stickyTop = CART_STICKY_TOP_PX,
  bottomGap = CART_BOTTOM_GAP_PX,
  minHeight = CART_MIN_HEIGHT_PX,
}: StickyHeightInput): number {
  const top = Math.max(panelTop, stickyTop)
  const visibleBottom = viewportBottom - bottomGap
  let available = visibleBottom - top

  // Only a column taller than the cart makes it stick and later push it up; a
  // shorter one just lets the grid grow to the cart's height.
  if (beside && beside.bottom - beside.top > available && beside.bottom < visibleBottom) {
    available = beside.bottom - top
  }

  return Math.max(Math.floor(available), minHeight)
}

/** Checkout needs at least one sellable line and no unavailable ones to remove. */
export function canProceedToCheckout(sellableLineCount: number, unavailableCount: number): boolean {
  return sellableLineCount > 0 && unavailableCount === 0
}
