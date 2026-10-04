import { formatAmountInput, parseAmountInput, type Centavos } from '@/domain/money'
import { validatePayment } from '@/domain/sale'
import type { PaymentMethod } from '@/domain/types'

export const AMOUNT_FORMAT_MESSAGE = 'Enter an amount such as 500 or 1,250.50'
export const WALK_IN_BALANCE_MESSAGE =
  'Choose a customer. A balance cannot be recorded for a walk-in customer.'

/**
 * What the amount field holds: nothing yet, something that is not an amount
 * ("abc", "-5", "1.234"), or an amount in centavos. "Not an amount" is kept
 * apart from zero, so a typo is reported instead of silently becoming 0.
 */
export type AmountInput =
  { kind: 'empty' } | { kind: 'invalid' } | { kind: 'amount'; amount: Centavos }

export function readAmountInput(raw: string): AmountInput {
  if (raw.trim() === '') {
    return { kind: 'empty' }
  }

  const amount = parseAmountInput(raw)

  return amount === null ? { kind: 'invalid' } : { kind: 'amount', amount }
}

/**
 * The amount field's starting text for a method: cash starts at the exact
 * total (the most common case becomes one tap), partial starts blank, credit
 * has no field.
 */
export function defaultAmountText(method: PaymentMethod, total: Centavos): string {
  return method === 'cash' ? formatAmountInput(total) : ''
}

export type CheckoutState = {
  /** Amount taken at the counter, or null while the field does not hold an amount. */
  amountPaid: Centavos | null
  /** Shown under the amount field. */
  amountError: string | null
  /** Shown under the customer picker. */
  customerError: string | null
  /** Any other reason the sale cannot be confirmed yet, shown once under Payment. */
  paymentMessage: string | null
  canConfirm: boolean
}

/**
 * Everything the checkout form shows about the payment, each problem in one
 * place: the walk-in rule under Customer, a malformed amount under the field,
 * and anything else (cash short, partial covering the total) under Payment.
 */
export function evaluateCheckout(input: {
  method: PaymentMethod
  amountText: string
  total: Centavos
  customerId: string | null
  lineCount: number
}): CheckoutState {
  const { method, amountText, total, customerId, lineCount } = input
  const entered: AmountInput =
    method === 'credit' ? { kind: 'amount', amount: 0 } : readAmountInput(amountText)

  const amountPaid = entered.kind === 'amount' ? entered.amount : null
  const amountError = entered.kind === 'invalid' ? AMOUNT_FORMAT_MESSAGE : null
  const customerError = method !== 'cash' && customerId === null ? WALK_IN_BALANCE_MESSAGE : null

  // The customer rule is reported under Customer, so the payment is checked as
  // if one were chosen; that way each problem is stated once, in its own place.
  const payment = validatePayment({
    method,
    total,
    amountPaid: amountPaid ?? 0,
    customerId: customerId ?? 'customer-to-be-chosen',
    lineCount,
  })

  const paymentMessage = amountError === null && !payment.ok ? payment.message : null

  const final =
    amountPaid === null
      ? { ok: false }
      : validatePayment({ method, total, amountPaid, customerId, lineCount })

  return {
    amountPaid,
    amountError,
    customerError,
    paymentMessage,
    canConfirm: final.ok && amountError === null,
  }
}
