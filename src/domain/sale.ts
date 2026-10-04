import { breakDownVat, type Centavos, type VatBreakdown } from '@/domain/money'
import type { PaymentMethod, SaleLine } from '@/domain/types'

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

  if (method !== 'cash' && !customerId) {
    return {
      ok: false,
      message: 'Choose a customer. A balance cannot be recorded for a walk-in customer.',
    }
  }

  if (method === 'cash' && amountPaid < total) {
    return { ok: false, message: 'Cash received is less than the total due.' }
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
