import { useEffect, useId, useRef, type CSSProperties, type ReactNode, type Ref } from 'react'
import { ArrowRight, Package, PauseCircle, Trash2, X } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { CartTotals } from '@/features/sales/components/CartTotals'
import type { CartEntry } from '@/features/sales/hooks/useCart'
import type { SaleTotals } from '@/domain/sale'
import type { CartLine } from '@/domain/types'
import { canProceedToCheckout } from '@/features/sales/lib/cartLayout'
import { formatItemCount } from '@/features/sales/lib/salesMetrics'
import { formatCurrency, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

type CartPanelProps = {
  entries: CartEntry[]
  /** Lines whose product no longer exists; shown so they can be removed, never sold. */
  unavailable: CartLine[]
  totals: SaleTotals
  taxRate: number
  onQuantityChange: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  /** Asks to clear: the page confirms before the cart is emptied. */
  onClear: () => void
  onCheckout: () => void
  /** Opens the Pause Sale dialog. */
  onHold: () => void
  /** Whether Pause Sale can be used now, and why not (spec 03 s.7.4). */
  hold: { canHold: boolean; reason: string | null }
  /** Shows a close button in the header (the cart in a bottom sheet). */
  onClose?: () => void
  /** Id of the heading, so a surrounding dialog can be named by it. */
  headingId?: string
  /** The heading takes focus when the cart opens or is cleared. */
  headingRef?: Ref<HTMLHeadingElement>
  className?: string
  /** Height cap measured from the layout; only the lines scroll inside it. */
  style?: CSSProperties
  /** An Undo bar for the line just removed, shown under the header. */
  undo?: ReactNode
}

/**
 * The running sale. The header (title, Clear) and the footer (totals,
 * Proceed to Checkout, Pause Sale) always stay in view; when the lines do not
 * fit the height the panel is given, only the list of lines scrolls.
 */
export function CartPanel({
  entries,
  unavailable,
  totals,
  taxRate,
  onQuantityChange,
  onRemove,
  onClear,
  onCheckout,
  onHold,
  hold,
  onClose,
  headingId,
  headingRef,
  className,
  style,
  undo,
}: CartPanelProps) {
  const holdHintId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const lineCount = entries.length + unavailable.length
  const hasLines = lineCount > 0
  const previousLineCount = useRef(lineCount)

  // New lines are added at the end: keep the newest one in view when the list scrolls.
  useEffect(() => {
    if (lineCount > previousLineCount.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }

    previousLineCount.current = lineCount
  }, [lineCount])

  return (
    <section
      style={style}
      className={cn('card flex min-h-0 min-w-0 flex-col overflow-hidden', className)}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="text-lg font-semibold text-navy-900"
        >
          Current Sale ({formatItemCount(totals.itemCount)})
        </h2>

        <div className="flex items-center gap-2">
          {hasLines ? (
            <button
              type="button"
              onClick={onClear}
              aria-haspopup="dialog"
              className="inline-flex h-12 items-center gap-2 rounded-lg px-3 text-base font-semibold text-rose-700 transition-colors hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="h-5 w-5" aria-hidden />
              Clear
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cart"
              className="flex h-12 w-12 items-center justify-center rounded-lg text-navy-700 transition-colors hover:bg-slate-100"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>
      </header>

      {undo ? <div className="shrink-0 px-5 pt-3">{undo}</div> : null}

      {!hasLines ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-5 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
            <Package className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-base text-muted">
            Tap <strong className="text-navy-900">Add</strong> on a product to start this sale.
          </p>
        </div>
      ) : (
        <ul
          ref={listRef}
          aria-label="Cart lines"
          className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain"
        >
          {entries.map(({ line, product }) => (
            <li key={line.productId} className="flex flex-col gap-2 px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium text-navy-900">
                    {line.productName}
                  </span>
                  <span className="block text-sm text-muted">
                    {formatCurrency(line.unitPrice)} / {line.unit}
                  </span>
                </span>

                <span className="shrink-0 text-base font-bold tabular-nums text-navy-900">
                  {formatCurrency(line.lineTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <QuantityStepper
                  value={line.quantity}
                  onChange={(quantity) => onQuantityChange(line.productId, quantity)}
                  min={1}
                  max={product.stock}
                  label={`${line.productName} quantity`}
                />

                <button
                  type="button"
                  onClick={() => onRemove(line.productId)}
                  aria-label={`Remove ${line.productName}`}
                  className="inline-flex h-12 items-center gap-2 rounded-lg px-3 text-base font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                >
                  <Trash2 className="h-5 w-5" aria-hidden />
                  Remove
                </button>
              </div>
            </li>
          ))}

          {unavailable.map((line) => (
            <li
              key={line.productId}
              className="flex items-start justify-between gap-3 bg-rose-50/60 px-5 py-3"
            >
              <span className="min-w-0 flex-1 text-base">
                <span className="block font-medium text-navy-900">Unavailable item</span>
                <span className="block text-sm text-rose-700">
                  {formatNumber(line.quantity)} of a product that is no longer in the product list.
                  Remove it to continue.
                </span>
              </span>

              <button
                type="button"
                onClick={() => onRemove(line.productId)}
                aria-label={`Remove unavailable item ${line.productId}`}
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg px-3 text-base font-semibold text-rose-700 transition-colors hover:bg-rose-100"
              >
                <Trash2 className="h-5 w-5" aria-hidden />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <CartTotals totals={totals} taxRate={taxRate} />

        <Button
          variant="primary"
          icon={ArrowRight}
          onClick={onCheckout}
          disabled={!canProceedToCheckout(entries.length, unavailable.length)}
          className="h-14 text-base"
        >
          Proceed to Checkout
        </Button>

        <Button
          icon={PauseCircle}
          onClick={onHold}
          disabled={!hold.canHold}
          aria-describedby={hold.reason ? holdHintId : undefined}
        >
          Pause Sale
        </Button>
        {hold.reason ? (
          <p id={holdHintId} className="-mt-1 text-center text-sm text-muted">
            {hold.reason}
          </p>
        ) : null}
      </div>
    </section>
  )
}
