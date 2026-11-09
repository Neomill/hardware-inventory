import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { SearchInput } from '@/components/common/SearchInput'
import { ROUTES } from '@/app/routes'
import type { CartLine, Product } from '@/domain/types'
import { AddToCartDialog } from '@/features/sales/components/AddToCartDialog'
import { CartBar } from '@/features/sales/components/CartBar'
import { CartNoticePanel } from '@/features/sales/components/CartNoticePanel'
import { CartPanel } from '@/features/sales/components/CartPanel'
import { CartSheet } from '@/features/sales/components/CartSheet'
import { ClearCartDialog } from '@/features/sales/components/ClearCartDialog'
import { HeldSalesButton } from '@/features/sales/components/HeldSalesButton'
import { HeldSalesDialog } from '@/features/sales/components/HeldSalesDialog'
import { HoldSaleDialog } from '@/features/sales/components/HoldSaleDialog'
import { PosProductGrid } from '@/features/sales/components/PosProductGrid'
import { UndoBar } from '@/features/sales/components/UndoBar'
import { useCart } from '@/features/sales/hooks/useCart'
import { useStickyMaxHeight } from '@/features/sales/hooks/useStickyMaxHeight'
import { orderByBestSellers } from '@/features/sales/lib/bestSellers'
import { cartBarSummary } from '@/features/sales/lib/cartBar'
import { POS_CART_BESIDE_GRID_QUERY, canProceedToCheckout } from '@/features/sales/lib/cartLayout'
import {
  buildLiveCartNotice,
  holdAvailability,
  planCartRepair,
  readPosCartNotice,
  type CartNotice,
  type SalesRootNavState,
} from '@/features/sales/lib/heldSales'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useShopStore } from '@/stores/useShopStore'
import { cn } from '@/lib/utils'

const ALL_CATEGORIES = 'all'

export function PosPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const sheetId = useId()
  const cartHeadingId = useId()
  const cartHeadingRef = useRef<HTMLHeadingElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const viewCartRef = useRef<HTMLButtonElement>(null)
  const cartColumnRef = useRef<HTMLDivElement>(null)
  const productColumnRef = useRef<HTMLDivElement>(null)
  const products = useShopStore((state) => state.products)
  const addToCart = useShopStore((state) => state.addToCart)
  const setCartQuantity = useShopStore((state) => state.setCartQuantity)
  const removeFromCart = useShopStore((state) => state.removeFromCart)
  const restoreCartLine = useShopStore((state) => state.restoreCartLine)
  const clearCart = useShopStore((state) => state.clearCart)
  const cartLineCount = useShopStore((state) => state.cart.length)
  const cartLines = useShopStore((state) => state.cart)
  const sales = useShopStore((state) => state.sales)
  const heldCount = useShopStore((state) => state.heldSales.length)

  const { entries, unavailable, totals, taxRate } = useCart()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [selected, setSelected] = useState<Product | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [resumedMessage, setResumedMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  // The line just removed, so it can be put back. Cleared by the next action.
  const [removed, setRemoved] = useState<{ line: CartLine; index: number; name: string } | null>(
    null,
  )
  const [isHoldOpen, setHoldOpen] = useState(false)
  const [isHeldOpen, setHeldOpen] = useState(false)
  const [isClearOpen, setClearOpen] = useState(false)
  const [isSheetOpen, setSheetOpen] = useState(false)
  // Set when the cart was cleared: the Clear button is gone, so focus moves on
  // once the dialog has closed (a cancel returns it to Clear).
  const focusAfterClearRef = useRef(false)
  // What changed in the cart: handed over by a resume, or found on opening
  // (spec 03 s.5.5, s.7.3). Lives only as long as this page.
  const [notices, setNotices] = useState<CartNotice[]>(() => {
    const resumed = readPosCartNotice(location.state)

    return resumed ? [resumed] : []
  })

  // One cart per layout, never both: a sticky column beside the grid at xl, a
  // bottom sheet opened from the cart bar below it.
  const isCartBesideGrid = useMediaQuery(POS_CART_BESIDE_GRID_QUERY)
  // The sheet closes when nothing is left in it (cleared, last line removed)
  // or when the screen grows wide enough for the column.
  const isSheetShown = isSheetOpen && !isCartBesideGrid && cartLineCount > 0
  const cartMaxHeight = useStickyMaxHeight(cartColumnRef, productColumnRef, isCartBesideGrid)

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

  // Runs after the dialog's own cleanup, which skips the removed Clear button.
  // Beside the grid the cart stays, so focus goes to its heading; the sheet
  // closes with the cart emptied, so focus goes to the search, ready for the
  // next sale.
  useEffect(() => {
    if (!isClearOpen && focusAfterClearRef.current) {
      focusAfterClearRef.current = false
      const target = isCartBesideGrid ? cartHeadingRef.current : searchRef.current
      target?.focus()
    }
  }, [isClearOpen, isCartBesideGrid])

  // Keep the open flag in step with what is shown, so the sheet does not pop
  // back open later (a rotation back to portrait, the next item added).
  useEffect(() => {
    if (isSheetOpen && !isSheetShown) {
      setSheetOpen(false)
    }
  }, [isSheetOpen, isSheetShown])

  // When the sheet closed on its own, its trigger may have gone with the bar
  // (empty cart): put focus on the search rather than leave it on <body>.
  const wasSheetShownRef = useRef(false)
  useEffect(() => {
    if (isSheetShown) {
      wasSheetShownRef.current = true

      return
    }

    if (wasSheetShownRef.current) {
      wasSheetShownRef.current = false

      if (document.activeElement === null || document.activeElement === document.body) {
        searchRef.current?.focus()
      }
    }
  }, [isSheetShown])

  const holdState = holdAvailability(cartLineCount, heldCount)

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products],
  )

  // Best sellers first, so the everyday items need no searching (Phase 5).
  const ranked = useMemo(() => orderByBestSellers(products, sales, new Date()), [products, sales])

  const inCartById = useMemo(
    () => new Map(cartLines.map((line) => [line.productId, line.quantity])),
    [cartLines],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return ranked.filter((product) => {
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
  }, [ranked, category, search])

  // One tap adds one; Choose Quantity opens the dialog for bulk amounts.
  function handleAddOne(product: Product) {
    const result = addToCart(product.id, 1)
    setMessage(result.ok ? null : result.message)
    setResumedMessage(null)
    setInfoMessage(null)
    setRemoved(null)
  }

  function handleConfirmAdd(quantity: number) {
    if (!selected) {
      return
    }

    const result = addToCart(selected.id, quantity)
    setMessage(result.ok ? null : result.message)
    setResumedMessage(null)
    setInfoMessage(null)
    setRemoved(null)
    setSelected(null)
  }

  function handleQuantityChange(productId: string, quantity: number) {
    const result = setCartQuantity(productId, quantity)
    setMessage(result.ok ? null : result.message)
    setInfoMessage(null)
    setRemoved(null)
  }

  // No confirmation for one line: it goes at once and Undo puts it back
  // (senior UX plan, Phase 4). A line whose product is gone gets no Undo.
  function handleRemove(productId: string) {
    const current = useShopStore.getState().cart
    const index = current.findIndex((line) => line.productId === productId)
    const entry = entries.find((candidate) => candidate.line.productId === productId)

    removeFromCart(productId)
    setMessage(null)
    setInfoMessage(null)
    setRemoved(
      entry && index >= 0 ? { line: current[index], index, name: entry.line.productName } : null,
    )
  }

  function handleUndoRemove() {
    if (!removed) {
      return
    }

    const result = restoreCartLine(removed.line, removed.index)
    setRemoved(null)
    setMessage(result.ok ? null : result.message)
    setInfoMessage(result.ok ? result.message : null)
  }

  function handleConfirmClear() {
    clearCart()
    setMessage(null)
    setResumedMessage(null)
    setInfoMessage(null)
    setRemoved(null)
    focusAfterClearRef.current = true
    setClearOpen(false)
  }

  function handleHeld() {
    setHoldOpen(false)
    const state: SalesRootNavState = { notice: 'Sale paused.' }
    navigate(ROUTES.sales, { state })
  }

  // Resumed from the Paused Sales list opened on this page: the store has loaded
  // the cart, so stay here and show what changed (replacing notices about the
  // cart that was there before).
  function handleResumed(cartNotice: CartNotice | null) {
    setHeldOpen(false)
    setMessage(null)
    setInfoMessage(null)
    setRemoved(null)
    setNotices(cartNotice ? [cartNotice] : [])
    setResumedMessage(cartNotice ? null : 'Paused sale resumed.')
  }

  const cartItemCount =
    totals.itemCount + unavailable.reduce((count, line) => count + line.quantity, 0)

  const barSummary = cartBarSummary(totals, cartLineCount, unavailable.length)

  const inCart = selected
    ? (entries.find((entry) => entry.line.productId === selected.id)?.line.quantity ?? 0)
    : 0

  const undoBar = removed ? (
    <UndoBar
      message={`Removed ${removed.name}.`}
      undoLabel={`Undo: put ${removed.name} back in the cart`}
      onUndo={handleUndoRemove}
    />
  ) : null

  const cart = (
    <CartPanel
      entries={entries}
      unavailable={unavailable}
      totals={totals}
      taxRate={taxRate}
      onQuantityChange={handleQuantityChange}
      onRemove={handleRemove}
      undo={undoBar}
      onClear={() => setClearOpen(true)}
      onCheckout={() => navigate(ROUTES.checkout)}
      onHold={() => setHoldOpen(true)}
      hold={holdState}
      headingId={cartHeadingId}
      headingRef={cartHeadingRef}
      onClose={isCartBesideGrid ? undefined : () => setSheetOpen(false)}
      className={isCartBesideGrid ? undefined : 'rounded-b-none border-b-0'}
      style={
        isCartBesideGrid && cartMaxHeight !== undefined ? { maxHeight: cartMaxHeight } : undefined
      }
    />
  )

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {message ? <Alert tone="error">{message}</Alert> : null}
      {resumedMessage ? <Alert tone="success">{resumedMessage}</Alert> : null}
      {infoMessage ? <Alert tone="info">{infoMessage}</Alert> : null}

      {notices.map((notice, index) => (
        <CartNoticePanel
          key={`${notice.title}-${index}`}
          notice={notice}
          onDismiss={() => setNotices((previous) => previous.filter((_, at) => at !== index))}
        />
      ))}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div ref={productColumnRef} className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <SearchInput
              ref={searchRef}
              value={search}
              onChange={setSearch}
              label="Search products"
              placeholder="Search by product name or code..."
              className="min-w-0 flex-1"
            />
            <HeldSalesButton
              count={heldCount}
              onClick={() => setHeldOpen(true)}
              className="shrink-0"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory(ALL_CATEGORIES)}
              aria-pressed={category === ALL_CATEGORIES}
              className={cn(
                'h-12 rounded-xl px-4 text-base font-semibold transition-colors',
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
                  'h-12 rounded-xl px-4 text-base font-semibold transition-colors',
                  category === name
                    ? 'bg-navy-900 text-white'
                    : 'border border-slate-200 bg-white text-navy-700 hover:bg-navy-50',
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <p className="-mb-2 text-sm text-muted">Best sellers first</p>
          <PosProductGrid
            products={visible}
            inCart={inCartById}
            onAdd={handleAddOne}
            onChooseQuantity={setSelected}
          />
        </div>

        {isCartBesideGrid ? (
          <div ref={cartColumnRef} className="sticky top-4 flex min-w-0 flex-col self-start">
            {cart}
          </div>
        ) : null}
      </div>

      <div className="flex">
        <Button icon={ArrowLeft} to={ROUTES.sales} className="w-full sm:w-auto">
          Back to Sales
        </Button>
      </div>

      {!isCartBesideGrid ? (
        <CartBar
          summary={barSummary}
          sheetId={sheetId}
          isCartOpen={isSheetShown}
          onViewCart={() => setSheetOpen(true)}
          onCheckout={() => navigate(ROUTES.checkout)}
          canCheckout={canProceedToCheckout(entries.length, unavailable.length)}
          viewCartRef={viewCartRef}
        />
      ) : null}

      {/* The sheet closes when its last line goes: keep Undo in reach below the grid. */}
      {!isCartBesideGrid && !isSheetShown && cartLineCount === 0 && undoBar ? (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 print:hidden">
          {undoBar}
        </div>
      ) : null}

      {isSheetShown ? (
        <CartSheet
          id={sheetId}
          labelledBy={cartHeadingId}
          onClose={() => setSheetOpen(false)}
          initialFocusRef={cartHeadingRef}
          returnFocusRef={viewCartRef}
        >
          {cart}
        </CartSheet>
      ) : null}

      {isHeldOpen ? (
        <HeldSalesDialog
          context="pos"
          onClose={() => setHeldOpen(false)}
          onResumed={handleResumed}
        />
      ) : null}

      {isClearOpen ? (
        <ClearCartDialog
          itemCount={cartItemCount}
          onClose={() => setClearOpen(false)}
          onConfirm={handleConfirmClear}
        />
      ) : null}

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
