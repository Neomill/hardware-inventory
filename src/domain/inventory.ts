import { byOccurredAt, isWithinRange, type DateRange } from '@/domain/dates'
import type { MovementType, StockMovement, ValidationResult } from '@/domain/types'

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
