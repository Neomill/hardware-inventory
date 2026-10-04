import { useMemo } from 'react'

import { computeSaleTotals } from '@/domain/sale'
import type { CartLine, Product, SaleLine } from '@/domain/types'
import { useShopStore } from '@/stores/useShopStore'

export type CartEntry = {
  line: SaleLine
  product: Product
}

/**
 * The cart joined to live product data, plus its totals. Components read this
 * instead of the raw cart so a stock change is reflected immediately.
 *
 * A line whose product no longer exists is not hidden (spec 03 s.5.5): it is
 * returned in `unavailable` so the cart can show it with a Remove control, and
 * checkout can refuse to continue until it is gone. It adds nothing to the
 * totals, since it has no price.
 */
export function useCart() {
  const cart = useShopStore((state) => state.cart)
  const products = useShopStore((state) => state.products)
  const taxRate = useShopStore((state) => state.taxRate)

  return useMemo(() => {
    const entries: CartEntry[] = []
    const unavailable: CartLine[] = []

    for (const item of cart) {
      const product = products.find((candidate) => candidate.id === item.productId)

      if (!product) {
        unavailable.push(item)
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
      unavailable,
      totals: computeSaleTotals(
        entries.map((entry) => entry.line),
        0,
        taxRate,
      ),
      taxRate,
      isEmpty: cart.length === 0,
    }
  }, [cart, products, taxRate])
}
