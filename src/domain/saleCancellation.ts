import { RECONCILED_BY } from '@/domain/inventory'
import { chargedAmount, remainingBySale } from '@/domain/ledger'
import { formatPesoText, type Centavos } from '@/domain/money'
import type {
  CustomerPayment,
  Sale,
  SaleCancellation,
  StockMovement,
  ValidationResult,
} from '@/domain/types'

/**
 * Cancelling a completed sale (spec 04 sale cancellation, D8). The sale stays
 * in history, marked cancelled with who, when and why; its stock comes back
 * through one 'sale_reversal' movement per product; nothing is refunded.
 */

/** Same limit as the stock adjustment reason. */
export const CANCEL_REASON_MAX = 120

/** The settlement label of a cancelled sale: never "Paid" (spec s.5.5, s.7.3). */
export const CANCELLED_SALE_LABEL = 'Cancelled'

export const SALE_NOT_FOUND_MESSAGE = 'That sale is no longer here.'
export const SALE_ALREADY_CANCELLED_MESSAGE = 'This sale is already cancelled.'

/** The placeholder for a sale stored as cancelled before reasons were recorded (migration v2 to v3). */
export const LEGACY_CANCELLATION_REASON = 'Cancelled before reasons were recorded'

/**
 * The placeholder a sale stored as cancelled without a cancellation record gets
 * (migration v2 to v3, and on load): by RECONCILED_BY, with
 * LEGACY_CANCELLATION_REASON, dated `cancelledAt` (the sale's own time).
 */
export function buildLegacyCancellation(cancelledAt: string): SaleCancellation {
  return { cancelledAt, cancelledBy: RECONCILED_BY, reason: LEGACY_CANCELLATION_REASON }
}

/**
 * True only for that placeholder: the reason is LEGACY_CANCELLATION_REASON and
 * it was recorded by RECONCILED_BY. A cashier who typed the same words is not
 * a legacy cancellation. Screens use it to say the reason was never recorded.
 */
export function isLegacyCancellation(cancellation: SaleCancellation | null | undefined): boolean {
  return (
    cancellation !== null &&
    cancellation !== undefined &&
    cancellation.reason === LEGACY_CANCELLATION_REASON &&
    cancellation.cancelledBy === RECONCILED_BY
  )
}

export function isSaleCancelled(sale: Pick<Sale, 'status'>): boolean {
  return sale.status === 'cancelled'
}

/** Required, trimmed, at most CANCEL_REASON_MAX characters. */
export function validateCancelReason(raw: string): ValidationResult {
  const reason = raw.trim()

  if (reason === '') {
    return { ok: false, message: 'Give a reason for cancelling this sale.' }
  }

  if (reason.length > CANCEL_REASON_MAX) {
    return { ok: false, message: `Keep the reason under ${CANCEL_REASON_MAX} characters.` }
  }

  return { ok: true, message: null }
}

/**
 * Customer payments the ledger has applied to this sale: what it charged minus
 * what is still unpaid on it after the oldest-first allocation of
 * remainingBySale. 0 for cash, walk-in and cancelled sales, and for a sale
 * whose customer's payments were all used by older charges.
 */
export function appliedToSale(sale: Sale, sales: Sale[], payments: CustomerPayment[]): Centavos {
  const charged = chargedAmount(sale)

  if (charged <= 0) {
    return 0
  }

  const remaining = remainingBySale(sales, payments).get(sale.id) ?? charged

  return Math.max(charged - remaining, 0)
}

export type CancelCheck =
  { ok: true } | { ok: false; kind: 'already_cancelled' | 'payments_applied'; message: string }

/**
 * Whether the sale can be cancelled now (spec s.5.1, s.5.3). Blocked when it is
 * already cancelled, or when a customer payment has been applied to it -- that
 * money would otherwise belong to nothing. The reason is checked separately.
 * `formatMoney` defaults to "PHP 200.00"; screens pass formatCurrency.
 */
export function checkCancellable(
  sale: Sale,
  sales: Sale[],
  payments: CustomerPayment[],
  formatMoney: (amount: Centavos) => string = formatPesoText,
): CancelCheck {
  if (sale.status !== 'completed') {
    return { ok: false, kind: 'already_cancelled', message: SALE_ALREADY_CANCELLED_MESSAGE }
  }

  const applied = appliedToSale(sale, sales, payments)

  if (applied > 0) {
    return {
      ok: false,
      kind: 'payments_applied',
      message:
        `You can't cancel this sale. ${sale.customerName} has already paid ` +
        `${formatMoney(applied)} toward it (payments go to the oldest balance first). ` +
        'Leave the sale as it is and tell the owner. Refunds are not recorded in this version.',
    }
  }

  return { ok: true }
}

/**
 * One 'sale_reversal' per product on the sale (spec s.5.4), dated at the
 * cancellation, adding back what was sold. A product repeated across lines
 * (only possible in hand-built data) gets one movement for its total, so ids
 * stay unique.
 */
export function buildSaleReversalMovements(
  sale: Sale,
  cancellation: SaleCancellation,
): StockMovement[] {
  const quantities = new Map<string, number>()

  for (const line of sale.lines) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity)
  }

  return [...quantities].map(([productId, quantity]) => ({
    id: `MOV-REV-${sale.id}-${productId}`,
    productId,
    type: 'sale_reversal',
    quantityDelta: quantity,
    reference: sale.saleNumber,
    description: `Sale cancelled: ${cancellation.reason}`,
    reason: cancellation.reason,
    note: null,
    recordedBy: cancellation.cancelledBy,
    occurredAt: cancellation.cancelledAt,
  }))
}

const NO_REFUND_SENTENCE =
  'The app does not record refunds; any money returned to the customer is handled outside the app.'

/**
 * The sentence about money taken at the counter (spec s.5.6), or null when
 * none was taken (credit). Cash counts what was kept: tendered minus change.
 */
export function describeCounterMoney(
  sale: Sale,
  formatMoney: (amount: Centavos) => string = formatPesoText,
): string | null {
  if (sale.paymentMethod === 'cash') {
    const taken = sale.amountPaid - sale.changeGiven

    return taken > 0
      ? `${formatMoney(taken)} was taken at the counter. ${NO_REFUND_SENTENCE}`
      : null
  }

  if (sale.paymentMethod === 'partial' && sale.amountPaid > 0) {
    return `A down payment of ${formatMoney(sale.amountPaid)} was taken at the counter. ${NO_REFUND_SENTENCE}`
  }

  return null
}

/** Units the cancellation puts back on the shelf: the sum of the sale's line quantities. */
export function cancelledUnitCount(sale: Sale): number {
  return sale.lines.reduce((sum, line) => sum + line.quantity, 0)
}
