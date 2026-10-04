import { describe, expect, it } from 'vitest'

import {
  computeBalanceDue,
  computeChange,
  computeSaleTotals,
  formatSaleNumber,
  validatePayment,
} from '@/domain/sale'
import type { SaleLine } from '@/domain/types'

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
