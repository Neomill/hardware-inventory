import type { Centavos } from '@/domain/money'
import type { CustomerPayment } from '@/domain/types'
import { formatCurrency } from '@/lib/format'

/** Success line after a payment, stating the new balance so the cashier can tell the customer. */
export function describePaymentRecorded(payment: CustomerPayment, remaining: Centavos): string {
  const received = `${formatCurrency(payment.amount)} received from ${payment.customerName} (${payment.id}).`

  return remaining > 0
    ? `${received} Remaining balance ${formatCurrency(remaining)}.`
    : `${received} The account is now fully settled.`
}
