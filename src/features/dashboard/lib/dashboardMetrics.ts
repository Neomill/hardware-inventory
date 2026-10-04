import { computeTotalOutstanding } from '@/domain/ledger'
import { deriveStockStatus } from '@/domain/stock'
import type { CustomerPayment, Product, Sale, StockMovement } from '@/domain/types'
import { computeSalesMetrics, newestFirst, salesOnDay } from '@/features/sales/lib/salesMetrics'
import type { DashboardData } from '@/features/dashboard/types'

export const RECENT_SALES_LIMIT = 5
export const LOW_STOCK_LIMIT = 5
export const RECENT_MOVEMENTS_LIMIT = 4

// ---- Calendar day ----------------------------------------------------------

/** Local midnight at the start of `date`'s day. */
export function startOfDay(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

/** Local midnight at the start of the day after `date`. */
export function startOfNextDay(date: Date): Date {
  const next = startOfDay(date)
  next.setDate(next.getDate() + 1)
  return next
}

/** Milliseconds from `now` until the next local midnight (always > 0). */
export function msUntilNextDay(now: Date): number {
  return Math.max(1, startOfNextDay(now).getTime() - now.getTime())
}

/** "2026-10-04" in local time; equal keys mean the same calendar day. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Midnight at the start of the day encoded by `dayKey`. */
export function dayFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// ---- Stock -----------------------------------------------------------------

/**
 * Low or out of stock: stock at or below the reorder level. This is what the
 * Low Stock KPI counts, what the list beside it shows, and what
 * ROUTES.productsByStock('restock') filters, so the three always agree.
 */
export function needsRestock(product: Product): boolean {
  return deriveStockStatus(product.stock, product.reorderLevel) !== 'in_stock'
}

/** How close to empty a product is; lower is more urgent. */
function stockCover(product: Product): number {
  if (product.stock <= 0) {
    return -1
  }

  return product.reorderLevel > 0 ? product.stock / product.reorderLevel : 0
}

/** Active products needing a restock, most urgent first (out of stock first). */
export function restockQueue(products: Product[]): Product[] {
  return products
    .filter((product) => product.isActive && needsRestock(product))
    .sort((a, b) => stockCover(a) - stockCover(b) || a.name.localeCompare(b.name))
}

// ---- KPIs ------------------------------------------------------------------

/** Percentage change, or null when there is no basis to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null
  }

  return ((current - previous) / previous) * 100
}

export type DashboardInput = {
  products: Product[]
  sales: Sale[]
  movements: StockMovement[]
  payments: CustomerPayment[]
}

/**
 * Everything the Dashboard shows for the calendar day `day`, derived from
 * store records with the same functions Sales, Ledger and Products use.
 */
export function computeDashboardData(
  { products, sales, movements, payments }: DashboardInput,
  day: Date,
): DashboardData {
  const today = startOfDay(day)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todaysSales = computeSalesMetrics(sales, today).totalSales
  const yesterdaysSales = computeSalesMetrics(sales, yesterday).totalSales

  // Owed now (everything recorded) against what was owed when the day began.
  const outstanding = computeTotalOutstanding(sales, payments)
  const outstandingAtOpening = computeTotalOutstanding(sales, payments, today)

  const restock = restockQueue(products)

  return {
    kpis: {
      todaysSales,
      todaysSalesChange: percentChange(todaysSales, yesterdaysSales),
      outstandingCredit: outstanding,
      outstandingCreditChange: percentChange(outstanding, outstandingAtOpening),
      lowStockCount: restock.length,
      totalActiveProducts: products.filter((product) => product.isActive).length,
    },
    recentSales: newestFirst(salesOnDay(sales, today)).slice(0, RECENT_SALES_LIMIT),
    lowStockItems: restock.slice(0, LOW_STOCK_LIMIT),
    recentMovements: [...movements]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, RECENT_MOVEMENTS_LIMIT),
  }
}
