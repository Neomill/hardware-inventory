import { describe, expect, it } from 'vitest'

import {
  computeBalanceDue,
  computeChange,
  computeSaleTotals,
  formatSaleNumber,
  mergeCartLines,
  nextSaleSequence,
  parseSaleSequence,
  validatePayment,
} from '@/domain/sale'
import type { SaleLine } from '@/domain/types'
import { testSale } from '@/test/fixtures'

function line(unitPrice: number, quantity: number): SaleLine {
  return {
    productId: `P-${unitPrice}`,
    productName: 'Item',
    sku: 'SKU',
    unit: 'pcs',
    unitPrice,
    quantity,
    lineTotal: unitPrice * quantity,
  }
}

/** The cart in the design: PHP 631.00 across five items. */
const DESIGN_CART = [line(2800, 2), line(26000, 1), line(9000, 1), line(21000, 1), line(1500, 1)]

describe('computeSaleTotals', () => {
  it('totals the design cart without adding tax', () => {
    const totals = computeSaleTotals(DESIGN_CART, 0, 0.12)

    expect(totals.subtotal).toBe(63100)
    expect(totals.total).toBe(63100)
    expect(totals.itemCount).toBe(6)
    expect(totals.lineCount).toBe(5)
    expect(totals.vat).toEqual({ net: 56339, vat: 6761 })
  })

  it('caps a discount at the subtotal so a total is never negative', () => {
    const totals = computeSaleTotals(DESIGN_CART, 999999, 0.12)

    expect(totals.discountAmount).toBe(63100)
    expect(totals.total).toBe(0)
  })

  it('ignores a negative discount', () => {
    expect(computeSaleTotals(DESIGN_CART, -500, 0.12).total).toBe(63100)
  })
})

describe('computeChange', () => {
  it('gives change against the VAT-inclusive total', () => {
    // The design showed 293.28 because it had added tax on top; 631.00 is due.
    expect(computeChange(63100, 100000)).toBe(36900)
  })

  it('is zero when the exact amount is tendered', () => {
    expect(computeChange(63100, 63100)).toBe(0)
  })

  it('never goes negative', () => {
    expect(computeChange(63100, 100)).toBe(0)
  })
})

describe('computeBalanceDue', () => {
  it('leaves nothing owing on a cash sale', () => {
    expect(computeBalanceDue('cash', 63100, 100000)).toBe(0)
  })

  it('carries the unpaid remainder of a partial payment', () => {
    expect(computeBalanceDue('partial', 63100, 20000)).toBe(43100)
  })

  it('carries the whole total on credit', () => {
    expect(computeBalanceDue('credit', 63100, 0)).toBe(63100)
  })

  it('settles to exactly zero across repeated partial payments', () => {
    let owing = 63100

    for (const payment of [10000, 10000, 10000, 10000, 10000, 13100]) {
      owing = computeBalanceDue('partial', owing, payment)
    }

    expect(owing).toBe(0)
  })
})

describe('validatePayment', () => {
  const base = { total: 63100, amountPaid: 63100, customerId: null, lineCount: 5 }

  it('accepts exact cash', () => {
    expect(validatePayment({ ...base, method: 'cash' }).ok).toBe(true)
  })

  it('refuses cash below the total', () => {
    expect(validatePayment({ ...base, method: 'cash', amountPaid: 60000 }).ok).toBe(false)
  })

  it('refuses an empty cart', () => {
    expect(validatePayment({ ...base, method: 'cash', lineCount: 0 }).ok).toBe(false)
  })

  it('requires a customer for credit and partial payments', () => {
    expect(validatePayment({ ...base, method: 'credit', amountPaid: 0 }).ok).toBe(false)
    expect(validatePayment({ ...base, method: 'partial', amountPaid: 20000 }).ok).toBe(false)

    expect(
      validatePayment({ ...base, method: 'credit', amountPaid: 0, customerId: 'CUS-001' }).ok,
    ).toBe(true)
  })

  it('sends a full partial payment back to cash', () => {
    const result = validatePayment({
      ...base,
      method: 'partial',
      amountPaid: 63100,
      customerId: 'CUS-001',
    })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('Cash')
  })

  it('refuses an amount that is not whole, non-negative centavos', () => {
    for (const amountPaid of [Number.NaN, Number.POSITIVE_INFINITY, -1, 100.5]) {
      for (const method of ['cash', 'partial', 'credit'] as const) {
        const result = validatePayment({ ...base, method, amountPaid, customerId: 'CUS-001' })

        expect(result.ok).toBe(false)
      }
    }
  })

  it('refuses NaN cash, which compares as neither short nor enough', () => {
    expect(validatePayment({ ...base, method: 'cash', amountPaid: Number.NaN }).ok).toBe(false)
  })

  it('refuses a credit sale that takes money at the counter', () => {
    const credit = { ...base, method: 'credit' as const, customerId: 'CUS-001' }

    expect(validatePayment({ ...credit, amountPaid: 0 }).ok).toBe(true)
    expect(validatePayment({ ...credit, amountPaid: -500 }).ok).toBe(false)

    const paid = validatePayment({ ...credit, amountPaid: 500 })

    expect(paid.ok).toBe(false)
    expect(paid.message).toContain('Partial')
  })

  it('refuses a partial payment of nothing', () => {
    expect(
      validatePayment({ ...base, method: 'partial', amountPaid: 0, customerId: 'CUS-001' }).ok,
    ).toBe(false)
  })
})

describe('formatSaleNumber', () => {
  it('stamps the date and the sale count for that day', () => {
    expect(formatSaleNumber(new Date(2025, 4, 21), 42)).toBe('#20250521-0042')
  })
})

describe('parseSaleSequence', () => {
  it('reads the number within the day', () => {
    expect(parseSaleSequence('#20250521-0042')).toBe(42)
    expect(parseSaleSequence('#20250521-12345')).toBe(12345)
  })

  it('is null for anything else', () => {
    for (const raw of ['INV-10021', '20250521-0042', '#2025-0042', '']) {
      expect(parseSaleSequence(raw)).toBeNull()
    }
  })
})

describe('nextSaleSequence', () => {
  const at = (day: number, hour: number) => new Date(2025, 4, day, hour).toISOString()

  it('starts each day at 1', () => {
    expect(nextSaleSequence([], new Date(2025, 4, 21, 9))).toBe(1)
  })

  it('continues after the highest number used that day and restarts the next', () => {
    const sales = [
      { ...testSale({ occurredAt: at(21, 9) }), saleNumber: '#20250521-0001' },
      { ...testSale({ occurredAt: at(21, 10) }), saleNumber: '#20250521-0007' },
      { ...testSale({ occurredAt: at(20, 10) }), saleNumber: '#20250520-0030' },
    ]

    expect(nextSaleSequence(sales, new Date(2025, 4, 21, 15))).toBe(8)
    expect(nextSaleSequence(sales, new Date(2025, 4, 22, 8))).toBe(1)
  })

  it('never reuses a number when an older record has another form', () => {
    const sales = [
      { ...testSale({ occurredAt: at(21, 9) }), saleNumber: 'legacy' },
      { ...testSale({ occurredAt: at(21, 10) }), saleNumber: 'legacy-2' },
    ]

    expect(nextSaleSequence(sales, new Date(2025, 4, 21, 15))).toBe(3)
  })
})

describe('mergeCartLines', () => {
  it('adds repeated products together, keeping first-seen order', () => {
    expect(
      mergeCartLines([
        { productId: 'A', quantity: 2 },
        { productId: 'B', quantity: 1 },
        { productId: 'A', quantity: 3 },
      ]),
    ).toEqual([
      { productId: 'A', quantity: 5 },
      { productId: 'B', quantity: 1 },
    ])
  })

  it('leaves a clean cart as it is without sharing its lines', () => {
    const cart = [{ productId: 'A', quantity: 2 }]

    expect(mergeCartLines(cart)).toEqual(cart)
    expect(mergeCartLines(cart)[0]).not.toBe(cart[0])
    expect(mergeCartLines([])).toEqual([])
  })
})
