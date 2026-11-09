import type { Product, Sale } from '@/domain/types'

/** How far back "best seller" looks. Long enough to be steady, short enough to follow the season. */
export const BEST_SELLER_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Products ordered by how many units sold in the last `days`, most first, so
 * the items the counter sells every day are at the top of the Sell grid
 * (senior UX plan, Phase 5: recognition over recall). Cancelled sales do not
 * count. Products that sold the same amount keep their given order.
 */
export function orderByBestSellers(
  products: readonly Product[],
  sales: readonly Sale[],
  now: Date,
  days = BEST_SELLER_DAYS,
): Product[] {
  const since = now.getTime() - days * DAY_MS
  const sold = new Map<string, number>()

  for (const sale of sales) {
    if (sale.status === 'cancelled') {
      continue
    }

    const at = new Date(sale.occurredAt).getTime()

    if (Number.isNaN(at) || at < since || at > now.getTime()) {
      continue
    }

    for (const line of sale.lines) {
      sold.set(line.productId, (sold.get(line.productId) ?? 0) + line.quantity)
    }
  }

  return products
    .map((product, index) => ({ product, index, sold: sold.get(product.id) ?? 0 }))
    .sort((a, b) => b.sold - a.sold || a.index - b.index)
    .map((entry) => entry.product)
}
