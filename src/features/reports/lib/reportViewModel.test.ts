import { describe, expect, it } from 'vitest'

import { dayRange } from '@/domain/dates'
import {
  buildOutstandingCredit,
  buildReportViewModel,
  buildTopProducts,
  formatCompactCurrency,
  niceScale,
} from '@/features/reports/lib/reportViewModel'
import { testLine, testPayment, testSale } from '@/test/fixtures'

const at = (day: number, hour = 9) => new Date(2025, 4, day, hour).toISOString()

const PIPE = testLine('PVC-050', 2800, 10, 'PVC Pipe 1/2"')
const CEMENT = testLine('CEM-001', 26000, 2, 'Cement (Holcim)')
const NAILS = testLine('NAI-200', 9000, 1, 'Nails 2"')

const CUSTOMERS = [
  { id: 'CUS-001', name: 'Pedro Santos' },
  { id: 'CUS-002', name: 'Maria Reyes' },
  { id: 'CUS-003', name: 'Settled Sam' },
]

const SALES = [
  testSale({ occurredAt: at(19), lines: [PIPE, CEMENT] }), // 80000 cash
  testSale({ occurredAt: at(19, 15), lines: [NAILS], paymentMethod: 'credit', customerId: 'CUS-001' }), // 9000
  testSale({
    occurredAt: at(21),
    lines: [PIPE],
    paymentMethod: 'partial',
    amountPaid: 10000,
    customerId: 'CUS-002',
  }), // 28000, 18000 owing
  testSale({ occurredAt: at(21, 12), lines: [CEMENT, NAILS], status: 'cancelled' }), // ignored
  testSale({ occurredAt: at(2), lines: [NAILS], paymentMethod: 'credit', customerId: 'CUS-003' }), // outside range
]

const PAYMENTS = [
  testPayment('CUS-003', 9000, at(3), 'PAY-00001'), // outside range, settles CUS-003
  testPayment('CUS-002', 5000, at(20), 'PAY-00002'),
  testPayment('CUS-001', 1000, at(21, 16), 'PAY-00003'),
]

const RANGE = dayRange(new Date(2025, 4, 19), new Date(2025, 4, 21))

describe('niceScale', () => {
  it('gives a 0..1 axis when there is nothing to plot', () => {
    expect(niceScale([])).toEqual({ max: 1, ticks: [0, 1] })
    expect(niceScale([0, 0])).toEqual({ max: 1, ticks: [0, 1] })
  })

  it('rounds the top up to a round step that holds the largest value', () => {
    expect(niceScale([1_845_000, 20_000])).toEqual({
      max: 2_000_000,
      ticks: [0, 500_000, 1_000_000, 1_500_000, 2_000_000],
    })
    expect(niceScale([80000])).toEqual({ max: 80000, ticks: [0, 20000, 40000, 60000, 80000] })
  })

  it('never steps by less than one whole unit', () => {
    expect(niceScale([1])).toEqual({ max: 1, ticks: [0, 1] })
    expect(niceScale([3]).ticks).toEqual([0, 1, 2, 3])
  })

  it('always reaches at least the largest value', () => {
    for (const value of [7, 99, 101, 12_345, 987_654_321]) {
      const scale = niceScale([value])

      expect(scale.max).toBeGreaterThanOrEqual(value)
      expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.max)
    }
  })
})

describe('formatCompactCurrency', () => {
  it('abbreviates large peso amounts from centavos', () => {
    expect(formatCompactCurrency(150_000_00)).toMatch(/150K/)
    expect(formatCompactCurrency(0)).toMatch(/0/)
  })
})

describe('buildTopProducts', () => {
  it('ranks by quantity with shares that add up to 100', () => {
    const rows = buildTopProducts(SALES, 'quantity', RANGE)

    expect(rows.map((row) => [row.rank, row.productId, row.quantity])).toEqual([
      [1, 'PVC-050', 20],
      [2, 'CEM-001', 2],
      [3, 'NAI-200', 1],
    ])
    expect(rows.reduce((sum, row) => sum + row.percent, 0)).toBe(100)
  })

  it('ranks by revenue when asked, and honours the limit', () => {
    const rows = buildTopProducts(SALES, 'revenue', RANGE, 2)

    expect(rows.map((row) => [row.productId, row.revenue])).toEqual([
      ['PVC-050', 56000],
      ['CEM-001', 52000],
    ])
  })

  it('is empty for a range with no sales', () => {
    expect(buildTopProducts(SALES, 'quantity', dayRange(new Date(2025, 0, 1), new Date(2025, 0, 1)))).toEqual([])
  })
})

describe('buildOutstandingCredit', () => {
  it('lists current balances and only the payments received in the range', () => {
    const credit = buildOutstandingCredit(CUSTOMERS, SALES, PAYMENTS, RANGE)

    // 9000 - 1000 owed by CUS-001, 18000 - 5000 by CUS-002, CUS-003 settled.
    expect(credit.totalOutstanding).toBe(21000)
    expect(credit.balances.map((row) => [row.customerId, row.outstanding])).toEqual([
      ['CUS-002', 13000],
      ['CUS-001', 8000],
    ])
    expect(credit.paymentsInRange.map((payment) => payment.id)).toEqual(['PAY-00003', 'PAY-00002'])
    expect(credit.paymentsReceived).toBe(6000)
  })
})

describe('buildReportViewModel', () => {
  const view = buildReportViewModel({
    sales: SALES,
    payments: PAYMENTS,
    customers: CUSTOMERS,
    range: RANGE,
    topMetric: 'quantity',
  })

  it('summarises completed sales in the range only', () => {
    expect(view.summary.transactionCount).toBe(3)
    expect(view.summary.totalSales).toBe(117000)
    expect(view.summary.collected).toBe(90000)
    expect(view.summary.creditExtended).toBe(27000)
    expect(view.summary.collected + view.summary.creditExtended).toBe(view.summary.totalSales)
  })

  it('has one zero-filled row per day and a scale that holds the busiest one', () => {
    expect(view.daily.map((day) => [day.day, day.totalSales])).toEqual([
      ['2025-05-19', 89000],
      ['2025-05-20', 0],
      ['2025-05-21', 28000],
    ])
    expect(view.dailyScale.max).toBeGreaterThanOrEqual(89000)
    expect(view.daily.reduce((sum, day) => sum + day.totalSales, 0)).toBe(view.summary.totalSales)
  })

  it('breaks payments down into the same total as the summary', () => {
    expect(view.paymentRows.map((row) => [row.method, row.total, row.percent])).toEqual([
      ['cash', 80000, 68],
      ['partial', 28000, 24],
      ['credit', 9000, 8],
    ])
    expect(view.paymentTotal).toBe(view.summary.totalSales)
  })
})
