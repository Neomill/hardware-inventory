import { useMemo, useState } from 'react'
import { ArrowLeft, PauseCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { SearchInput } from '@/components/common/SearchInput'
import { ROUTES } from '@/app/routes'
import type { Product } from '@/domain/types'
import { AddToCartDialog } from '@/features/sales/components/AddToCartDialog'
import { CartPanel } from '@/features/sales/components/CartPanel'
import { PosProductGrid } from '@/features/sales/components/PosProductGrid'
import { useCart } from '@/features/sales/hooks/useCart'
import { useShopStore } from '@/stores/useShopStore'
import { cn } from '@/lib/utils'

const ALL_CATEGORIES = 'all'

export function PosPage() {
  const navigate = useNavigate()
  const products = useShopStore((state) => state.products)
  const addToCart = useShopStore((state) => state.addToCart)
  const setCartQuantity = useShopStore((state) => state.setCartQuantity)
  const removeFromCart = useShopStore((state) => state.removeFromCart)
  const clearCart = useShopStore((state) => state.clearCart)
  const holdCart = useShopStore((state) => state.holdCart)

  const { entries, totals, taxRate } = useCart()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [selected, setSelected] = useState<Product | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      if (!product.isActive) {
        return false
      }

      if (category !== ALL_CATEGORIES && product.category !== category) {
        return false
      }

      if (term === '') {
        return true
      }

      return (
        product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term)
      )
    })
  }, [products, category, search])

  function handleConfirmAdd(quantity: number) {
    if (!selected) {
      return
    }

    const result = addToCart(selected.id, quantity)
    setMessage(result.ok ? null : result.message)
    setSelected(null)
  }

  function handleQuantityChange(productId: string, quantity: number) {
    const result = setCartQuantity(productId, quantity)
    setMessage(result.ok ? null : result.message)
  }

  function handleHold() {
    const result = holdCart()

    if (result.ok) {
      navigate(ROUTES.sales)

      return
    }

    setMessage(result.message)
  }

  const inCart = selected
    ? (entries.find((entry) => entry.line.productId === selected.id)?.line.quantity ?? 0)
    : 0

  return (
    <div className="flex flex-col gap-5">
      {message ? <Alert tone="error">{message}</Alert> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search products"
            placeholder="Search by product name or SKU..."
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory(ALL_CATEGORIES)}
              aria-pressed={category === ALL_CATEGORIES}
              className={cn(
                'h-11 rounded-xl px-4 text-sm font-semibold transition-colors',
                category === ALL_CATEGORIES
                  ? 'bg-navy-900 text-white'
                  : 'border border-slate-200 bg-white text-navy-700 hover:bg-navy-50',
              )}
            >
              All
            </button>

            {categories.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                aria-pressed={category === name}
                className={cn(
                  'h-11 rounded-xl px-4 text-sm font-semibold transition-colors',
                  category === name
                    ? 'bg-navy-900 text-white'
                    : 'border border-slate-200 bg-white text-navy-700 hover:bg-navy-50',
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <PosProductGrid products={visible} onSelect={setSelected} />
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <CartPanel
            entries={entries}
            totals={totals}
            taxRate={taxRate}
            onQuantityChange={handleQuantityChange}
            onRemove={removeFromCart}
            onClear={clearCart}
            onCheckout={() => navigate(ROUTES.checkout)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button icon={ArrowLeft} to={ROUTES.sales} className="flex-1">
          Back to Sales
        </Button>
        <Button icon={PauseCircle} onClick={handleHold} className="flex-1">
          Hold Sale
        </Button>
      </div>

      {selected ? (
        <AddToCartDialog
          product={selected}
          inCart={inCart}
          onClose={() => setSelected(null)}
          onConfirm={handleConfirmAdd}
        />
      ) : null}
    </div>
  )
}
