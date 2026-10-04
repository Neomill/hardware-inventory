import {
  HELD_SALE_LABEL_MAX,
  HELD_SALE_LIMIT,
  HOLD_LABEL_TOO_LONG_MESSAGE,
  HOLD_LIMIT_MESSAGE,
  describeAdjustment,
  describePriceChange,
  findPriceChanges,
  heldSaleEstimatedTotal,
  heldSaleItemCount,
  normalizeHeldSaleLabel,
  reconcileCartWithStock,
  sortHeldSalesNewestFirst,
} from '@/domain/heldSale'
import type { Centavos } from '@/domain/money'
import type { CartAdjustment, CartLine, HeldSale, Product } from '@/domain/types'
import { formatCurrency, formatDateTimeShort, formatFromDay, formatTime } from '@/lib/format'
import { formatItemCount } from '@/features/sales/lib/salesMetrics'

export const HELD_SALE_FALLBACK_TITLE = 'Held sale'
export const HOLD_NEEDS_ITEMS_HINT = 'Add items before holding'
export const NOTHING_SELLABLE_TEXT = 'None of these items can be sold now'

/** "Held Sales, 2 waiting": the Sales root button's accessible name (spec 7.1). */
export function heldSalesButtonName(count: number): string {
  return count === 0 ? 'Held Sales, none waiting' : `Held Sales, ${count} waiting`
}

/** Whether Hold Sale can be used now, and the reason shown when it cannot (spec 7.4). */
export function holdAvailability(
  cartLineCount: number,
  heldCount: number,
): { canHold: boolean; reason: string | null } {
  if (cartLineCount <= 0) {
    return { canHold: false, reason: HOLD_NEEDS_ITEMS_HINT }
  }

  if (heldCount >= HELD_SALE_LIMIT) {
    return { canHold: false, reason: HOLD_LIMIT_MESSAGE }
  }

  return { canHold: true, reason: null }
}

/**
 * The label field's inline error: more than 40 characters (after trimming) is
 * refused with a message, never silently cut (spec 5.1 rule 3).
 */
export function heldLabelError(text: string): string | null {
  const label = normalizeHeldSaleLabel(text)

  return label !== null && label.length > HELD_SALE_LABEL_MAX ? HOLD_LABEL_TOO_LONG_MESSAGE : null
}

/** "12/40": the label field's counter. */
export function labelCounter(text: string): string {
  return `${text.length}/${HELD_SALE_LABEL_MAX}`
}

/**
 * "PVC Pipe 1/2, Cement (Holcim) +3 more": the first few product names, then
 * how many more lines there are.
 */
export function summarizeHeldItems(held: HeldSale, shown = 2): string {
  const names = held.lines.slice(0, shown).map((line) => line.productName)
  const more = held.lines.length - names.length

  return more > 0 ? `${names.join(', ')} +${more} more` : names.join(', ')
}

/** "10:42 AM" for a sale held today, "May 20, 4:15 PM" for an earlier day (spec 5.7). */
export function formatHeldAt(heldAt: string, now: Date): string {
  const date = new Date(heldAt)

  return formatFromDay(heldAt, now) === null ? formatTime(date) : formatDateTimeShort(date)
}

export type HeldSaleRow = {
  id: string
  title: string
  heldAtText: string
  /** "From May 20" for a sale held on an earlier day, else null. */
  fromDay: string | null
  itemCount: number
  /** "5 items: PVC Pipe 1/2, Cement +3 more" */
  itemsText: string
  estimatedTotal: Centavos
  /** What resuming would change, in the sentences the POS page shows. */
  stockChanges: string[]
  priceChanges: string[]
  /** False when no line could be sold now (spec 5.3 rule 4). */
  canResume: boolean
}

/** One row of the Held Sales list, every figure from current store data (E3, E4). */
export function buildHeldSaleRow(held: HeldSale, products: Product[], now: Date): HeldSaleRow {
  const reconciled = reconcileCartWithStock(held.lines, products)
  const itemCount = heldSaleItemCount(held)

  return {
    id: held.id,
    title: held.label ?? HELD_SALE_FALLBACK_TITLE,
    heldAtText: formatHeldAt(held.heldAt, now),
    fromDay: formatFromDay(held.heldAt, now),
    itemCount,
    itemsText: `${formatItemCount(itemCount)}: ${summarizeHeldItems(held)}`,
    estimatedTotal: heldSaleEstimatedTotal(held, products),
    stockChanges: reconciled.adjustments.map(describeAdjustment),
    priceChanges: findPriceChanges(held, products).map((change) =>
      describePriceChange(change, formatCurrency),
    ),
    canResume: reconciled.lines.length > 0,
  }
}

/** The Held Sales list, newest first (spec 5.7). */
export function buildHeldSaleRows(
  heldSales: HeldSale[],
  products: Product[],
  now: Date,
): HeldSaleRow[] {
  return sortHeldSalesNewestFirst(heldSales).map((held) => buildHeldSaleRow(held, products, now))
}

/** What the POS page lists after the cart changed under the cashier (spec 7.3). */
export type CartNotice = {
  title: string
  items: string[]
}

/**
 * The notice after a resume or swap: every stock adjustment, then every price
 * change. Null when nothing changed, so no empty notice is shown.
 */
export function buildResumeNotice(
  adjustments: CartAdjustment[],
  priceChanges: string[],
): CartNotice | null {
  const items = [...adjustments.map(describeAdjustment), ...priceChanges]

  return items.length === 0 ? null : { title: 'The resumed sale changed since it was held:', items }
}

/** Notice for the live cart corrected to current stock when the POS page opens (spec 5.5). */
export function buildLiveCartNotice(adjustments: CartAdjustment[]): CartNotice | null {
  return adjustments.length === 0
    ? null
    : {
        title: 'The cart was updated to match current stock:',
        items: adjustments.map(describeAdjustment),
      }
}

export type CartRepair =
  | { kind: 'remove'; productId: string }
  | { kind: 'set_quantity'; productId: string; quantity: number }

/**
 * Brings the live cart in line with current stock (spec 5.5) using the same
 * rules as a resume. Returns the store actions to apply and the adjustments to
 * show; both are empty when the cart is already sellable.
 */
export function planCartRepair(
  cart: CartLine[],
  products: Product[],
): { repairs: CartRepair[]; adjustments: CartAdjustment[] } {
  const { adjustments } = reconcileCartWithStock(cart, products)

  return {
    adjustments,
    repairs: adjustments.map((adjustment) =>
      adjustment.kind === 'reduced'
        ? { kind: 'set_quantity', productId: adjustment.productId, quantity: adjustment.to }
        : { kind: 'remove', productId: adjustment.productId },
    ),
  }
}

export type SalesRootNavState = { notice: string }
export type PosNavState = { cartNotice: CartNotice }

/** The success notice handed to the Sales root through router state ("Sale held."). */
export function readSalesRootNotice(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) {
    return null
  }

  const notice = (state as Partial<SalesRootNavState>).notice

  return typeof notice === 'string' && notice !== '' ? notice : null
}

/** The resume notice handed to the POS page through router state, if it is well formed. */
export function readPosCartNotice(state: unknown): CartNotice | null {
  if (typeof state !== 'object' || state === null) {
    return null
  }

  const notice = (state as Partial<PosNavState>).cartNotice

  if (
    typeof notice !== 'object' ||
    notice === null ||
    typeof notice.title !== 'string' ||
    !Array.isArray(notice.items) ||
    !notice.items.every((item) => typeof item === 'string')
  ) {
    return null
  }

  return { title: notice.title, items: notice.items }
}
