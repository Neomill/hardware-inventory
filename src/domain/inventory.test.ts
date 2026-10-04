import { describe, expect, it } from 'vitest'

import { dayRange } from '@/domain/dates'
import {
  buildOpeningStockMovement,
  filterMovements,
  isOpeningStockMovement,
  isWholePositiveQuantity,
  normalizeSupplierInvoice,
  OPENING_STOCK_REFERENCE,
  RECONCILE_REASON,
  reconcileOpeningStock,
  stockFromMovements,
  summarizeMovements,
  validateStockAdjustment,
  validateStockReceipt,
} from '@/domain/inventory'
import type { Product } from '@/domain/types'
import { testMovement, testSale } from '@/test/fixtures'

describe('normalizeSupplierInvoice', () => {
  it('accepts INV- and five digits, forgiving case and spaces', () => {
    expect(normalizeSupplierInvoice('INV-10021')).toBe('INV-10021')
    expect(normalizeSupplierInvoice('  inv-10021 ')).toBe('INV-10021')
  })

  it('rejects sale numbers and malformed invoices', () => {
    for (const raw of [
      '#20250521-0042',
      'INV-1002',
      'INV-100211',
      'INV10021',
      'INV-2025-0521-0015',
      '',
    ]) {
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
    testMovement({
      id: 'a',
      productId: 'P-1',
      type: 'stock_in',
      quantityDelta: 10,
      occurredAt: new Date(2025, 4, 19, 9).toISOString(),
    }),
    testMovement({
      id: 'b',
      productId: 'P-1',
      type: 'sale',
      quantityDelta: -2,
      occurredAt: new Date(2025, 4, 20, 9).toISOString(),
    }),
    testMovement({
      id: 'c',
      productId: 'P-2',
      type: 'adjustment',
      quantityDelta: -1,
      occurredAt: new Date(2025, 4, 21, 9).toISOString(),
    }),
    testMovement({
      id: 'd',
      productId: 'P-2',
      type: 'sale',
      quantityDelta: -3,
      occurredAt: new Date(2025, 4, 21, 17).toISOString(),
    }),
  ]

  it('returns everything newest first with no filter', () => {
    expect(filterMovements(movements).map((movement) => movement.id)).toEqual(['d', 'c', 'b', 'a'])
  })

  it('filters by product', () => {
    expect(filterMovements(movements, { productId: 'P-1' }).map((m) => m.id)).toEqual(['b', 'a'])
  })

  it('filters by any of several types, treating an empty list as all', () => {
    expect(
      filterMovements(movements, { types: ['stock_in', 'adjustment'] }).map((m) => m.id),
    ).toEqual(['c', 'a'])
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

describe('opening stock', () => {
  it('is a stock_in movement with the OPENING reference, counted as received', () => {
    const opening = buildOpeningStockMovement({
      productId: 'P-1',
      quantity: 12,
      occurredAt: '2025-05-01T00:00:00.000Z',
      recordedBy: 'Tester',
    })

    expect(opening).toEqual({
      id: 'MOV-OPEN-P-1',
      productId: 'P-1',
      type: 'stock_in',
      quantityDelta: 12,
      reference: OPENING_STOCK_REFERENCE,
      description: 'Opening stock',
      reason: null,
      note: null,
      recordedBy: 'Tester',
      occurredAt: '2025-05-01T00:00:00.000Z',
    })
    expect(isOpeningStockMovement(opening)).toBe(true)
    expect(
      isOpeningStockMovement(testMovement({ id: 'x', occurredAt: '', reference: 'INV-10021' })),
    ).toBe(false)
    expect(summarizeMovements([opening]).received).toBe(12)
  })
})

describe('stockFromMovements', () => {
  it('sums the deltas of one product only', () => {
    const movements = [
      testMovement({ id: '1', productId: 'P-1', quantityDelta: 10, occurredAt: '' }),
      testMovement({ id: '2', productId: 'P-1', type: 'sale', quantityDelta: -4, occurredAt: '' }),
      testMovement({ id: '3', productId: 'P-2', quantityDelta: 99, occurredAt: '' }),
    ]

    expect(stockFromMovements(movements, 'P-1')).toBe(6)
    expect(stockFromMovements(movements, 'P-3')).toBe(0)
  })
})

describe('reconcileOpeningStock', () => {
  const product = (id: string, stock: number): Product => ({
    id,
    name: id,
    sku: id,
    category: 'Test',
    unit: 'pcs',
    price: 100,
    stock,
    reorderLevel: 1,
    isActive: true,
  })
  const now = new Date(2025, 4, 22, 9)
  const earliest = new Date(2025, 4, 20, 9).toISOString()

  it('returns the same list when every product already adds up', () => {
    const movements = [
      testMovement({ id: '1', productId: 'P-1', quantityDelta: 5, occurredAt: earliest }),
    ]

    expect(
      reconcileOpeningStock({ products: [product('P-1', 5)], movements, sales: [], now }),
    ).toBe(movements)
  })

  it('adds a missing opening balance before the earliest record, once', () => {
    const products = [product('P-1', 20), product('P-2', 3)]
    const movements = [
      testMovement({
        id: '1',
        productId: 'P-1',
        type: 'sale',
        quantityDelta: -5,
        occurredAt: earliest,
      }),
    ]
    const sales = [testSale({ occurredAt: new Date(2025, 4, 19, 9).toISOString() })]

    const result = reconcileOpeningStock({ products, movements, sales, now })

    expect(stockFromMovements(result, 'P-1')).toBe(20)
    expect(stockFromMovements(result, 'P-2')).toBe(3)

    const openings = result.filter(isOpeningStockMovement)

    expect(openings.map((movement) => [movement.productId, movement.quantityDelta])).toEqual([
      ['P-1', 25],
      ['P-2', 3],
    ])
    expect(new Date(openings[0].occurredAt).getTime()).toBeLessThan(
      new Date(sales[0].occurredAt).getTime(),
    )
    expect(reconcileOpeningStock({ products, movements: result, sales, now })).toBe(result)
  })

  it('records a surplus as a dated adjustment, never a negative opening', () => {
    const movements = [
      testMovement({ id: '1', productId: 'P-1', quantityDelta: 10, occurredAt: earliest }),
    ]

    const result = reconcileOpeningStock({
      products: [product('P-1', 4)],
      movements,
      sales: [],
      now,
    })

    expect(stockFromMovements(result, 'P-1')).toBe(4)
    expect(result.filter(isOpeningStockMovement)).toEqual([])
    expect(result[result.length - 1]).toMatchObject({
      type: 'adjustment',
      quantityDelta: -6,
      reason: RECONCILE_REASON,
      reference: 'ADJ-00001',
      occurredAt: now.toISOString(),
    })
  })
})
