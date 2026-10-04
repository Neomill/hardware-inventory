import type { StockStatus } from '@/domain/types'

/**
 * Stock status is always derived, never stored. Three screens in the design
 * disagreed on it precisely because each carried its own badge (E3), so there
 * is one rule and one place that applies it.
 */
export function deriveStockStatus(stock: number, reorderLevel: number): StockStatus {
  if (stock <= 0) {
    return 'out_of_stock'
  }

  return stock <= reorderLevel ? 'low_stock' : 'in_stock'
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
}
