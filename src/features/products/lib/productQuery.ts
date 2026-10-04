import { deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import type { ProductFilters, ProductSummary } from '@/features/products/types'

export const ALL = 'all'

export const EMPTY_FILTERS: ProductFilters = {
  search: '',
  category: ALL,
  stockStatus: ALL,
  unit: ALL,
}

export function isFiltered(filters: ProductFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.category !== ALL ||
    filters.stockStatus !== ALL ||
    filters.unit !== ALL
  )
}

/** Name and SKU only. The store does not use barcodes (DESIGN-ERRATA E8). */
function matchesSearch(product: Product, search: string): boolean {
  const term = search.trim().toLowerCase()

  if (term === '') {
    return true
  }

  return (
    product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term)
  )
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((product) => {
    if (!matchesSearch(product, filters.search)) {
      return false
    }

    if (filters.category !== ALL && product.category !== filters.category) {
      return false
    }

    if (filters.unit !== ALL && product.unit !== filters.unit) {
      return false
    }

    if (
      filters.stockStatus !== ALL &&
      deriveStockStatus(product.stock, product.reorderLevel) !== filters.stockStatus
    ) {
      return false
    }

    return true
  })
}

/**
 * Inventory-wide totals, as the design's summary strip reads: it describes the
 * catalogue, not the current filter. Stock value is price times stock on hand.
 */
export function summarise(products: Product[]): ProductSummary {
  const active = products.filter((product) => product.isActive)

  return {
    totalProducts: active.length,
    totalStockValue: active.reduce((total, product) => total + product.price * product.stock, 0),
    lowStockCount: active.filter(
      (product) => deriveStockStatus(product.stock, product.reorderLevel) === 'low_stock',
    ).length,
    outOfStockCount: active.filter(
      (product) => deriveStockStatus(product.stock, product.reorderLevel) === 'out_of_stock',
    ).length,
  }
}

/** Sorted, de-duplicated values for a filter dropdown. */
export function distinctValues(products: Product[], key: 'category' | 'unit'): string[] {
  return [...new Set(products.map((product) => product[key]))].sort((a, b) => a.localeCompare(b))
}

/** "1-10 of 42", or "0 of 0" when a filter matches nothing. */
export function rangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) {
    return '0 of 0'
  }

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return `${first}-${last} of ${total}`
}
