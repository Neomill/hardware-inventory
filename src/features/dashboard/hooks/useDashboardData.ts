import { useMemo } from 'react'

import { computeTotalOutstanding } from '@/domain/ledger'
import { deriveStockStatus } from '@/domain/stock'
import { computeSalesMetrics, newestFirst, salesOnDay } from '@/features/sales/lib/salesMetrics'
import type { DashboardData } from '@/features/dashboard/types'
import { useShopStore } from '@/stores/useShopStore'

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null
  }

  return ((current - previous) / previous) * 100
}

/**
 * Everything the Dashboard shows, derived from the one store. Nothing here is
 * authored, so a sale taken at the counter moves these figures immediately and
 * they cannot disagree with the Products or Sales screens.
 */
export function useDashboardData(): DashboardData {
  const products = useShopStore((state) => state.products)
  const sales = useShopStore((state) => state.sales)
  const movements = useShopStore((state) => state.movements)
  const payments = useShopStore((state) => state.payments)

  return useMemo(() => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    const today = computeSalesMetrics(sales, now)
    const previous = computeSalesMetrics(sales, yesterday)

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    // Money still owed across every sale, less what customers have paid since.
    const outstanding = computeTotalOutstanding(sales, payments, now)
    const outstandingBefore = computeTotalOutstanding(sales, payments, startOfToday)

    const active = products.filter((product) => product.isActive)

    return {
      kpis: {
        todaysSales: today.totalSales,
        todaysSalesChange: percentChange(today.totalSales, previous.totalSales),
        outstandingCredit: outstanding,
        outstandingCreditChange: percentChange(outstanding, outstandingBefore),
        lowStockCount: active.filter(
          (product) => deriveStockStatus(product.stock, product.reorderLevel) === 'low_stock',
        ).length,
        totalActiveProducts: active.length,
      },
      recentSales: newestFirst(salesOnDay(sales, now)).slice(0, 5),
      // Most urgent first: least stock relative to what triggers a reorder.
      lowStockItems: active
        .filter((product) => deriveStockStatus(product.stock, product.reorderLevel) !== 'in_stock')
        .sort((a, b) => a.stock / a.reorderLevel - b.stock / b.reorderLevel)
        .slice(0, 5),
      recentMovements: [...movements]
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        .slice(0, 4),
      note: {
        id: 'note-1',
        body: 'Check with supplier for more 1/2" PVC Pipe.',
      },
    }
  }, [products, sales, movements, payments])
}
