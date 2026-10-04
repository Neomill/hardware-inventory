import { describe, expect, it } from 'vitest'

import { HELD_SALE_LIMIT, HOLD_LIMIT_MESSAGE } from '@/domain/heldSale'
import type { HeldSale, Product } from '@/domain/types'
import {
  HELD_SALE_FALLBACK_TITLE,
  HOLD_NEEDS_ITEMS_HINT,
  buildHeldSaleRow,
  buildHeldSaleRows,
  buildLiveCartNotice,
  buildResumeNotice,
  formatHeldAt,
  heldLabelError,
  heldSalesButtonName,
  holdAvailability,
  labelCounter,
  planCartRepair,
  readPosCartNotice,
  readSalesRootNotice,
  summarizeHeldItems,
} from '@/features/sales/lib/heldSales'
import { formatCurrency, formatDateTimeShort, formatTime } from '@/lib/format'

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: `Product ${id}`,
    sku: id,
    category: 'General',
    unit: 'pcs',
    price: 1000,
    stock: 50,
    reorderLevel: 5,
    isActive: true,
    ...overrides,
  }
}

function held(
  id: string,
  heldAt: Date,
  lines: [string, number, number][],
  label: string | null = null,
): HeldSale {
  return {
    id,
    label,
    heldAt: heldAt.toISOString(),
    heldBy: 'Tester',
    lines: lines.map(([productId, quantity, unitPrice]) => ({
      productId,
      quantity,
      unitPrice,
      productName: `Product ${productId}`,
    })),
  }
}

const NOW = new Date(2026, 9, 5, 15, 0)

describe('Sales root button (AC1)', () => {
  it('names the count for screen readers', () => {
    expect(heldSalesButtonName(2)).toBe('Held Sales, 2 waiting')
    expect(heldSalesButtonName(1)).toBe('Held Sales, 1 waiting')
    expect(heldSalesButtonName(0)).toBe('Held Sales, none waiting')
  })
})

describe('holdAvailability (AC6, spec 7.4)', () => {
  it('needs items in the cart', () => {
    expect(holdAvailability(0, 0)).toEqual({ canHold: false, reason: HOLD_NEEDS_ITEMS_HINT })
  })

  it('is refused at the limit', () => {
    expect(holdAvailability(2, HELD_SALE_LIMIT - 1).canHold).toBe(true)
    expect(holdAvailability(2, HELD_SALE_LIMIT)).toEqual({
      canHold: false,
      reason: HOLD_LIMIT_MESSAGE,
    })
  })

  it('counts the label against 40 characters (AC5)', () => {
    expect(labelCounter('')).toBe('0/40')
    expect(labelCounter('Pedro')).toBe('5/40')
  })
})

describe('Held Sales list rows (AC2, AC11, AC17)', () => {
  const products = [
    product('A', { price: 1200, stock: 2 }),
    product('B'),
    product('C'),
    product('D'),
  ]

  it('lists newest first with label or fallback, time, items and estimate', () => {
    const older = held('H-1', new Date(2026, 9, 5, 9, 30), [['B', 1, 1000]], 'Pedro')
    const newer = held('H-2', new Date(2026, 9, 5, 11, 0), [
      ['B', 2, 1000],
      ['C', 1, 1000],
    ])

    const rows = buildHeldSaleRows([older, newer], products, NOW)

    expect(rows.map((row) => row.id)).toEqual(['H-2', 'H-1'])
    expect(rows[0]).toMatchObject({
      title: HELD_SALE_FALLBACK_TITLE,
      fromDay: null,
      itemCount: 3,
      itemsText: '3 items: Product B, Product C',
      estimatedTotal: 3000,
      stockChanges: [],
      priceChanges: [],
      canResume: true,
    })
    expect(rows[1]).toMatchObject({ title: 'Pedro', itemsText: '1 item: Product B' })
  })

  it('flags stock and price changes before resuming', () => {
    const row = buildHeldSaleRow(
      held('H-1', NOW, [
        ['A', 5, 1000],
        ['B', 1, 1000],
      ]),
      products,
      NOW,
    )

    expect(row.stockChanges).toEqual(['Product A: reduced from 5 to 2 pcs, only 2 left in stock.'])
    expect(row.priceChanges).toEqual([
      `Product A is now ${formatCurrency(1200)} (was ${formatCurrency(1000)} when held).`,
    ])
    expect(row.estimatedTotal).toBe(5 * 1200 + 1000)
    expect(row.canResume).toBe(true)
  })

  it('cannot resume when nothing is sellable (AC9)', () => {
    const list = [product('X', { stock: 0 }), product('Y', { isActive: false })]
    const row = buildHeldSaleRow(
      held('H-1', NOW, [
        ['X', 1, 1000],
        ['Y', 1, 1000],
        ['Z', 1, 1000],
      ]),
      list,
      NOW,
    )

    expect(row.canResume).toBe(false)
    expect(row.stockChanges).toHaveLength(3)
  })

  it('marks a sale held on an earlier day', () => {
    const yesterday = new Date(2026, 9, 4, 16, 15)
    const row = buildHeldSaleRow(held('H-1', yesterday, [['B', 1, 1000]]), products, NOW)

    expect(row.fromDay).toMatch(/^From /)
    expect(row.heldAtText).toBe(formatDateTimeShort(yesterday))
  })

  it('shows only the time for today', () => {
    const today = new Date(2026, 9, 5, 10, 42)

    expect(formatHeldAt(today.toISOString(), NOW)).toBe(formatTime(today))
  })

  it('summarizes long sales with a "+N more"', () => {
    const sale = held('H-1', NOW, [
      ['A', 1, 1],
      ['B', 1, 1],
      ['C', 1, 1],
      ['D', 1, 1],
    ])

    expect(summarizeHeldItems(sale)).toBe('Product A, Product B +2 more')
  })
})

describe('notices after resume and on the live cart (AC8, spec 5.5, 7.3)', () => {
  it('lists every adjustment and price change, or nothing', () => {
    expect(buildResumeNotice([], [])).toBeNull()

    const notice = buildResumeNotice(
      [{ kind: 'removed_out_of_stock', productId: 'X', productName: 'Door Knob', quantity: 1 }],
      ['Cement is now ₱265.00 (was ₱260.00 when held).'],
    )

    expect(notice?.items).toEqual([
      'Door Knob removed: out of stock.',
      'Cement is now ₱265.00 (was ₱260.00 when held).',
    ])
  })

  it('plans the store actions that bring the live cart within stock', () => {
    const products = [product('A', { stock: 3 }), product('B', { isActive: false }), product('C')]
    const cart = [
      { productId: 'A', quantity: 5 },
      { productId: 'B', quantity: 1 },
      { productId: 'C', quantity: 2 },
      { productId: 'gone', quantity: 1 },
    ]

    const plan = planCartRepair(cart, products)

    expect(plan.repairs).toEqual([
      { kind: 'set_quantity', productId: 'A', quantity: 3 },
      { kind: 'remove', productId: 'B' },
      { kind: 'remove', productId: 'gone' },
    ])
    expect(buildLiveCartNotice(plan.adjustments)?.items).toHaveLength(3)
    expect(buildLiveCartNotice([])).toBeNull()
  })

  it('plans nothing for a cart within stock', () => {
    expect(planCartRepair([{ productId: 'A', quantity: 1 }], [product('A')])).toEqual({
      repairs: [],
      adjustments: [],
    })
  })
})

describe('heldLabelError (AC5)', () => {
  it('allows 40 characters and refuses 41, after trimming', () => {
    expect(heldLabelError('')).toBeNull()
    expect(heldLabelError('a'.repeat(40))).toBeNull()
    expect(heldLabelError(`  ${'a'.repeat(40)}  `)).toBeNull()
    expect(heldLabelError('a'.repeat(41))).toBe('Keep the label to 40 characters.')
  })
})

describe('router state readers', () => {
  it('reads the Sales root notice', () => {
    expect(readSalesRootNotice({ notice: 'Sale held.' })).toBe('Sale held.')
    expect(readSalesRootNotice(null)).toBeNull()
    expect(readSalesRootNotice({ notice: 3 })).toBeNull()
  })

  it('reads only a well-formed cart notice', () => {
    const cartNotice = { title: 'Changed:', items: ['A removed: out of stock.'] }

    expect(readPosCartNotice({ cartNotice })).toEqual(cartNotice)
    expect(readPosCartNotice({ cartNotice: { title: 'x', items: [1] } })).toBeNull()
    expect(readPosCartNotice(undefined)).toBeNull()
  })
})
