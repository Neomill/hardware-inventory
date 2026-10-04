import { deriveStockStatus } from '@/domain/stock'
import type { Product, StockStatus } from '@/domain/types'

export const ALL = 'all'

export type InventoryFilters = {
  search: string
  stockStatus: StockStatus | typeof ALL
  category: string
}

export const EMPTY_INVENTORY_FILTERS: InventoryFilters = {
  search: '',
  stockStatus: ALL,
  category: ALL,
}

export type InventorySummary = {
  /** Active products. */
  skuCount: number
  lowStockCount: number
  outOfStockCount: number
}

export function isInventoryFiltered(filters: InventoryFilters): boolean {
  return (
    filters.search.trim() !== '' || filters.stockStatus !== ALL || filters.category !== ALL
  )
}

/** Name and SKU only; the store does not use barcodes (DESIGN-ERRATA E8). */
export function matchesProductSearch(product: Product, search: string): boolean {
  const term = search.trim().toLowerCase()

  if (term === '') {
    return true
  }

  return product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term)
}

/** Out of stock first, then low, then healthy: what needs attention leads. */
const STATUS_ORDER: Record<StockStatus, number> = {
  out_of_stock: 0,
  low_stock: 1,
  in_stock: 2,
}

export function filterInventory(products: Product[], filters: InventoryFilters): Product[] {
  return products
    .filter((product) => {
      const status = deriveStockStatus(product.stock, product.reorderLevel)

      return (
        matchesProductSearch(product, filters.search) &&
        (filters.stockStatus === ALL || status === filters.stockStatus) &&
        (filters.category === ALL || product.category === filters.category)
      )
    })
    .sort((a, b) => {
      const byStatus =
        STATUS_ORDER[deriveStockStatus(a.stock, a.reorderLevel)] -
        STATUS_ORDER[deriveStockStatus(b.stock, b.reorderLevel)]

      return byStatus !== 0 ? byStatus : a.name.localeCompare(b.name)
    })
}

/** Catalogue-wide counts. Inactive products are not stocked, so they are left out. */
export function summarizeInventory(products: Product[]): InventorySummary {
  const summary: InventorySummary = { skuCount: 0, lowStockCount: 0, outOfStockCount: 0 }

  for (const product of products) {
    if (!product.isActive) {
      continue
    }

    summary.skuCount += 1

    const status = deriveStockStatus(product.stock, product.reorderLevel)

    if (status === 'low_stock') {
      summary.lowStockCount += 1
    } else if (status === 'out_of_stock') {
      summary.outOfStockCount += 1
    }
  }

  return summary
}

/** Sorted, de-duplicated categories for the filter dropdown. */
export function distinctCategories(products: Product[]): string[] {
  return [...new Set(products.map((product) => product.category))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** Matches for the product picker, alphabetical, capped so the list stays short. */
export function searchProducts(products: Product[], search: string, limit: number): Product[] {
  return products
    .filter((product) => matchesProductSearch(product, search))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit)
}
