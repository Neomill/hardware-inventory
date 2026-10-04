import { isProductStockFilter, type ProductStockFilter } from '@/app/routes'
import { STOCK_STATUS_LABELS, deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import type { ProductFilters, ProductSummary, StockFilterValue } from '@/features/products/types'

export const ALL = 'all'

/** Dropdown order and labels. `restock` is what the dashboard's Low Stock card counts. */
export const STOCK_FILTER_OPTIONS: { value: ProductStockFilter; label: string }[] = [
  { value: 'in_stock', label: STOCK_STATUS_LABELS.in_stock },
  { value: 'low_stock', label: STOCK_STATUS_LABELS.low_stock },
  { value: 'out_of_stock', label: STOCK_STATUS_LABELS.out_of_stock },
  { value: 'restock', label: 'Needs restocking' },
]

/**
 * Reads the `?stock=` query value. Anything missing or unknown means no stock
 * filter, so a stale or hand-typed link still opens the full list.
 */
export function parseStockFilter(value: string | null | undefined): StockFilterValue {
  return isProductStockFilter(value) ? value : ALL
}

/** `restock` is low or out of stock: stock at or under the reorder level. */
export function matchesStockFilter(product: Product, filter: StockFilterValue): boolean {
  if (filter === ALL) {
    return true
  }

  const status = deriveStockStatus(product.stock, product.reorderLevel)

  return filter === 'restock' ? status !== 'in_stock' : status === filter
}

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

  return product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term)
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

    return matchesStockFilter(product, filters.stockStatus)
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
