import { describe, expect, it } from 'vitest'

import { dayRange } from '@/domain/dates'
import { breakDownVat } from '@/domain/money'
import {
  aggregateProductSales,
  aggregateSalesByDay,
  collectedAtSale,
  paymentMethodBreakdown,
  summarizeSales,
  sumPayments,
  topProductsByQuantity,
  topProductsByRevenue,
  wholePercentages,
} from '@/domain/reports'
import { testLine, testPayment, testSale } from '@/test/fixtures'

const at = (day: number, hour = 9) => new Date(2025, 4, day, hour).toISOString()

const PIPE = testLine('PVC-050', 2800, 10, 'PVC Pipe 1/2"')
const CEMENT = testLine('CEM-001', 26000, 2, 'Cement (Holcim)')
const NAILS = testLine('NAI-200', 9000, 1, 'Nails 2"')

const SALES = [
  testSale({ occurredAt: at(19), lines: [PIPE, CEMENT] }), // 80000 cash
  testSale({
    occurredAt: at(19, 15),
    lines: [NAILS],
    paymentMethod: 'credit',
    customerId: 'CUS-001',
  }), // 9000
  testSale({
    occurredAt: at(21),
    lines: [PIPE],
    paymentMethod: 'partial',
    amountPaid: 10000,
    customerId: 'CUS-002',
  }), // 28000
  testSale({ occurredAt: at(21, 12), lines: [CEMENT, NAILS], status: 'cancelled' }), // ignored
]

describe('collectedAtSale', () => {
  it('counts the total for cash, the down payment otherwise', () => {
    expect(collectedAtSale(SALES[0])).toBe(80000)
    expect(collectedAtSale(SALES[1])).toBe(0)
    expect(collectedAtSale(SALES[2])).toBe(10000)
  })
})

describe('summarizeSales', () => {
  it('sums completed sales and skips cancelled ones', () => {
    const summary = summarizeSales(SALES)

    expect(summary).toMatchObject({
      transactionCount: 3,
      itemCount: 23,
      grossSales: 117000,
      discounts: 0,
      totalSales: 117000,
      collected: 90000,
      creditExtended: 27000,
      averageSale: 39000,
    })
    expect(summary.netOfVat + summary.vat).toBe(summary.totalSales)
  })

  it('splits VAT at each sale’s own stamped rate, not today’s', () => {
    const sales = [
      testSale({ occurredAt: at(1), total: 63100, taxRate: 0.12 }),
      testSale({ occurredAt: at(2), total: 63100, taxRate: 0.1 }),
    ]
    const summary = summarizeSales(sales)

    expect(summary.vat).toBe(breakDownVat(63100, 0.12).vat + breakDownVat(63100, 0.1).vat)
    expect(summary.vat).toBe(6761 + 5736)
    expect(summary.netOfVat + summary.vat).toBe(126200)
  })

  it('records discounts separately from the total', () => {
    const sale = testSale({ occurredAt: at(1), lines: [CEMENT], discountAmount: 2000 })

    expect(summarizeSales([sale])).toMatchObject({
      grossSales: 52000,
      discounts: 2000,
      totalSales: 50000,
    })
  })

  it('rounds the average sale to whole centavos', () => {
    const sales = [100, 100, 101].map((total, index) =>
      testSale({ occurredAt: at(index + 1), total }),
    )

    expect(summarizeSales(sales).averageSale).toBe(100)
    expect(Number.isInteger(summarizeSales(sales).averageSale)).toBe(true)
  })

  it('is all zeros with no sales', () => {
    expect(summarizeSales([])).toMatchObject({ transactionCount: 0, totalSales: 0, averageSale: 0 })
  })

  it('respects a date range', () => {
    expect(
      summarizeSales(SALES, dayRange(new Date(2025, 4, 21), new Date(2025, 4, 21))).totalSales,
    ).toBe(28000)
  })
})

describe('aggregateSalesByDay', () => {
  it('groups by local day, oldest first, only days with sales when unranged', () => {
    const days = aggregateSalesByDay(SALES)

    expect(days.map((day) => [day.day, day.totalSales, day.transactionCount])).toEqual([
      ['2025-05-19', 89000, 2],
      ['2025-05-21', 28000, 1],
    ])
    expect(days[0].date).toEqual(new Date(2025, 4, 19))
  })

  it('fills every day of a range, including days with no sales', () => {
    const days = aggregateSalesByDay(SALES, dayRange(new Date(2025, 4, 18), new Date(2025, 4, 21)))

    expect(days.map((day) => [day.day, day.totalSales])).toEqual([
      ['2025-05-18', 0],
      ['2025-05-19', 89000],
      ['2025-05-20', 0],
      ['2025-05-21', 28000],
    ])
  })

  it('adds up to the overall summary', () => {
    const days = aggregateSalesByDay(SALES)

    expect(days.reduce((sum, day) => sum + day.vat, 0)).toBe(summarizeSales(SALES).vat)
  })
})

describe('top products', () => {
  it('aggregates units, revenue and the number of sales per product', () => {
    const pipe = aggregateProductSales(SALES).find((row) => row.productId === 'PVC-050')

    expect(pipe).toMatchObject({ quantity: 20, revenue: 56000, saleCount: 2, unit: 'pcs' })
  })

  it('ranks by quantity', () => {
    expect(topProductsByQuantity(SALES).map((row) => [row.productId, row.quantity])).toEqual([
      ['PVC-050', 20],
      ['CEM-001', 2],
      ['NAI-200', 1],
    ])
  })

  it('ranks by revenue', () => {
    expect(topProductsByRevenue(SALES).map((row) => [row.productId, row.revenue])).toEqual([
      ['PVC-050', 56000],
      ['CEM-001', 52000],
      ['NAI-200', 9000],
    ])
  })

  it('breaks ties predictably and honours the limit', () => {
    const sales = [
      testSale({
        occurredAt: at(1),
        lines: [testLine('B', 100, 5, 'Bolt'), testLine('A', 100, 5, 'Anchor')],
      }),
    ]

    expect(topProductsByQuantity(sales).map((row) => row.productName)).toEqual(['Anchor', 'Bolt'])
    expect(topProductsByRevenue(sales, 1).map((row) => row.productName)).toEqual(['Anchor'])
  })

  it('keeps the latest name for a renamed product', () => {
    const sales = [
      testSale({ occurredAt: at(2), lines: [testLine('X', 100, 1, 'New Name')] }),
      testSale({ occurredAt: at(1), lines: [testLine('X', 100, 1, 'Old Name')] }),
    ]

    expect(aggregateProductSales(sales)[0].productName).toBe('New Name')
  })
})

describe('paymentMethodBreakdown', () => {
  it('always returns cash, partial and credit in order', () => {
    const rows = paymentMethodBreakdown(SALES)

    expect(rows.map((row) => [row.method, row.label, row.saleCount, row.total])).toEqual([
      ['cash', 'Cash', 1, 80000],
      ['partial', 'Partial', 1, 28000],
      ['credit', 'Credit', 1, 9000],
    ])
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
    expect(rows.reduce((sum, row) => sum + row.percent, 0)).toBe(100)
  })

  it('gives zero shares with no sales', () => {
    expect(paymentMethodBreakdown([]).map((row) => [row.share, row.percent])).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ])
  })
})

describe('wholePercentages', () => {
  it('adds up to exactly 100 where plain rounding would not', () => {
    expect(wholePercentages([1, 1, 1])).toEqual([34, 33, 33])
    expect(wholePercentages([1, 1, 1, 1, 1, 1, 1])).toEqual([15, 15, 14, 14, 14, 14, 14])
  })

  it('leaves exact shares alone', () => {
    expect(wholePercentages([50, 25, 25])).toEqual([50, 25, 25])
  })

  it('is all zeros when there is nothing to share', () => {
    expect(wholePercentages([0, 0])).toEqual([0, 0])
  })
})

describe('sumPayments', () => {
  it('totals ledger payments within a range', () => {
    const payments = [testPayment('CUS-001', 5000, at(19)), testPayment('CUS-002', 2500, at(21))]

    expect(sumPayments(payments)).toBe(7500)
    expect(sumPayments(payments, dayRange(new Date(2025, 4, 21), new Date(2025, 4, 21)))).toBe(2500)
  })
})
