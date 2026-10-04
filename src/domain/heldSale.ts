import { startOfDay } from '@/domain/dates'
import type { Centavos } from '@/domain/money'
import type {
  CartAdjustment,
  CartLine,
  HeldSale,
  HeldSaleLine,
  Product,
  ValidationResult,
} from '@/domain/types'

/**
 * Hold Sale (specs/03/03-hold-sale-spec.md, decision D6). A held sale is a
 * cart set aside: it records nothing and reserves no stock. Its lines are
 * checked against current stock when it is resumed.
 */

/** At most this many held sales at once (Q2). Stored data above it is kept. */
export const HELD_SALE_LIMIT = 10
export const HELD_SALE_LABEL_MAX = 40

/** Shown for a held line whose product no longer exists. */
export const UNKNOWN_PRODUCT_NAME = 'Unknown product'

export const HOLD_EMPTY_MESSAGE = 'There is nothing to hold yet.'
export const HOLD_LIMIT_MESSAGE = `You already have ${HELD_SALE_LIMIT} held sales. Resume or discard one first.`
export const HOLD_LABEL_TOO_LONG_MESSAGE = `Keep the label to ${HELD_SALE_LABEL_MAX} characters.`
export const HELD_SALE_MISSING_MESSAGE = 'That held sale is no longer here.'
export const HELD_SALE_UNSELLABLE_MESSAGE = 'None of the items in this held sale can be sold now.'

/** Trimmed; blank or missing is null. Length is checked by validateHold, not cut here. */
export function normalizeHeldSaleLabel(raw: string | undefined): string | null {
  const trimmed = raw?.trim() ?? ''

  return trimmed === '' ? null : trimmed
}

export function validateHold(input: {
  cartLineCount: number
  heldCount: number
  label?: string
}): ValidationResult {
  if (input.cartLineCount <= 0) {
    return { ok: false, message: HOLD_EMPTY_MESSAGE }
  }

  if (input.heldCount >= HELD_SALE_LIMIT) {
    return { ok: false, message: HOLD_LIMIT_MESSAGE }
  }

  const label = normalizeHeldSaleLabel(input.label)

  if (label !== null && label.length > HELD_SALE_LABEL_MAX) {
    return { ok: false, message: HOLD_LABEL_TOO_LONG_MESSAGE }
  }

  return { ok: true, message: null }
}

/** "HOLD-<ms>", then "-2", "-3" ... when that id is already taken. */
export function nextHeldSaleId(now: Date, existingIds: string[]): string {
  const base = `HOLD-${now.getTime()}`
  const taken = new Set(existingIds)

  if (!taken.has(base)) {
    return base
  }

  let suffix = 2

  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}

/**
 * The cart as a held sale. Each line copies the product's current name and
 * price, for the list and for the price-change warning only.
 */
export function buildHeldSale(input: {
  cart: CartLine[]
  products: Product[]
  label: string | null
  heldBy: string
  now: Date
  existingIds: string[]
}): HeldSale {
  const { cart, products, label, heldBy, now, existingIds } = input

  return {
    id: nextHeldSaleId(now, existingIds),
    label,
    lines: cart.map((line): HeldSaleLine => {
      const product = products.find((candidate) => candidate.id === line.productId)

      return {
        productId: line.productId,
        quantity: line.quantity,
        productName: product?.name ?? UNKNOWN_PRODUCT_NAME,
        unitPrice: product?.price ?? 0,
      }
    }),
    heldAt: now.toISOString(),
    heldBy,
  }
}

/**
 * Checks cart lines against the products as they are now, line by line and in
 * order: a missing, inactive or out-of-stock product's line is removed; a
 * quantity above stock is reduced to it; anything else is kept unchanged (a
 * quantity is never raised). Every change is reported. Works for any cart; a
 * held line's copied name is used when its product no longer exists.
 */
export function reconcileCartWithStock(
  lines: (CartLine & { productName?: string })[],
  products: Product[],
): { lines: CartLine[]; adjustments: CartAdjustment[] } {
  const kept: CartLine[] = []
  const adjustments: CartAdjustment[] = []

  for (const line of lines) {
    const product = products.find((candidate) => candidate.id === line.productId)

    if (!product) {
      adjustments.push({
        kind: 'removed_missing',
        productId: line.productId,
        productName: line.productName ?? UNKNOWN_PRODUCT_NAME,
        quantity: line.quantity,
      })
      continue
    }

    const removed = { productId: product.id, productName: product.name, quantity: line.quantity }

    if (!product.isActive) {
      adjustments.push({ kind: 'removed_inactive', ...removed })
      continue
    }

    if (product.stock <= 0) {
      adjustments.push({ kind: 'removed_out_of_stock', ...removed })
      continue
    }

    if (line.quantity > product.stock) {
      adjustments.push({
        kind: 'reduced',
        productId: product.id,
        productName: product.name,
        from: line.quantity,
        to: product.stock,
        unit: product.unit,
      })
      kept.push({ productId: product.id, quantity: product.stock })
      continue
    }

    kept.push({ productId: line.productId, quantity: line.quantity })
  }

  return { lines: kept, adjustments }
}

/** The sentence shown to the cashier for one change (spec section 7.3). */
export function describeAdjustment(adjustment: CartAdjustment): string {
  switch (adjustment.kind) {
    case 'reduced':
      return `${adjustment.productName}: reduced from ${adjustment.from} to ${adjustment.to} ${adjustment.unit}, only ${adjustment.to} left in stock.`
    case 'removed_out_of_stock':
      return `${adjustment.productName} removed: out of stock.`
    case 'removed_inactive':
      return `${adjustment.productName} removed: no longer for sale.`
    case 'removed_missing':
      return `${adjustment.productName} removed: no longer in the product list.`
  }
}

/** Units across every line. */
export function heldSaleItemCount(held: HeldSale): number {
  return held.lines.reduce((count, line) => count + line.quantity, 0)
}

/**
 * Roughly what the held sale would cost now: held quantities at current
 * prices. Lines whose product no longer exists count as nothing. Whole
 * centavos, since prices and quantities are whole.
 */
export function heldSaleEstimatedTotal(held: HeldSale, products: Product[]): Centavos {
  return held.lines.reduce((sum, line) => {
    const product = products.find((candidate) => candidate.id === line.productId)

    return product ? sum + product.price * line.quantity : sum
  }, 0)
}

export type HeldPriceChange = {
  productId: string
  productName: string
  heldPrice: Centavos
  currentPrice: Centavos
}

/** Lines whose product's price is not what it was when held (Q5). Missing products are skipped. */
export function findPriceChanges(held: HeldSale, products: Product[]): HeldPriceChange[] {
  const changes: HeldPriceChange[] = []

  for (const line of held.lines) {
    const product = products.find((candidate) => candidate.id === line.productId)

    if (product && product.price !== line.unitPrice) {
      changes.push({
        productId: product.id,
        productName: product.name,
        heldPrice: line.unitPrice,
        currentPrice: product.price,
      })
    }
  }

  return changes
}

/**
 * "Cement (Holcim) is now PHP 265.00 (was PHP 260.00 when held)." The money
 * formatter is passed in (formatCurrency from '@/lib/format') so the domain
 * stays free of display code.
 */
export function describePriceChange(
  change: HeldPriceChange,
  formatMoney: (amount: Centavos) => string,
): string {
  return `${change.productName} is now ${formatMoney(change.currentPrice)} (was ${formatMoney(change.heldPrice)} when held).`
}

/** True when the sale was held on an earlier local day than `now` (it gets a "From <day>" marker). */
export function isHeldBeforeToday(held: Pick<HeldSale, 'heldAt'>, now: Date): boolean {
  return new Date(held.heldAt).getTime() < startOfDay(now).getTime()
}

/** Newest first, as the Held Sales list shows them. Does not change the input. */
export function sortHeldSalesNewestFirst(heldSales: HeldSale[]): HeldSale[] {
  return [...heldSales].sort((a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime())
}
