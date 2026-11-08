import { describe, expect, it } from 'vitest'

import type { Product } from '@/domain/types'
import {
  computeDashboardData,
  needsRestock,
  percentChange,
  restockQueue,
  type DashboardInput,
} from '@/features/dashboard/lib/dashboardMetrics'
import { testMovement, testPayment, testSale } from '@/test/fixtures'

function product(id: string, stock: number, reorderLevel: number, isActive = true): Product {
  return {
    id,
    name: `Product ${id}`,
    sku: id,
    category: 'General',
    unit: 'pcs',
    price: 1000,
    stock,
    reorderLevel,
    isActive,
  }
}

function input(overrides: Partial<DashboardInput> = {}): DashboardInput {
  return { products: [], sales: [], movements: [], payments: [], ...overrides }
}

/** Local-time ISO string, so tests pass in any time zone. */
function at(year: number, month: number, day: number, hour = 12, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

describe('needsRestock', () => {
  it('includes low and out of stock, at the reorder level inclusive', () => {
    expect(needsRestock(product('a', 0, 10))).toBe(true)
    expect(needsRestock(product('b', 10, 10))).toBe(true)
    expect(needsRestock(product('c', 11, 10))).toBe(false)
  })
})

describe('restockQueue', () => {
  it('lists active low and out of stock products, out of stock first', () => {
    const queue = restockQueue([
      product('fine', 50, 10),
      product('low', 8, 10),
      product('lower', 2, 10),
      product('out', 0, 10),
      product('inactive', 0, 10, false),
      product('zero-level', 0, 0),
    ])

    expect(queue.map((p) => p.id)).toEqual(['out', 'zero-level', 'lower', 'low'])
  })
})

describe('percentChange', () => {
  it('has no basis when the previous figure is zero', () => {
    expect(percentChange(500, 0)).toBeNull()
  })

  it('reports rises and falls as percentages', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
  })
})

describe('computeDashboardData', () => {
  const day = new Date(2026, 9, 4, 9, 0)

  it('counts low and out of stock in the KPI, matching the list', () => {
    const products = [
      product('low', 5, 10),
      product('out', 0, 10),
      product('fine', 20, 10),
      product('inactive', 0, 10, false),
    ]

    const data = computeDashboardData(input({ products }), day)

    expect(data.kpis.lowStockCount).toBe(2)
    expect(data.lowStockItems.map((p) => p.id)).toEqual(['out', 'low'])
    expect(data.kpis.totalActiveProducts).toBe(3)
  })

  it('does not drop the KPI when a low item runs out', () => {
    const before = computeDashboardData(input({ products: [product('x', 1, 10)] }), day)
    const after = computeDashboardData(input({ products: [product('x', 0, 10)] }), day)

    expect(before.kpis.lowStockCount).toBe(1)
    expect(after.kpis.lowStockCount).toBe(1)
  })

  it("totals today's completed sales and compares with yesterday", () => {
    const sales = [
      testSale({ occurredAt: at(2026, 10, 4, 8), total: 30000 }),
      testSale({ occurredAt: at(2026, 10, 4, 10), total: 9000, status: 'cancelled' }),
      testSale({ occurredAt: at(2026, 10, 3, 17), total: 20000 }),
    ]

    const data = computeDashboardData(input({ sales }), day)

    expect(data.kpis.todaysSales).toBe(30000)
    expect(data.kpis.todaysSalesChange).toBe(50)
    expect(data.recentSales).toHaveLength(1)
  })

  // Spec 04 F2: a sale cancelled today leaves Recent Sales and every KPI.
  it('F2: leaves a cancelled sale out of Recent Sales and the KPIs', () => {
    const kept = testSale({
      id: 'S-KEPT',
      occurredAt: at(2026, 10, 4, 8),
      total: 15000,
      paymentMethod: 'credit',
      customerId: 'C1',
    })
    const cancelled = testSale({
      id: 'S-CANCELLED',
      occurredAt: at(2026, 10, 4, 8, 30),
      total: 25000,
      paymentMethod: 'credit',
      customerId: 'C1',
    })
    const cancellation = {
      cancelledAt: at(2026, 10, 4, 8, 45),
      cancelledBy: 'Tester',
      reason: 'Wrong item',
    }

    const standing = computeDashboardData(input({ sales: [kept, cancelled] }), day)
    const data = computeDashboardData(
      input({ sales: [kept, { ...cancelled, status: 'cancelled', cancellation }] }),
      day,
    )

    expect(standing.recentSales.map((sale) => sale.id)).toEqual(['S-CANCELLED', 'S-KEPT'])
    expect(data.recentSales.map((sale) => sale.id)).toEqual(['S-KEPT'])
    expect(data.kpis.todaysSales).toBe(15000)
    expect(data.kpis.outstandingCredit).toBe(15000)
    expect(data.kpis.outstandingCreditChange).toBe(
      computeDashboardData(input({ sales: [kept] }), day).kpis.outstandingCreditChange,
    )
  })

  it('follows the day it is given, so the figures roll over at midnight', () => {
    const sales = [testSale({ occurredAt: at(2026, 10, 4, 23, 50), total: 12000 })]

    const lateEvening = computeDashboardData(input({ sales }), new Date(2026, 9, 4, 23, 59))
    const afterMidnight = computeDashboardData(input({ sales }), new Date(2026, 9, 5, 0, 1))

    expect(lateEvening.kpis.todaysSales).toBe(12000)
    expect(lateEvening.recentSales).toHaveLength(1)
    expect(afterMidnight.kpis.todaysSales).toBe(0)
    expect(afterMidnight.kpis.todaysSalesChange).toBe(-100)
    expect(afterMidnight.recentSales).toHaveLength(0)
  })

  it('compares outstanding credit now with the opening balance of the day', () => {
    const sales = [
      testSale({
        occurredAt: at(2026, 10, 1),
        total: 40000,
        paymentMethod: 'credit',
        customerId: 'C1',
      }),
      testSale({
        occurredAt: at(2026, 10, 4, 8),
        total: 10000,
        paymentMethod: 'credit',
        customerId: 'C1',
      }),
    ]
    const payments = [testPayment('C1', 30000, at(2026, 10, 4, 8, 30))]

    const data = computeDashboardData(input({ sales, payments }), day)

    expect(data.kpis.outstandingCredit).toBe(20000)
    expect(data.kpis.outstandingCreditChange).toBe(-50)
  })

  it('shows the four newest stock movements', () => {
    const movements = [1, 2, 3, 4, 5].map((n) =>
      testMovement({ id: `M${n}`, occurredAt: at(2026, 10, n) }),
    )

    const data = computeDashboardData(input({ movements }), day)

    expect(data.recentMovements.map((m) => m.id)).toEqual(['M5', 'M4', 'M3', 'M2'])
  })
})
