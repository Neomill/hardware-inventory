import type { Centavos } from '@/domain/money'
import type { Product, Sale, StockMovement } from '@/domain/types'

export type DashboardKpis = {
  todaysSales: Centavos
  /** Percentage change against yesterday, or null when there is no basis. */
  todaysSalesChange: number | null
  outstandingCredit: Centavos
  outstandingCreditChange: number | null
  /** Active products at or below their reorder level (low or out of stock). */
  lowStockCount: number
  totalActiveProducts: number
}

export type DashboardData = {
  kpis: DashboardKpis
  recentSales: Sale[]
  lowStockItems: Product[]
  recentMovements: StockMovement[]
}
