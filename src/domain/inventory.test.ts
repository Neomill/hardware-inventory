import { describe, expect, it } from 'vitest'

import { dayRange } from '@/domain/dates'
import {
  filterMovements,
  isWholePositiveQuantity,
  normalizeSupplierInvoice,
  summarizeMovements,
  validateStockAdjustment,
  validateStockReceipt,
} from '@/domain/inventory'
import { testMovement } from '@/test/fixtures'

describe('normalizeSupplierInvoice', () => {
  it('accepts INV- and five digits, forgiving case and spaces', () => {
    expect(normalizeSupplierInvoice('INV-10021')).toBe('INV-10021')
    expect(normalizeSupplierInvoice('  inv-10021 ')).toBe('INV-10021')
  })

  it('rejects sale numbers and malformed invoices', () => {
    for (const raw of ['#20250521-0042', 'INV-1002', 'INV-100211', 'INV10021', 'INV-2025-0521-0015', '']) {
      expect(normalizeSupplierInvoice(raw)).toBeNull()
    }
  })
})

describe('isWholePositiveQuantity', () => {
  it('accepts whole units only', () => {
    expect(isWholePositiveQuantity(1)).toBe(true)
    expect(isWholePositiveQuantity(150)).toBe(true)

    for (const quantity of [0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isWholePositiveQuantity(quantity)).toBe(false)
    }
  })
})

describe('validateStockReceipt', () => {
  it('accepts a delivery with or without an invoice', () => {
    expect(validateStockReceipt({ quantity: 10 }).ok).toBe(true)
    expect(validateStockReceipt({ quantity: 10, supplierInvoice: '' }).ok).toBe(true)
    expect(validateStockReceipt({ quantity: 10, supplierInvoice: 'inv-10022' }).ok).toBe(true)
  })

  it('refuses fractional, zero and negative quantities', () => {
    for (const quantity of [0, -5, 2.5]) {
      expect(validateStockReceipt({ quantity }).ok).toBe(false)
    }
  })

  it('refuses an invoice number in the wrong format', () => {
    const result = validateStockReceipt({ quantity: 10, supplierInvoice: '#20250521-0042' })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('INV-10021')
  })
})

describe('validateStockAdjustment', () => {
  const base = { currentStock: 8, reason: 'Damaged' }

  it('accepts a correction either way', () => {
    expect(validateStockAdjustment({ ...base, quantityDelta: -3 }).ok).toBe(true)
    expect(validateStockAdjustment({ ...base, quantityDelta: 5 }).ok).toBe(true)
  })

  it('allows stock to reach exactly zero but never below', () => {
    expect(validateStockAdjustment({ ...base, quantityDelta: -8 }).ok).toBe(true)

    const result = validateStockAdjustment({ ...base, quantityDelta: -9 })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('below zero')
  })

  it('requires a reason', () => {
    expect(validateStockAdjustment({ ...base, quantityDelta: -1, reason: '   ' }).ok).toBe(false)
  })

  it('refuses zero and fractional changes', () => {
    expect(validateStockAdjustment({ ...base, quantityDelta: 0 }).ok).toBe(false)
    expect(validateStockAdjustment({ ...base, quantityDelta: -0.5 }).ok).toBe(false)
  })
})

describe('filterMovements', () => {
  const movements = [
    testMovement({ id: 'a', productId: 'P-1', type: 'stock_in', quantityDelta: 10, occurredAt: new Date(2025, 4, 19, 9).toISOString() }),
    testMovement({ id: 'b', productId: 'P-1', type: 'sale', quantityDelta: -2, occurredAt: new Date(2025, 4, 20, 9).toISOString() }),
    testMovement({ id: 'c', productId: 'P-2', type: 'adjustment', quantityDelta: -1, occurredAt: new Date(2025, 4, 21, 9).toISOString() }),
    testMovement({ id: 'd', productId: 'P-2', type: 'sale', quantityDelta: -3, occurredAt: new Date(2025, 4, 21, 17).toISOString() }),
  ]

  it('returns everything newest first with no filter', () => {
    expect(filterMovements(movements).map((movement) => movement.id)).toEqual(['d', 'c', 'b', 'a'])
  })

  it('filters by product', () => {
    expect(filterMovements(movements, { productId: 'P-1' }).map((m) => m.id)).toEqual(['b', 'a'])
  })

  it('filters by any of several types, treating an empty list as all', () => {
    expect(filterMovements(movements, { types: ['stock_in', 'adjustment'] }).map((m) => m.id)).toEqual([
      'c',
      'a',
    ])
    expect(filterMovements(movements, { types: [] })).toHaveLength(4)
  })

  it('filters by an inclusive date range', () => {
    const today = dayRange(new Date(2025, 4, 21), new Date(2025, 4, 21))

    expect(filterMovements(movements, { range: today }).map((m) => m.id)).toEqual(['d', 'c'])
  })

  it('combines every filter', () => {
    const range = dayRange(new Date(2025, 4, 20), new Date(2025, 4, 21))

    expect(
      filterMovements(movements, { productId: 'P-2', types: ['sale'], range }).map((m) => m.id),
    ).toEqual(['d'])
  })

  it('does not reorder the array it was given', () => {
    filterMovements(movements)

    expect(movements.map((movement) => movement.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('summarizeMovements', () => {
  it('splits units in and out by kind', () => {
    const totals = summarizeMovements([
      testMovement({ id: '1', type: 'stock_in', quantityDelta: 50, occurredAt: '' }),
      testMovement({ id: '2', type: 'sale', quantityDelta: -12, occurredAt: '' }),
      testMovement({ id: '3', type: 'sale_reversal', quantityDelta: 2, occurredAt: '' }),
      testMovement({ id: '4', type: 'adjustment', quantityDelta: -3, occurredAt: '' }),
      testMovement({ id: '5', type: 'adjustment', quantityDelta: 1, occurredAt: '' }),
    ])

    expect(totals).toEqual({ received: 50, sold: 12, reversed: 2, adjusted: -2, net: 38 })
  })
})
