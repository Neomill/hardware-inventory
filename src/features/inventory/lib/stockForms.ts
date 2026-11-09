import { z } from 'zod'

import { isWholePositiveQuantity, validateStockAdjustment } from '@/domain/inventory'

/** Form values stay strings: an empty number field is "", never NaN. */
const WHOLE_NUMBER = /^\d+$/

/** "20" -> 20. Null for blank, zero, negative, decimal or non-numeric text. */
export function parseWholeQuantity(raw: string): number | null {
  const trimmed = raw.trim()

  if (!WHOLE_NUMBER.test(trimmed)) {
    return null
  }

  const quantity = Number(trimmed)

  return isWholePositiveQuantity(quantity) ? quantity : null
}

export const QUANTITY_MESSAGE = 'Enter a whole number of units greater than zero.'

const quantityField = z
  .string()
  .trim()
  .min(1, 'Enter how many units.')
  .refine((value) => parseWholeQuantity(value) !== null, { message: QUANTITY_MESSAGE })

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
        .min(1, 'Give a reason for this correction.')
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
          message: result.message ?? 'This correction cannot be recorded.',
        })
      }
    })
}
