import { useEffect, useId, useMemo, useState } from 'react'
import { ArrowLeft, PauseCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { SearchInput } from '@/components/common/SearchInput'
import { ROUTES } from '@/app/routes'
import type { Product } from '@/domain/types'
import { AddToCartDialog } from '@/features/sales/components/AddToCartDialog'
import { CartNoticePanel } from '@/features/sales/components/CartNoticePanel'
import { CartPanel } from '@/features/sales/components/CartPanel'
import { HoldSaleDialog } from '@/features/sales/components/HoldSaleDialog'
import { PosProductGrid } from '@/features/sales/components/PosProductGrid'
import { useCart } from '@/features/sales/hooks/useCart'
import {
  buildLiveCartNotice,
  holdAvailability,
  planCartRepair,
  readPosCartNotice,
  type CartNotice,
  type SalesRootNavState,
} from '@/features/sales/lib/heldSales'
import { useShopStore } from '@/stores/useShopStore'
import { cn } from '@/lib/utils'

const ALL_CATEGORIES = 'all'

export function PosPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const holdHintId = useId()
  const products = useShopStore((state) => state.products)
  const addToCart = useShopStore((state) => state.addToCart)
  const setCartQuantity = useShopStore((state) => state.setCartQuantity)
  const removeFromCart = useShopStore((state) => state.removeFromCart)
  const clearCart = useShopStore((state) => state.clearCart)
  const cartLineCount = useShopStore((state) => state.cart.length)
  const heldCount = useShopStore((state) => state.heldSales.length)

  const { entries, unavailable, totals, taxRate } = useCart()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [selected, setSelected] = useState<Product | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isHoldOpen, setHoldOpen] = useState(false)
  // What changed in the cart: handed over by a resume, or found on opening
  // (spec 03 s.5.5, s.7.3). Lives only as long as this page.
  const [notices, setNotices] = useState<CartNotice[]>(() => {
    const resumed = readPosCartNotice(location.state)

    return resumed ? [resumed] : []
  })

  // The resume notice is read once; clear it from history so a reload or Back
  // does not show it again.
  useEffect(() => {
    if (location.state !== null && location.state !== undefined) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  // Bring the live cart within current stock when the page opens, with the same
  // rules and wording as a resume. Read straight from the store so a second
  // run (React StrictMode) sees the repaired cart and does nothing.
  useEffect(() => {
    const { cart, products: current } = useShopStore.getState()
    const plan = planCartRepair(cart, current)

    for (const repair of plan.repairs) {
      if (repair.kind === 'remove') {
        removeFromCart(repair.productId)
      } else {
        setCartQuantity(repair.productId, repair.quantity)
      }
    }

    const notice = buildLiveCartNotice(plan.adjustments)

    if (notice) {
      setNotices((previous) => [...previous, notice])
    }
  }, [removeFromCart, setCartQuantity])

  const holdState = holdAvailability(cartLineCount, heldCount)

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

      return product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term)
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

  function handleHeld() {
    setHoldOpen(false)
    const state: SalesRootNavState = { notice: 'Sale held.' }
    navigate(ROUTES.sales, { state })
  }

  const inCart = selected
    ? (entries.find((entry) => entry.line.productId === selected.id)?.line.quantity ?? 0)
    : 0

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {message ? <Alert tone="error">{message}</Alert> : null}

      {notices.map((notice, index) => (
        <CartNoticePanel
          key={`${notice.title}-${index}`}
          notice={notice}
          onDismiss={() => setNotices((previous) => previous.filter((_, at) => at !== index))}
        />
      ))}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
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

        <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <CartPanel
            entries={entries}
            unavailable={unavailable}
            totals={totals}
            taxRate={taxRate}
            onQuantityChange={handleQuantityChange}
            onRemove={removeFromCart}
            onClear={clearCart}
            onCheckout={() => navigate(ROUTES.checkout)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button icon={ArrowLeft} to={ROUTES.sales}>
          Back to Sales
        </Button>
        <div className="flex min-w-0 flex-col gap-1">
          <Button
            icon={PauseCircle}
            onClick={() => setHoldOpen(true)}
            disabled={!holdState.canHold}
            aria-describedby={holdState.reason ? holdHintId : undefined}
          >
            Hold Sale
          </Button>
          {holdState.reason ? (
            <p id={holdHintId} className="text-center text-xs text-muted">
              {holdState.reason}
            </p>
          ) : null}
        </div>
      </div>

      {isHoldOpen ? (
        <HoldSaleDialog onClose={() => setHoldOpen(false)} onHeld={handleHeld} />
      ) : null}

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
