import {
  CANCEL_REASON_MAX,
  cancelledUnitCount,
  describeCounterMoney,
  isLegacyCancellation,
  validateCancelReason,
} from '@/domain/saleCancellation'
import type { Sale } from '@/domain/types'
import { isSameDay, formatItemCount } from '@/features/sales/lib/salesMetrics'
import { formatCurrency, formatDateLabel, formatDateTimeShort, formatNumber } from '@/lib/format'

/**
 * Screen wording for cancelling a sale (spec 04 sale cancellation s.7). The
 * rules themselves live in src/domain/saleCancellation.ts and the store's
 * cancelSale; this file only turns a sale into the sentences the cashier reads.
 * Every figure comes from the sale (E3, E4).
 */

/** Shown on the sale page after a successful cancellation (s.7.2). */
export const SALE_CANCELLED_NOTICE = 'Sale cancelled. Stock returned.'

/** "Cancel sale #20261101-0007?" */
export function cancelDialogTitle(sale: Pick<Sale, 'saleNumber'>): string {
  return `Cancel sale ${sale.saleNumber}?`
}

/** "12/120" under the reason box. */
export function reasonCounter(reason: string): string {
  return `${reason.length}/${CANCEL_REASON_MAX}`
}

/** True when the typed reason is already too long, so the counter can warn before submit. */
export function isReasonTooLong(reason: string): boolean {
  return reason.trim().length > CANCEL_REASON_MAX
}

/** The validation message for the reason, or null when it is acceptable. */
export function cancelReasonError(reason: string): string | null {
  const result = validateCancelReason(reason)

  return result.ok ? null : (result.message ?? 'Give a reason for cancelling this sale.')
}

/** Distinct products on the sale: one reversal movement each. */
export function productCountOf(sale: Sale): number {
  return new Set(sale.lines.map((line) => line.productId)).size
}

export type CancelPreview = {
  title: string
  /** "₱631.00 · Pedro Santos · 5 items" pieces for the summary line. */
  total: string
  customer: string
  items: string
  /** What will happen, in order, as plain sentences. */
  consequences: string[]
}

/**
 * Everything the Cancel Sale dialog says before the cashier confirms (s.7.2):
 * stock back, out of the day's sales and reports, the customer's balance (for
 * partial and credit), and the money taken at the counter.
 */
export function buildCancelPreview(sale: Sale, now: Date): CancelPreview {
  const units = cancelledUnitCount(sale)
  const consequences = [
    `${formatItemCount(units)} ${units === 1 ? 'goes' : 'go'} back into stock.`,
    isSameDay(sale.occurredAt, now)
      ? 'It is removed from today’s sales and reports.'
      : `It is removed from the sales and reports for ${formatDateLabel(new Date(sale.occurredAt))}.`,
  ]

  if (sale.paymentMethod !== 'cash' && sale.balanceDue > 0) {
    consequences.push(
      `${sale.customerName}’s balance goes down by ${formatCurrency(sale.balanceDue)}.`,
    )
  }

  const counterMoney = describeCounterMoney(sale, formatCurrency)

  if (counterMoney) {
    consequences.push(counterMoney)
  }

  return {
    title: cancelDialogTitle(sale),
    total: formatCurrency(sale.total),
    customer: sale.customerName,
    items: formatItemCount(units),
    consequences,
  }
}

export type CancelledSummary = {
  /** "Cancelled May 21, 4:15 PM by Juan Dela Cruz." */
  headline: string
  /** "Reason: Customer changed his mind." */
  reason: string
  /**
   * "Stock returned: 5 items across 2 products." Null for a sale stored as
   * cancelled before this version (migration placeholder): no reversal was
   * written for it, so the app cannot say stock came back.
   */
  stockReturned: string | null
}

/** The banner on a cancelled sale's page (s.7.1), or null for a sale that stands. */
export function describeCancelledSale(sale: Sale): CancelledSummary | null {
  if (sale.status !== 'cancelled') {
    return null
  }

  const products = productCountOf(sale)
  const stockReturned = `Stock returned: ${formatItemCount(cancelledUnitCount(sale))} across ${formatNumber(products)} ${products === 1 ? 'product' : 'products'}.`

  // A sale stored as cancelled always carries a cancellation after migration;
  // read it defensively all the same, so an odd record still says Cancelled.
  if (!sale.cancellation) {
    return { headline: 'Cancelled.', reason: 'Reason: not recorded.', stockReturned: null }
  }

  const { cancelledAt, cancelledBy, reason } = sale.cancellation

  return {
    headline: `Cancelled ${formatDateTimeShort(new Date(cancelledAt))} by ${cancelledBy}.`,
    reason: `Reason: ${withFullStop(reason)}`,
    stockReturned: isLegacyCancellation(sale.cancellation) ? null : stockReturned,
  }
}

function withFullStop(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`
}
