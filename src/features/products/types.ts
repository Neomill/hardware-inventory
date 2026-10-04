/** Products page view state. Shared entities live in src/domain. */

export type ProductFilters = {
  search: string
  category: string
  stockStatus: string
  unit: string
}

export type ProductSummary = {
  totalProducts: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
}
