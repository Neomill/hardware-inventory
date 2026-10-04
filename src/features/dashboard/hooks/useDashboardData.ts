import { useMemo } from 'react'

import { useCalendarDay } from '@/features/dashboard/hooks/useCalendarDay'
import { computeDashboardData, dayFromKey } from '@/features/dashboard/lib/dashboardMetrics'
import type { DashboardData } from '@/features/dashboard/types'
import { useShopStore } from '@/stores/useShopStore'

/**
 * Everything the Dashboard shows, derived from the one store. Nothing here is
 * authored, so a sale taken at the counter moves these figures immediately and
 * they cannot disagree with the Products or Sales screens. The day follows the
 * clock, so "today" rolls over at midnight without a reload.
 */
export function useDashboardData(): DashboardData {
  const products = useShopStore((state) => state.products)
  const sales = useShopStore((state) => state.sales)
  const movements = useShopStore((state) => state.movements)
  const payments = useShopStore((state) => state.payments)
  const today = useCalendarDay()

  return useMemo(
    () => computeDashboardData({ products, sales, movements, payments }, dayFromKey(today)),
    [products, sales, movements, payments, today],
  )
}
