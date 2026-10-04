import { useMemo } from 'react'

import { computeSaleTotals } from '@/domain/sale'
import type { Product, SaleLine } from '@/domain/types'
import { useShopStore } from '@/stores/useShopStore'

export type CartEntry = {
  line: SaleLine
  product: Product
}

/**
 * The cart joined to live product data, plus its totals. Components read this
 * instead of the raw cart so a stock change is reflected immediately.
 */
export function useCart() {
  const cart = useShopStore((state) => state.cart)
  const products = useShopStore((state) => state.products)
  const taxRate = useShopStore((state) => state.taxRate)

  return useMemo(() => {
    const entries: CartEntry[] = []

    for (const item of cart) {
      const product = products.find((candidate) => candidate.id === item.productId)

      if (!product) {
        continue
      }

      entries.push({
        product,
        line: {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          unitPrice: product.price,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        },
      })
    }

    return {
      entries,
      totals: computeSaleTotals(
        entries.map((entry) => entry.line),
        0,
        taxRate,
      ),
      taxRate,
      isEmpty: entries.length === 0,
    }
  }, [cart, products, taxRate])
}
