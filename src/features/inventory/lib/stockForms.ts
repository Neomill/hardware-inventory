import { z } from 'zod'

import {
  isWholePositiveQuantity,
  normalizeSupplierInvoice,
  validateStockAdjustment,
} from '@/domain/inventory'

/** Form values stay strings: an empty number field is "", never NaN. */
const WHOLE_NUMBER = /^\d+$/

function parseWholeQuantity(raw: string): number | null {
  const trimmed = raw.trim()

  if (!WHOLE_NUMBER.test(trimmed)) {
    return null
  }

  const quantity = Number(trimmed)

  return isWholePositiveQuantity(quantity) ? quantity : null
}

const quantityField = z
  .string()
  .trim()
  .min(1, 'Enter how many units.')
  .refine((value) => parseWholeQuantity(value) !== null, {
    message: 'Enter a whole number of units greater than zero.',
  })

export const receiveStockSchema = z.object({
  productId: z.string().min(1, 'Choose the product that was delivered.'),
  quantity: quantityField,
  supplier: z.string().trim().max(80, 'Keep the supplier name under 80 characters.'),
  supplierInvoice: z
    .string()
    .trim()
    .refine((value) => value === '' || normalizeSupplierInvoice(value) !== null, {
      message: 'Supplier invoice numbers look like INV-10021.',
    }),
  note: z.string().trim().max(200, 'Keep the note under 200 characters.'),
})

export type ReceiveStockValues = z.infer<typeof receiveStockSchema>

export const EMPTY_RECEIVE_VALUES: ReceiveStockValues = {
  productId: '',
  quantity: '',
  supplier: '',
  supplierInvoice: '',
  note: '',
}

export type ReceiveStockRequest = {
  productId: string
  quantity: number
  supplierInvoice?: string
  supplier?: string
  note?: string
}

/** Validated form values to the store's input. Blank optional text is omitted. */
export function toReceiveStockRequest(values: ReceiveStockValues): ReceiveStockRequest {
  const optional = (value: string) => (value.trim() === '' ? undefined : value.trim())

  return {
    productId: values.productId,
    quantity: parseWholeQuantity(values.quantity) ?? 0,
    supplierInvoice: optional(values.supplierInvoice),
    supplier: optional(values.supplier),
    note: optional(values.note),
  }
}

export type AdjustmentDirection = 'add' | 'remove'

export type AdjustStockValues = {
  direction: AdjustmentDirection
  quantity: string
  reason: string
}

export const EMPTY_ADJUST_VALUES: AdjustStockValues = {
  direction: 'remove',
  quantity: '',
  reason: '',
}

/** "remove" + "3" is -3. Null while the quantity is not yet a whole number. */
export function toQuantityDelta(direction: AdjustmentDirection, quantity: string): number | null {
  const parsed = parseWholeQuantity(quantity)

  if (parsed === null) {
    return null
  }

  return direction === 'remove' ? -parsed : parsed
}

/**
 * Built per product, because "cannot go below zero" depends on what is on hand
 * now. The domain rule supplies the message so the dialog and store agree.
 */
export function makeAdjustStockSchema(currentStock: number) {
  return z
    .object({
      direction: z.enum(['add', 'remove']),
      quantity: quantityField,
      reason: z
        .string()
        .trim()
        .min(1, 'Give a reason for this adjustment.')
        .max(120, 'Keep the reason under 120 characters.'),
    })
    .superRefine((values, context) => {
      const quantityDelta = toQuantityDelta(values.direction, values.quantity)

      if (quantityDelta === null || values.reason.trim() === '') {
        return
      }

      const result = validateStockAdjustment({
        currentStock,
        quantityDelta,
        reason: values.reason,
      })

      if (!result.ok) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['quantity'],
          message: result.message ?? 'This adjustment cannot be recorded.',
        })
      }
    })
}
