import { z } from 'zod'

import { isValidPhone, validateNewCustomer } from '@/domain/customer'
import { validateCustomerPayment } from '@/domain/ledger'
import { parseAmountInput, type Centavos } from '@/domain/money'
import type { Customer } from '@/domain/types'

/**
 * Form schemas for the ledger dialogs. The rules themselves live in the domain;
 * these only attach each domain message to the field it is about.
 */

export const PAYMENT_NOTE_MAX_LENGTH = 120

export type PaymentFormValues = {
  amount: string
  note: string
}

export function buildPaymentFormSchema(outstanding: Centavos) {
  return z
    .object({
      amount: z.string(),
      note: z
        .string()
        .max(PAYMENT_NOTE_MAX_LENGTH, `Keep the note under ${PAYMENT_NOTE_MAX_LENGTH} characters.`),
    })
    .superRefine((values, context) => {
      const amount = parseAmountInput(values.amount)

      if (amount === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message:
            values.amount.trim() === ''
              ? 'Enter the amount received.'
              : 'Enter an amount such as 500 or 1,250.50.',
        })

        return
      }

      const validation = validateCustomerPayment({ amount, outstanding })

      if (!validation.ok) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: validation.message ?? 'This payment cannot be recorded.',
        })
      }
    })
}

export type PaymentPreview = {
  /** Null while the field does not hold a usable amount. */
  amount: Centavos | null
  /** What the customer will still owe if this payment is recorded. */
  remaining: Centavos
  settlesInFull: boolean
}

/** Live "balance after payment" line under the amount field. */
export function previewPayment(raw: string, outstanding: Centavos): PaymentPreview {
  const amount = parseAmountInput(raw)

  if (amount === null || amount <= 0 || amount > outstanding) {
    return { amount: null, remaining: outstanding, settlesInFull: false }
  }

  return { amount, remaining: outstanding - amount, settlesInFull: amount === outstanding }
}

export type NewCustomerFormValues = {
  name: string
  phone: string
}

export function buildNewCustomerFormSchema(existing: Customer[]) {
  return z.object({ name: z.string(), phone: z.string() }).superRefine((values, context) => {
    const nameCheck = validateNewCustomer({ name: values.name }, existing)

    if (!nameCheck.ok) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: nameCheck.message ?? 'Check the customer name.',
      })
    }

    const phone = values.phone.trim()

    if (phone !== '' && !isValidPhone(phone)) {
      // Name and phone are checked separately so both messages can show at once.
      const phoneCheck = validateNewCustomer({ name: 'placeholder', phone }, [])

      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: phoneCheck.message ?? 'Check the phone number.',
      })
    }
  })
}
