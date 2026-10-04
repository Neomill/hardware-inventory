import type { PillTone } from '@/components/common/StatusPill'
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

export const STOCK_STATUS_TONES: Record<StockStatus, PillTone> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
}

/** The stock figure itself is coloured to match its status. */
export const STOCK_TEXT_STYLES: Record<StockStatus, string> = {
  in_stock: 'text-emerald-600',
  low_stock: 'text-amber-600',
  out_of_stock: 'text-rose-600',
}
