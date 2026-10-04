import { describe, expect, it } from 'vitest'

import { remainingBySale } from '@/domain/ledger'
import {
  computeSalesMetrics,
  countCustomersServed,
  describeSettlement,
  formatItemCount,
  newestFirst,
  salesOnDay,
} from '@/features/sales/lib/salesMetrics'
import { testLine, testPayment, testSale } from '@/test/fixtures'

/** Local-time ISO string, so tests pass in any time zone. */
function at(day: number, hour = 12, minute = 0): string {
  return new Date(2026, 9, day, hour, minute).toISOString()
}

const TODAY = new Date(2026, 9, 5, 18, 0)

describe('computeSalesMetrics: outstanding', () => {
  it('reports what is still unpaid on today’s sales after customer payments', () => {
    const credit = testSale({
      occurredAt: at(5, 9),
      total: 50000,
      paymentMethod: 'credit',
      customerId: 'C-1',
    })
    const partial = testSale({
      occurredAt: at(5, 10),
      total: 30000,
      paymentMethod: 'partial',
      amountPaid: 10000,
      customerId: 'C-2',
    })
    const cash = testSale({ occurredAt: at(5, 11), total: 20000 })
    // C-1 pays 20,000 of the 50,000 credit later today.
    const payments = [testPayment('C-1', 20000, at(5, 15))]

    const metrics = computeSalesMetrics([credit, partial, cash], TODAY, payments)

    expect(metrics.outstanding).toBe(30000 + 20000)
    expect(metrics.outstandingCount).toBe(2)
  })

  it('drops a sale from the count once it is paid off', () => {
    const credit = testSale({
      occurredAt: at(5, 9),
      total: 50000,
      paymentMethod: 'credit',
      customerId: 'C-1',
    })
    const payments = [testPayment('C-1', 50000, at(5, 15))]

    const metrics = computeSalesMetrics([credit], TODAY, payments)

    expect(metrics.outstanding).toBe(0)
    expect(metrics.outstandingCount).toBe(0)
  })

  it('allocates payments to the oldest charge first, like the Ledger', () => {
    // Yesterday's credit absorbs the payment before today's does.
    const yesterday = testSale({
      occurredAt: at(4, 9),
      total: 40000,
      paymentMethod: 'credit',
      customerId: 'C-1',
    })
    const today = testSale({
      occurredAt: at(5, 9),
      total: 25000,
      paymentMethod: 'credit',
      customerId: 'C-1',
    })
    const payments = [testPayment('C-1', 50000, at(5, 12))]

    const metrics = computeSalesMetrics([yesterday, today], TODAY, payments)

    expect(metrics.outstanding).toBe(15000)
    expect(metrics.outstandingCount).toBe(1)
  })

  it('ignores cancelled sales and other days', () => {
    const cancelled = testSale({
      occurredAt: at(5, 9),
      total: 50000,
      paymentMethod: 'credit',
      customerId: 'C-1',
      status: 'cancelled',
    })
    const yesterday = testSale({
      occurredAt: at(4, 9),
      total: 40000,
      paymentMethod: 'credit',
      customerId: 'C-1',
    })

    const metrics = computeSalesMetrics([cancelled, yesterday], TODAY, [])

    expect(metrics.outstanding).toBe(0)
    expect(metrics.transactionCount).toBe(0)
  })

  it('keeps the dashboard call shape: payments are optional', () => {
    const credit = testSale({
      occurredAt: at(5, 9),
      total: 50000,
      paymentMethod: 'credit',
      customerId: 'C-1',
    })

    const metrics = computeSalesMetrics([credit], TODAY)

    expect(metrics.totalSales).toBe(50000)
    expect(metrics.outstanding).toBe(50000)
  })
})

describe('computeSalesMetrics: customers served', () => {
  it('counts each named customer once and each walk-in sale separately', () => {
    const sales = [
      testSale({ occurredAt: at(5, 9), customerId: 'C-1' }),
      testSale({ occurredAt: at(5, 10), customerId: 'C-1' }),
      testSale({ occurredAt: at(5, 11), customerId: 'C-2' }),
      testSale({ occurredAt: at(5, 12) }),
      testSale({ occurredAt: at(5, 13) }),
    ]

    expect(computeSalesMetrics(sales, TODAY).customersServed).toBe(4)
  })

  it('counts walk-ins when nobody named bought anything', () => {
    const sales = [testSale({ occurredAt: at(5, 9) }), testSale({ occurredAt: at(5, 10) })]

    expect(countCustomersServed(sales)).toBe(2)
  })

  it('is zero with no sales', () => {
    expect(countCustomersServed([])).toBe(0)
  })
})

describe('computeSalesMetrics: totals', () => {
  it('splits today’s takings by payment method and ranks products', () => {
    const sales = [
      testSale({ occurredAt: at(5, 9), lines: [testLine('A', 1000, 3), testLine('B', 5000, 1)] }),
      testSale({
        occurredAt: at(5, 10),
        lines: [testLine('A', 1000, 2)],
        paymentMethod: 'credit',
        customerId: 'C-1',
      }),
    ]

    const metrics = computeSalesMetrics(sales, TODAY)

    expect(metrics.totalSales).toBe(10000)
    expect(metrics.paymentSlices).toEqual([
      { method: 'cash', amount: 8000, share: 0.8 },
      { method: 'partial', amount: 0, share: 0 },
      { method: 'credit', amount: 2000, share: 0.2 },
    ])
    expect(metrics.topProducts.map((product) => [product.productId, product.quantity])).toEqual([
      ['A', 5],
      ['B', 1],
    ])
  })
})

describe('describeSettlement', () => {
  const credit = testSale({
    occurredAt: at(5, 9),
    total: 50000,
    paymentMethod: 'credit',
    customerId: 'C-1',
  })

  it('reads Outstanding with nothing paid', () => {
    expect(describeSettlement(credit, 50000)).toMatchObject({
      status: 'outstanding',
      label: 'Outstanding',
      tone: 'danger',
      remaining: 50000,
    })
  })

  it('reads Partially Paid once a customer payment reduces it', () => {
    const remaining = remainingBySale([credit], [testPayment('C-1', 20000, at(5, 15))]).get(
      credit.id,
    )

    expect(describeSettlement(credit, remaining ?? 0)).toMatchObject({
      label: 'Partially Paid',
      tone: 'warning',
      remaining: 30000,
    })
  })

  it('reads Paid when nothing is left', () => {
    expect(describeSettlement(credit, 0)).toMatchObject({
      label: 'Paid',
      tone: 'success',
      remaining: 0,
    })
  })
})

describe('list helpers', () => {
  it('picks one day’s sales and sorts newest first', () => {
    const early = testSale({ occurredAt: at(5, 8) })
    const late = testSale({ occurredAt: at(5, 16) })
    const other = testSale({ occurredAt: at(4, 16) })

    expect(salesOnDay([early, late, other], TODAY)).toEqual([early, late])
    expect(newestFirst([early, other, late])).toEqual([late, early, other])
  })

  it('words item counts with singular and plural', () => {
    expect(formatItemCount(1)).toBe('1 item')
    expect(formatItemCount(0)).toBe('0 items')
    expect(formatItemCount(3)).toBe('3 items')
    expect(formatItemCount(1200)).toBe('1,200 items')
  })
})
