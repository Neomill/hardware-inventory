import { describe, expect, it } from 'vitest'

import {
  EMPTY_RECEIVE_VALUES,
  makeAdjustStockSchema,
  receiveStockSchema,
  toQuantityDelta,
  toReceiveStockRequest,
} from '@/features/inventory/lib/stockForms'

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : result.error?.issues[0]?.message
}

describe('receiveStockSchema', () => {
  const valid = { ...EMPTY_RECEIVE_VALUES, productId: 'CEM-001', quantity: '20' }

  it('accepts a product and a whole quantity with everything else blank', () => {
    expect(receiveStockSchema.safeParse(valid).success).toBe(true)
  })

  it('requires a product', () => {
    expect(firstMessage(receiveStockSchema.safeParse({ ...valid, productId: '' }))).toBe(
      'Choose the product that was delivered.',
    )
  })

  it.each(['0', '-3', '2.5', 'ten', '1e3'])('rejects quantity %s', (quantity) => {
    expect(firstMessage(receiveStockSchema.safeParse({ ...valid, quantity }))).toBe(
      'Enter a whole number of units greater than zero.',
    )
  })

  it('accepts a supplier invoice in any case, rejects a malformed one', () => {
    expect(receiveStockSchema.safeParse({ ...valid, supplierInvoice: ' inv-10021 ' }).success).toBe(
      true,
    )
    expect(
      firstMessage(receiveStockSchema.safeParse({ ...valid, supplierInvoice: 'INV-12' })),
    ).toBe('Supplier invoice numbers look like INV-10021.')
  })
})

describe('toReceiveStockRequest', () => {
  it('parses the quantity and omits blank optional text', () => {
    expect(
      toReceiveStockRequest({
        productId: 'CEM-001',
        quantity: ' 20 ',
        supplier: '  ',
        supplierInvoice: 'inv-10021',
        note: '',
      }),
    ).toEqual({
      productId: 'CEM-001',
      quantity: 20,
      supplierInvoice: 'inv-10021',
      supplier: undefined,
      note: undefined,
    })
  })
})

describe('toQuantityDelta', () => {
  it('signs the quantity by direction', () => {
    expect(toQuantityDelta('remove', '3')).toBe(-3)
    expect(toQuantityDelta('add', '5')).toBe(5)
    expect(toQuantityDelta('add', '')).toBeNull()
  })
})

describe('makeAdjustStockSchema', () => {
  const schema = makeAdjustStockSchema(4)

  it('accepts a removal down to exactly zero', () => {
    expect(
      schema.safeParse({ direction: 'remove', quantity: '4', reason: 'Damaged' }).success,
    ).toBe(true)
  })

  it('blocks going below zero with the on-hand figure', () => {
    const result = schema.safeParse({ direction: 'remove', quantity: '5', reason: 'Damaged' })

    expect(firstMessage(result)).toBe('Only 4 on hand. Stock cannot go below zero.')
    expect(result.success ? null : result.error.issues[0].path).toEqual(['quantity'])
  })

  it('requires a reason', () => {
    expect(firstMessage(schema.safeParse({ direction: 'add', quantity: '2', reason: '  ' }))).toBe(
      'Give a reason for this adjustment.',
    )
  })
})
