import { describe, expect, it } from 'vitest'

import {
  buildHeldSale,
  describeAdjustment,
  describePriceChange,
  findPriceChanges,
  HELD_SALE_LABEL_MAX,
  HELD_SALE_LIMIT,
  heldSaleEstimatedTotal,
  heldSaleItemCount,
  isHeldBeforeToday,
  nextHeldSaleId,
  normalizeHeldSaleLabel,
  reconcileCartWithStock,
  sortHeldSalesNewestFirst,
  validateHold,
} from '@/domain/heldSale'
import type { HeldSale, Product } from '@/domain/types'

function product(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    name: `Product ${overrides.id}`,
    sku: overrides.id,
    category: 'Test',
    unit: 'pcs',
    price: 1000,
    stock: 50,
    reorderLevel: 5,
    isActive: true,
    ...overrides,
  }
}

const PVC = product({ id: 'PVC-050', name: 'PVC Pipe 1/2"', price: 2800, stock: 12 })
const CEMENT = product({
  id: 'CEM-001',
  name: 'Cement (Holcim)',
  price: 26000,
  stock: 35,
  unit: 'sack',
})
const KNOB = product({ id: 'DK-001', name: 'Door Knob (Stainless)', stock: 0 })
const THINNER = product({ id: 'THN-001', name: 'Paint Thinner', isActive: false })
const PRODUCTS = [PVC, CEMENT, KNOB, THINNER]

const now = new Date(2025, 4, 21, 10, 42)

function held(overrides: Partial<HeldSale> = {}): HeldSale {
  return {
    id: 'HOLD-1',
    label: null,
    lines: [
      { productId: PVC.id, quantity: 2, productName: PVC.name, unitPrice: 2800 },
      { productId: CEMENT.id, quantity: 1, productName: CEMENT.name, unitPrice: 26000 },
    ],
    heldAt: now.toISOString(),
    heldBy: 'Juan Dela Cruz',
    ...overrides,
  }
}

describe('normalizeHeldSaleLabel (U1)', () => {
  it('trims, and turns blank or missing into null', () => {
    expect(normalizeHeldSaleLabel('  Pedro  ')).toBe('Pedro')
    expect(normalizeHeldSaleLabel('')).toBeNull()
    expect(normalizeHeldSaleLabel('   ')).toBeNull()
    expect(normalizeHeldSaleLabel(undefined)).toBeNull()
  })
})

describe('validateHold', () => {
  it('refuses an empty cart (U2)', () => {
    const result = validateHold({ cartLineCount: 0, heldCount: 0 })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('nothing to hold')
  })

  it('allows up to the limit and refuses at it (U3)', () => {
    expect(validateHold({ cartLineCount: 1, heldCount: HELD_SALE_LIMIT - 1 }).ok).toBe(true)

    const result = validateHold({ cartLineCount: 1, heldCount: HELD_SALE_LIMIT })

    expect(result.ok).toBe(false)
    expect(result.message).toBe('You already have 10 held sales. Resume or discard one first.')
    expect(validateHold({ cartLineCount: 1, heldCount: 12 }).ok).toBe(false)
  })

  it('takes a label of 40 characters and refuses 41 (U4)', () => {
    expect(HELD_SALE_LABEL_MAX).toBe(40)
    expect(validateHold({ cartLineCount: 1, heldCount: 0, label: 'a'.repeat(40) }).ok).toBe(true)

    const result = validateHold({ cartLineCount: 1, heldCount: 0, label: 'a'.repeat(41) })

    expect(result.ok).toBe(false)
    expect(result.message).toBe('Keep the label to 40 characters.')
    // Surrounding spaces do not count against the limit.
    expect(validateHold({ cartLineCount: 1, heldCount: 0, label: ` ${'a'.repeat(40)} ` }).ok).toBe(
      true,
    )
  })
})

describe('buildHeldSale', () => {
  it('copies name and current price, and stamps time and user (U5)', () => {
    const sale = buildHeldSale({
      cart: [
        { productId: PVC.id, quantity: 3 },
        { productId: CEMENT.id, quantity: 1 },
      ],
      products: PRODUCTS,
      label: 'Pedro',
      heldBy: 'Juan Dela Cruz',
      now,
      existingIds: [],
    })

    expect(sale).toEqual({
      id: `HOLD-${now.getTime()}`,
      label: 'Pedro',
      lines: [
        { productId: PVC.id, quantity: 3, productName: PVC.name, unitPrice: 2800 },
        { productId: CEMENT.id, quantity: 1, productName: CEMENT.name, unitPrice: 26000 },
      ],
      heldAt: now.toISOString(),
      heldBy: 'Juan Dela Cruz',
    })
  })

  it('adds -2, -3 when the same millisecond is taken (U6)', () => {
    const base = `HOLD-${now.getTime()}`
    const input = {
      cart: [{ productId: PVC.id, quantity: 1 }],
      products: PRODUCTS,
      label: null,
      heldBy: 'Juan Dela Cruz',
      now,
    }

    expect(buildHeldSale({ ...input, existingIds: [base] }).id).toBe(`${base}-2`)
    expect(nextHeldSaleId(now, [base, `${base}-2`])).toBe(`${base}-3`)
  })
})

describe('reconcileCartWithStock', () => {
  it('leaves lines within stock alone (U7)', () => {
    const lines = [
      { productId: PVC.id, quantity: 12 },
      { productId: CEMENT.id, quantity: 2 },
    ]

    expect(reconcileCartWithStock(lines, PRODUCTS)).toEqual({ lines, adjustments: [] })
  })

  it('reduces a quantity above stock to the stock (U8)', () => {
    const result = reconcileCartWithStock([{ productId: PVC.id, quantity: 30 }], PRODUCTS)

    expect(result.lines).toEqual([{ productId: PVC.id, quantity: 12 }])
    expect(result.adjustments).toEqual([
      { kind: 'reduced', productId: PVC.id, productName: PVC.name, from: 30, to: 12, unit: 'pcs' },
    ])
  })

  it('removes an out-of-stock line (U9)', () => {
    const result = reconcileCartWithStock([{ productId: KNOB.id, quantity: 1 }], PRODUCTS)

    expect(result.lines).toEqual([])
    expect(result.adjustments).toEqual([
      { kind: 'removed_out_of_stock', productId: KNOB.id, productName: KNOB.name, quantity: 1 },
    ])
  })

  it('removes an inactive product even when it has stock (U10)', () => {
    const result = reconcileCartWithStock([{ productId: THINNER.id, quantity: 2 }], PRODUCTS)

    expect(result.lines).toEqual([])
    expect(result.adjustments).toEqual([
      { kind: 'removed_inactive', productId: THINNER.id, productName: THINNER.name, quantity: 2 },
    ])
  })

  it('removes an unknown product, keeping the held name when there is one (U11)', () => {
    expect(
      reconcileCartWithStock(
        [{ productId: 'GONE', quantity: 4, productName: 'Old Hinge' }],
        PRODUCTS,
      ).adjustments,
    ).toEqual([
      { kind: 'removed_missing', productId: 'GONE', productName: 'Old Hinge', quantity: 4 },
    ])

    expect(
      reconcileCartWithStock([{ productId: 'GONE', quantity: 4 }], PRODUCTS).adjustments[0],
    ).toMatchObject({ kind: 'removed_missing', productName: 'Unknown product' })
  })

  it('never raises a quantity when stock has risen (U12)', () => {
    const result = reconcileCartWithStock([{ productId: CEMENT.id, quantity: 3 }], PRODUCTS)

    expect(result.lines).toEqual([{ productId: CEMENT.id, quantity: 3 }])
  })

  it('keeps the order of surviving lines, one adjustment per changed line (U13)', () => {
    const result = reconcileCartWithStock(
      [
        { productId: CEMENT.id, quantity: 1 },
        { productId: KNOB.id, quantity: 1 },
        { productId: PVC.id, quantity: 30 },
        { productId: THINNER.id, quantity: 1 },
        { productId: 'GONE', quantity: 1 },
        { productId: CEMENT.id, quantity: 2 },
      ],
      PRODUCTS,
    )

    expect(result.lines).toEqual([
      { productId: CEMENT.id, quantity: 1 },
      { productId: PVC.id, quantity: 12 },
      { productId: CEMENT.id, quantity: 2 },
    ])
    expect(result.adjustments.map((adjustment) => adjustment.kind)).toEqual([
      'removed_out_of_stock',
      'reduced',
      'removed_inactive',
      'removed_missing',
    ])
  })

  it('returns plain cart lines, without the copied held fields', () => {
    const result = reconcileCartWithStock(held().lines, PRODUCTS)

    expect(result.lines).toEqual([
      { productId: PVC.id, quantity: 2 },
      { productId: CEMENT.id, quantity: 1 },
    ])
  })
})

describe('heldSaleItemCount and heldSaleEstimatedTotal', () => {
  it('counts units across lines', () => {
    expect(heldSaleItemCount(held())).toBe(3)
  })

  it('prices at the current price, in whole centavos (U14)', () => {
    const repriced = [{ ...PVC, price: 2950 }, CEMENT]

    expect(heldSaleEstimatedTotal(held(), repriced)).toBe(2 * 2950 + 26000)
    expect(Number.isSafeInteger(heldSaleEstimatedTotal(held(), repriced))).toBe(true)
  })

  it('counts a missing product as nothing', () => {
    expect(heldSaleEstimatedTotal(held(), [CEMENT])).toBe(26000)
  })
})

describe('findPriceChanges (U15)', () => {
  it('returns only the lines whose price moved', () => {
    const repriced = [PVC, { ...CEMENT, price: 26500 }]

    expect(findPriceChanges(held(), repriced)).toEqual([
      { productId: CEMENT.id, productName: CEMENT.name, heldPrice: 26000, currentPrice: 26500 },
    ])
    expect(findPriceChanges(held(), PRODUCTS)).toEqual([])
  })

  it('skips a product that no longer exists', () => {
    expect(findPriceChanges(held(), [])).toEqual([])
  })
})

describe('describeAdjustment (U16)', () => {
  it('says each change in words', () => {
    expect(
      describeAdjustment({
        kind: 'reduced',
        productId: PVC.id,
        productName: PVC.name,
        from: 30,
        to: 12,
        unit: 'pcs',
      }),
    ).toBe('PVC Pipe 1/2": reduced from 30 to 12 pcs, only 12 left in stock.')
    expect(
      describeAdjustment({
        kind: 'removed_out_of_stock',
        productId: KNOB.id,
        productName: KNOB.name,
        quantity: 1,
      }),
    ).toBe('Door Knob (Stainless) removed: out of stock.')
    expect(
      describeAdjustment({
        kind: 'removed_inactive',
        productId: THINNER.id,
        productName: THINNER.name,
        quantity: 1,
      }),
    ).toBe('Paint Thinner removed: no longer for sale.')
    expect(
      describeAdjustment({
        kind: 'removed_missing',
        productId: 'GONE',
        productName: 'Old Hinge',
        quantity: 1,
      }),
    ).toBe('Old Hinge removed: no longer in the product list.')
  })

  it('describes a price change with the formatter it is given', () => {
    const peso = (amount: number) => `PHP ${(amount / 100).toFixed(2)}`

    expect(
      describePriceChange(
        { productId: CEMENT.id, productName: CEMENT.name, heldPrice: 26000, currentPrice: 26500 },
        peso,
      ),
    ).toBe('Cement (Holcim) is now PHP 265.00 (was PHP 260.00 when held).')
  })
})

describe('isHeldBeforeToday and sortHeldSalesNewestFirst', () => {
  it('marks a sale held on an earlier day only', () => {
    expect(isHeldBeforeToday({ heldAt: new Date(2025, 4, 20, 23, 59).toISOString() }, now)).toBe(
      true,
    )
    expect(isHeldBeforeToday({ heldAt: new Date(2025, 4, 21, 0, 0).toISOString() }, now)).toBe(
      false,
    )
  })

  it('lists newest first without changing the input', () => {
    const older = held({ id: 'A', heldAt: new Date(2025, 4, 20, 9).toISOString() })
    const newer = held({ id: 'B', heldAt: new Date(2025, 4, 21, 9).toISOString() })
    const input = [older, newer]

    expect(sortHeldSalesNewestFirst(input).map((sale) => sale.id)).toEqual(['B', 'A'])
    expect(input.map((sale) => sale.id)).toEqual(['A', 'B'])
  })
})
