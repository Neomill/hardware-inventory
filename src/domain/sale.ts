import { breakDownVat, type Centavos, type VatBreakdown } from '@/domain/money'
import { toDayKey } from '@/domain/dates'
import type { CartLine, PaymentMethod, Sale, SaleLine } from '@/domain/types'

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  partial: 'Partial',
  credit: 'Credit',
}

export type SaleTotals = {
  itemCount: number
  lineCount: number
  subtotal: Centavos
  discountAmount: Centavos
  total: Centavos
  vat: VatBreakdown
}

export function computeSaleTotals(
  lines: SaleLine[],
  discountAmount: Centavos,
  taxRate: number,
): SaleTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  // A discount can never exceed the subtotal, so a total is never negative.
  const discount = Math.min(Math.max(discountAmount, 0), subtotal)
  const total = subtotal - discount

  return {
    itemCount: lines.reduce((count, line) => count + line.quantity, 0),
    lineCount: lines.length,
    subtotal,
    discountAmount: discount,
    total,
    vat: breakDownVat(total, taxRate),
  }
}

export function computeChange(total: Centavos, amountPaid: Centavos): Centavos {
  return Math.max(0, amountPaid - total)
}

/**
 * What the customer still owes after this payment. Cash never leaves a
 * balance; credit leaves the whole total.
 */
export function computeBalanceDue(
  method: PaymentMethod,
  total: Centavos,
  amountPaid: Centavos,
): Centavos {
  if (method === 'cash') {
    return 0
  }

  return Math.max(0, total - amountPaid)
}

export type PaymentValidation = {
  ok: boolean
  message: string | null
}

/**
 * The rules a cashier can trip over, in plain words. Credit and partial
 * payments require a named customer: a walk-in has no ledger, so an
 * unattributed balance could never be collected (E5).
 */
export function validatePayment(input: {
  method: PaymentMethod
  total: Centavos
  amountPaid: Centavos
  customerId: string | null
  lineCount: number
}): PaymentValidation {
  const { method, total, amountPaid, customerId, lineCount } = input

  if (lineCount === 0) {
    return { ok: false, message: 'Add at least one item before taking payment.' }
  }

  // Whole centavos, never negative: NaN or 0.5 centavos is a keypad slip, not money.
  if (!Number.isSafeInteger(amountPaid) || amountPaid < 0) {
    return { ok: false, message: 'Enter a valid amount.' }
  }

  if (method !== 'cash' && !customerId) {
    return {
      ok: false,
      message: 'Choose a customer. A balance cannot be recorded for a walk-in customer.',
    }
  }

  if (method === 'cash' && amountPaid < total) {
    return { ok: false, message: 'Cash received is less than the total due.' }
  }

  // A credit sale takes no money at the counter; the whole total goes on the ledger.
  if (method === 'credit' && amountPaid !== 0) {
    return {
      ok: false,
      message: 'A credit sale takes no payment now. Use Partial Payment instead.',
    }
  }

  if (method === 'partial' && amountPaid <= 0) {
    return { ok: false, message: 'Enter how much the customer is paying now.' }
  }

  if (method === 'partial' && amountPaid >= total) {
    return {
      ok: false,
      message: 'That covers the full amount. Use Cash instead of Partial Payment.',
    }
  }

  return { ok: true, message: null }
}

/** "#20250521-0042" -- date stamp plus the sale's number within that day. */
export function formatSaleNumber(date: Date, sequence: number): string {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')

  return `#${stamp}-${String(sequence).padStart(4, '0')}`
}

/** The sequence part of "#20250521-0042" (42). Null when the number is not in that form. */
export function parseSaleSequence(saleNumber: string): number | null {
  const match = /^#\d{8}-(\d{4,})$/.exec(saleNumber)

  return match ? Number(match[1]) : null
}

/**
 * The next per-day sequence for a sale made at `date`: one more than the
 * highest number already used that local day, so a live sale continues after
 * the seeded ones and the next day starts again at 0001.
 */
export function nextSaleSequence(sales: Sale[], date: Date): number {
  const day = toDayKey(date)
  let highest = 0

  for (const sale of sales) {
    if (toDayKey(sale.occurredAt) !== day) {
      continue
    }

    highest = Math.max(highest, parseSaleSequence(sale.saleNumber) ?? 0)
  }

  // Count too, in case an older record carries a number in another form.
  const sameDay = sales.filter((sale) => toDayKey(sale.occurredAt) === day).length

  return Math.max(highest, sameDay) + 1
}

/**
 * One line per product, in first-seen order, quantities added together. A
 * cart restored from storage or built by hand can repeat a product; the sale
 * and its stock movements must still agree line for line.
 */
export function mergeCartLines(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>()

  for (const line of lines) {
    const existing = merged.get(line.productId)

    merged.set(
      line.productId,
      existing
        ? { ...existing, quantity: existing.quantity + line.quantity }
        : { productId: line.productId, quantity: line.quantity },
    )
  }

  return [...merged.values()]
}
