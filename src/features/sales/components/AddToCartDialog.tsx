import { useCallback, useRef, useState } from 'react'
import { ShoppingCart } from 'lucide-react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { StatusPill } from '@/components/common/StatusPill'
import { STOCK_STATUS_TONES } from '@/components/common/statusTones'
import { deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { formatCurrency, formatNumber } from '@/lib/format'

/** Bulk quantities are one tap, because hardware sells in tens and hundreds. */
const QUICK_ADD = [1, 5, 10, 20, 50, 100]

type AddToCartDialogProps = {
  product: Product
  /** Already in the cart, so the dialog can cap what is still available. */
  inCart: number
  onClose: () => void
  onConfirm: (quantity: number) => void
}

export function AddToCartDialog({ product, inCart, onClose, onConfirm }: AddToCartDialogProps) {
  const available = Math.max(0, product.stock - inCart)
  const [quantity, setQuantity] = useState(Math.min(1, available))

  // Focus starts on the quantity control, the one thing the cashier came to set.
  // The shared stepper takes no ref, so its first enabled button is found here;
  // callback refs are attached before the dialog moves focus.
  const quantityFocusRef = useRef<HTMLElement | null>(null)
  const attachQuantityControl = useCallback((node: HTMLDivElement | null) => {
    quantityFocusRef.current = node?.querySelector<HTMLElement>('button:not(:disabled)') ?? null
  }, [])

  const status = deriveStockStatus(product.stock, product.reorderLevel)
  const tooMany = quantity > available

  function setClamped(next: number) {
    setQuantity(Math.max(1, Math.min(next, Math.max(available, 1))))
  }

  return (
    <Dialog title="Add to Cart" onClose={onClose} initialFocusRef={quantityFocusRef}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row">
          <span className="flex h-32 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300 sm:w-40">
            <ShoppingCart className="h-12 w-12" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-navy-900">{product.name}</h3>
            <p className="mt-1 text-lg font-semibold text-brand-600">
              {formatCurrency(product.price)} / {product.unit}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm text-navy-800">Stock available</span>
              <StatusPill tone={STOCK_STATUS_TONES[status]}>
                {formatNumber(product.stock)} {product.unit}
              </StatusPill>
            </div>
          </div>
        </div>

        {available === 0 ? (
          <Alert tone="error">
            All {formatNumber(product.stock)} {product.unit} are already in this sale.
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div ref={attachQuantityControl}>
                <p className="mb-2 text-sm font-semibold text-navy-900">Quantity</p>
                <QuantityStepper
                  value={quantity}
                  onChange={setClamped}
                  max={available}
                  size="lg"
                  label="quantity"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-navy-900">Unit</p>
                {/* One selling unit per product (decision D2), so nothing to choose. */}
                <p className="flex h-14 items-center rounded-xl border border-slate-200 bg-slate-50 px-5 text-base font-medium text-navy-900">
                  {product.unit}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_ADD.filter((step) => step <= available).map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setClamped(step)}
                  className="h-11 min-w-16 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50"
                >
                  {step}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-sm">
              <span className="font-semibold text-blue-900">
                Subtotal ({formatNumber(quantity)} {product.unit})
              </span>
              <span className="text-lg font-bold text-blue-900">
                {formatCurrency(product.price * quantity)}
              </span>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onClose} className="flex-1 sm:h-14">
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={ShoppingCart}
            onClick={() => onConfirm(quantity)}
            disabled={available === 0 || tooMany}
            className="flex-1 sm:h-14"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
