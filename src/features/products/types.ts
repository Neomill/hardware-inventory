/** Products page view state. Shared entities live in src/domain. */

import type { ProductStockFilter } from '@/app/routes'

/** `all`, or one of the stock filters a link can also preselect via `?stock=`. */
export type StockFilterValue = ProductStockFilter | 'all'

export type ProductFilters = {
  search: string
  category: string
  stockStatus: StockFilterValue
  unit: string
}

export type ProductSummary = {
  totalProducts: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
}
