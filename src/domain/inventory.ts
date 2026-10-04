import { byOccurredAt, isWithinRange, type DateRange } from '@/domain/dates'
import { nextSequentialId } from '@/domain/ids'
import type { MovementType, Product, Sale, StockMovement, ValidationResult } from '@/domain/types'

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  stock_in: 'Stock In',
  sale: 'Sale',
  sale_reversal: 'Reversal',
  adjustment: 'Adjustment',
}

/** Supplier invoices are "INV-10021": five digits, never a sale number (E6). */
const SUPPLIER_INVOICE = /^INV-\d{5}$/

/**
 * "inv-10021 " becomes "INV-10021". Null when it cannot be a supplier invoice
 * number, so a typo is caught instead of stored.
 */
export function normalizeSupplierInvoice(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase()

  return SUPPLIER_INVOICE.test(cleaned) ? cleaned : null
}

/** Quantities are whole selling units (D2). */
export function isWholePositiveQuantity(quantity: number): boolean {
  return Number.isSafeInteger(quantity) && quantity > 0
}

export function validateStockReceipt(input: {
  quantity: number
  supplierInvoice?: string
}): ValidationResult {
  if (!isWholePositiveQuantity(input.quantity)) {
    return { ok: false, message: 'Enter a whole number of units greater than zero.' }
  }

  if (
    input.supplierInvoice !== undefined &&
    input.supplierInvoice.trim() !== '' &&
    normalizeSupplierInvoice(input.supplierInvoice) === null
  ) {
    return { ok: false, message: 'Supplier invoice numbers look like INV-10021.' }
  }

  return { ok: true, message: null }
}

/**
 * A manual correction: a whole, non-zero change with a stated reason, that
 * never takes stock below zero (inventory can never be negative).
 */
export function validateStockAdjustment(input: {
  currentStock: number
  quantityDelta: number
  reason: string
}): ValidationResult {
  const { currentStock, quantityDelta, reason } = input

  if (!Number.isSafeInteger(quantityDelta) || quantityDelta === 0) {
    return { ok: false, message: 'Enter a whole number of units to add or remove.' }
  }

  if (reason.trim() === '') {
    return { ok: false, message: 'Give a reason for this adjustment.' }
  }

  if (currentStock + quantityDelta < 0) {
    return {
      ok: false,
      message: `Only ${currentStock} on hand. Stock cannot go below zero.`,
    }
  }

  return { ok: true, message: null }
}

export type MovementFilter = {
  productId?: string
  /** Any of these types. Empty or missing means every type. */
  types?: MovementType[]
  range?: DateRange
}

/** Matching movements, newest first, which is how the movement log reads. */
export function filterMovements(
  movements: StockMovement[],
  filter: MovementFilter = {},
): StockMovement[] {
  const { productId, types, range } = filter

  return movements
    .filter(
      (movement) =>
        (productId === undefined || movement.productId === productId) &&
        (!types || types.length === 0 || types.includes(movement.type)) &&
        isWithinRange(movement.occurredAt, range),
    )
    .sort((a, b) => byOccurredAt(b, a))
}

export type MovementTotals = {
  received: number
  sold: number
  reversed: number
  /** Net of every adjustment, signed. */
  adjusted: number
  /** Sum of every delta, signed. */
  net: number
}

/** Units in and out across a set of movements, e.g. one product's history. */
export function summarizeMovements(movements: StockMovement[]): MovementTotals {
  const totals: MovementTotals = { received: 0, sold: 0, reversed: 0, adjusted: 0, net: 0 }

  for (const movement of movements) {
    totals.net += movement.quantityDelta

    if (movement.type === 'stock_in') {
      totals.received += movement.quantityDelta
    } else if (movement.type === 'sale') {
      totals.sold += -movement.quantityDelta
    } else if (movement.type === 'sale_reversal') {
      totals.reversed += movement.quantityDelta
    } else {
      totals.adjusted += movement.quantityDelta
    }
  }

  return totals
}

/**
 * Opening stock convention. Stock changes only through movements, so the
 * quantity a product had on hand before any recorded history is itself a
 * movement: type 'stock_in' (it is stock coming onto the books), reference
 * "OPENING", description "Opening stock", no reason, dated before everything
 * else for that product. With it, the sum of a product's movements always
 * equals its stock. It counts as "received" in summarizeMovements.
 */
export const OPENING_STOCK_REFERENCE = 'OPENING'
export const OPENING_STOCK_DESCRIPTION = 'Opening stock'

export function isOpeningStockMovement(movement: StockMovement): boolean {
  return movement.type === 'stock_in' && movement.reference === OPENING_STOCK_REFERENCE
}

export function buildOpeningStockMovement(input: {
  productId: string
  quantity: number
  occurredAt: string
  recordedBy: string
}): StockMovement {
  return {
    id: `MOV-OPEN-${input.productId}`,
    productId: input.productId,
    type: 'stock_in',
    quantityDelta: input.quantity,
    reference: OPENING_STOCK_REFERENCE,
    description: OPENING_STOCK_DESCRIPTION,
    reason: null,
    note: null,
    recordedBy: input.recordedBy,
    occurredAt: input.occurredAt,
  }
}

/** A product's stock as its movements tell it: the signed sum of every delta. */
export function stockFromMovements(movements: StockMovement[], productId: string): number {
  return movements.reduce(
    (sum, movement) => (movement.productId === productId ? sum + movement.quantityDelta : sum),
    0,
  )
}

export const RECONCILED_BY = 'System'
export const RECONCILE_REASON = 'Reconciled with recorded stock'

/**
 * Makes every product's movements add up to its stock without touching the
 * stock itself. A product short of its stock gets an opening-stock movement
 * dated a minute before the earliest sale or movement (data recorded before
 * opening stock was a movement). A product whose movements add up to more
 * than its stock -- or that already has an opening movement -- gets an
 * adjustment dated `now` with RECONCILE_REASON, since an opening balance
 * cannot be negative. Returns the same array when nothing is missing.
 */
export function reconcileOpeningStock(input: {
  products: Product[]
  movements: StockMovement[]
  sales: Sale[]
  now: Date
}): StockMovement[] {
  const { products, movements, sales, now } = input
  const gaps = products
    .map((product) => ({
      productId: product.id,
      gap: product.stock - stockFromMovements(movements, product.id),
    }))
    .filter(({ gap }) => gap !== 0)

  if (gaps.length === 0) {
    return movements
  }

  const times = [...movements, ...sales]
    .map((record) => Date.parse(record.occurredAt))
    .filter((time) => !Number.isNaN(time))
  const earliest = times.length > 0 ? Math.min(...times) : now.getTime()
  const openedAt = new Date(earliest - 60_000).toISOString()

  const usedIds = new Set(movements.map((movement) => movement.id))
  const references = movements.map((movement) => movement.reference)
  const openings: StockMovement[] = []
  const corrections: StockMovement[] = []

  for (const { productId, gap } of gaps) {
    const opening = buildOpeningStockMovement({
      productId,
      quantity: gap,
      occurredAt: openedAt,
      recordedBy: RECONCILED_BY,
    })

    if (gap > 0 && !usedIds.has(opening.id)) {
      openings.push(opening)
      continue
    }

    const reference = nextSequentialId('ADJ-', references, 5)
    references.push(reference)

    corrections.push({
      id: `MOV-${reference}`,
      productId,
      type: 'adjustment',
      quantityDelta: gap,
      reference,
      description: `Adjusted: ${RECONCILE_REASON}`,
      reason: RECONCILE_REASON,
      note: null,
      recordedBy: RECONCILED_BY,
      occurredAt: now.toISOString(),
    })
  }

  return [...openings, ...movements, ...corrections]
}
