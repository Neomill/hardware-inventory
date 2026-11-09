import type { Centavos } from '@/domain/money'
import type { Sale } from '@/domain/types'

/** One line of the receipt's payment block: a figure, or words where a figure would mislead. */
export type ReceiptPaymentRow =
  { label: string; amount: Centavos } | { label: string; text: string }

/** Wording for a credit sale, where nothing is taken at the counter. */
export const CREDIT_PAYMENT_TEXT = 'On credit, charged to account'

/**
 * The payment lines of a receipt, from the sale as recorded at the counter.
 *
 * - Cash: what was tendered and the change.
 * - Partial: what was paid at the counter and the balance charged to the
 *   customer's account.
 * - Credit: nothing was paid, so there is no "Paid ... 0.00" line; the receipt
 *   says the sale went on account and shows the balance charged.
 *
 * "Balance at time of sale" is frozen; later customer payments are separate
 * records and the page shows them as "Balance now".
 */
export function receiptPaymentRows(sale: Sale): ReceiptPaymentRow[] {
  switch (sale.paymentMethod) {
    case 'cash':
      return [
        { label: 'Paid by Cash', amount: sale.amountPaid },
        { label: 'Change', amount: sale.changeGiven },
      ]
    case 'partial':
      return [
        { label: 'Paid at counter', amount: sale.amountPaid },
        { label: 'Balance at time of sale', amount: sale.balanceDue },
      ]
    case 'credit':
      return [
        { label: 'Payment', text: CREDIT_PAYMENT_TEXT },
        { label: 'Balance at time of sale', amount: sale.balanceDue },
      ]
  }
}

/**
 * What the sale did, under the receipt of a standing sale. Straight after
 * checkout it confirms what just happened; opened later from the sales
 * history it states the same facts without "just completed" wording.
 */
export function saleRecordNote(sale: Sale, justCompleted: boolean): string {
  const productCount = sale.lines.length
  const products = `${productCount} product${productCount === 1 ? '' : 's'}`
  const owing = sale.balanceDue > 0

  if (justCompleted) {
    return `Stock was reduced for ${products} and this sale is recorded in the sales history${
      owing ? ', with the unpaid balance added to Customer Credit' : ''
    }.`
  }

  return `This sale reduced stock for ${products}${
    owing ? ' and added its unpaid balance to Customer Credit' : ''
  }.`
}

/** Router state CheckoutPage hands the sale page, so it can say "Sale Completed". */
export type SaleCompletedNavState = { completed: true }

/** True only when the page was reached from a confirmed checkout. */
export function readJustCompleted(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as Partial<SaleCompletedNavState>).completed === true
  )
}
