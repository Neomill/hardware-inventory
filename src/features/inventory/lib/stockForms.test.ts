import { describe, expect, it } from 'vitest'

import {
  makeAdjustStockSchema,
  parseWholeQuantity,
  toQuantityDelta,
} from '@/features/inventory/lib/stockForms'

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : result.error?.issues[0]?.message
}

describe('parseWholeQuantity', () => {
  it('reads whole units and refuses anything else', () => {
    expect(parseWholeQuantity(' 20 ')).toBe(20)

    for (const raw of ['', '0', '-3', '2.5', 'ten', '1e3']) {
      expect(parseWholeQuantity(raw)).toBeNull()
    }
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
