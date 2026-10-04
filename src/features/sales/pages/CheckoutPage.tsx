import { useEffect, useId, useRef, useState } from 'react'
import { Banknote, Check, CheckCircle2, CreditCard, HandCoins, Trash2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { SelectField } from '@/components/common/SelectField'
import { ROUTES } from '@/app/routes'
import { computeBalanceDue, computeChange } from '@/domain/sale'
import type { PaymentMethod } from '@/domain/types'
import { CartTotals } from '@/features/sales/components/CartTotals'
import { useCart } from '@/features/sales/hooks/useCart'
import { defaultAmountText, evaluateCheckout } from '@/features/sales/lib/checkout'
import { formatItemCount } from '@/features/sales/lib/salesMetrics'
import { useShopStore } from '@/stores/useShopStore'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

const WALK_IN = 'walk-in'

type MethodOption = {
  value: PaymentMethod
  label: string
  icon: LucideIcon
  hint: string
  /** Ring colour when selected, matching the design's per-method accent. */
  selected: string
}

const METHODS: MethodOption[] = [
  {
    value: 'cash',
    label: 'Cash',
    icon: Banknote,
    hint: 'Paid in full now.',
    selected: 'border-emerald-500 bg-emerald-50',
  },
  {
    value: 'partial',
    label: 'Partial Payment',
    icon: HandCoins,
    hint: 'Pays part now, rest on the ledger.',
    selected: 'border-brand-500 bg-brand-50',
  },
  {
    value: 'credit',
    label: 'Credit',
    icon: CreditCard,
    hint: 'Nothing paid now.',
    selected: 'border-violet-500 bg-violet-50',
  },
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const customers = useShopStore((state) => state.customers)
  const setCartQuantity = useShopStore((state) => state.setCartQuantity)
  const recordSale = useShopStore((state) => state.recordSale)
  const clearCart = useShopStore((state) => state.clearCart)

  const { entries, unavailable, totals, taxRate, isEmpty } = useCart()

  const amountId = useId()
  const amountErrorId = useId()
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [customerId, setCustomerId] = useState<string>(WALK_IN)
  // Null until the cashier types: the field then shows the method's default, so
  // cash starts at the exact total on first load and follows the total if a
  // quantity is changed on this page.
  const [typed, setTyped] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCancelOpen, setCancelOpen] = useState(false)
  // Set while cancelling, so emptying the cart does not trigger the redirect below.
  const leavingRef = useRef(false)

  // An empty cart has nothing to check out; go back rather than show a blank form.
  useEffect(() => {
    if (isEmpty && !leavingRef.current) {
      navigate(ROUTES.newSale, { replace: true })
    }
  }, [isEmpty, navigate])

  const resolvedCustomerId = customerId === WALK_IN ? null : customerId
  const amountText = typed ?? defaultAmountText(method, totals.total)

  const checkout = evaluateCheckout({
    method,
    amountText,
    total: totals.total,
    customerId: resolvedCustomerId,
    lineCount: totals.lineCount,
  })
  const canConfirm = checkout.canConfirm && unavailable.length === 0
  // Display only: a field that holds no amount shows no change and the full balance.
  const shownPaid = checkout.amountPaid ?? 0
  const change = computeChange(totals.total, shownPaid)
  const balanceDue = computeBalanceDue(method, totals.total, shownPaid)

  function handleMethodChange(next: PaymentMethod) {
    setMethod(next)
    setError(null)
    // Back to the method's default: cash is the exact amount (one tap for the
    // most common case), partial starts blank.
    setTyped(null)
  }

  function handleCancelSale() {
    leavingRef.current = true
    setCancelOpen(false)
    navigate(ROUTES.sales)
    clearCart()
  }

  function handleConfirm() {
    if (checkout.amountPaid === null || !canConfirm) {
      return
    }

    const result = recordSale({
      paymentMethod: method,
      amountPaid: checkout.amountPaid,
      customerId: resolvedCustomerId,
    })

    if (!result.ok) {
      setError(result.message)

      return
    }

    navigate(ROUTES.saleDetail(result.sale.id), { state: { completed: true } })
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <section className="card flex min-w-0 flex-col gap-4 p-5">
        <h2 className="text-base font-semibold text-navy-900">
          1. Sale Items ({formatItemCount(totals.itemCount)})
        </h2>

        <ul className="divide-y divide-slate-100">
          {entries.map(({ line, product }) => (
            <li key={line.productId} className="flex flex-wrap items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-navy-900">{line.productName}</span>
                <span className="block text-xs text-muted">
                  {formatCurrency(line.unitPrice)} / {line.unit}
                </span>
              </span>

              <QuantityStepper
                value={line.quantity}
                onChange={(quantity) => setCartQuantity(line.productId, quantity)}
                min={1}
                max={product.stock}
                label={`${line.productName} quantity`}
              />

              <span className="shrink-0 whitespace-nowrap text-right text-sm font-bold tabular-nums text-navy-900 sm:min-w-24">
                {formatCurrency(line.lineTotal)}
              </span>
            </li>
          ))}
        </ul>

        {unavailable.length > 0 ? (
          <Alert tone="error">
            {unavailable.length === 1
              ? 'One line in this sale is for a product that is no longer in the product list.'
              : `${unavailable.length} lines in this sale are for products that are no longer in the product list.`}{' '}
            Go back to the sale and remove {unavailable.length === 1 ? 'it' : 'them'} to continue.
          </Alert>
        ) : null}

        <CartTotals totals={totals} taxRate={taxRate} />
      </section>

      <div className="flex min-w-0 flex-col gap-5">
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-base font-semibold text-navy-900">
            2. Customer{' '}
            <span className="text-sm font-medium text-muted">
              {method === 'cash' ? '(optional)' : '(required)'}
            </span>
          </h2>

          <SelectField
            label="Customer"
            value={customerId}
            onChange={(value) => {
              setCustomerId(value)
              setError(null)
            }}
            options={[
              { value: WALK_IN, label: 'Walk-in Customer' },
              ...customers.map((customer) => ({ value: customer.id, label: customer.name })),
            ]}
          />

          {/* The walk-in rule is stated here only, not again under Payment. */}
          {checkout.customerError ? <Alert tone="error">{checkout.customerError}</Alert> : null}
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-base font-semibold text-navy-900">3. Payment</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {METHODS.map((option) => {
              const Icon = option.icon
              const isSelected = method === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleMethodChange(option.value)}
                  aria-pressed={isSelected}
                  className={cn(
                    'relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-colors',
                    isSelected
                      ? option.selected
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  {/* Not colour alone: the chosen card carries a tick and the word. */}
                  {isSelected ? (
                    <CheckCircle2
                      className="absolute right-2 top-2 h-5 w-5 text-navy-900"
                      aria-hidden
                    />
                  ) : null}
                  <Icon className="h-7 w-7 text-navy-800" aria-hidden />
                  <span className="text-sm font-semibold text-navy-900">{option.label}</span>
                  <span className="text-xs text-muted">{option.hint}</span>
                  {isSelected ? (
                    <span className="text-xs font-bold uppercase tracking-wide text-navy-900">
                      Selected
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {method === 'credit' ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-x-3">
                <span className="font-semibold text-violet-900">Credit amount (total due)</span>
                <span className="text-lg font-bold text-violet-900">
                  {formatCurrency(totals.total)}
                </span>
              </div>
              <p className="mt-2 text-sm text-violet-900">
                No payment received. This is recorded on the customer&apos;s ledger.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={amountId} className="text-sm font-semibold text-navy-900">
                  {method === 'cash' ? 'Cash received' : 'Amount paid now'}
                </label>
                <span className="relative flex items-center">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-4 text-lg text-muted"
                  >
                    &#8369;
                  </span>
                  <input
                    id={amountId}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amountText}
                    onChange={(event) => {
                      setTyped(event.target.value)
                      setError(null)
                    }}
                    placeholder="0.00"
                    aria-invalid={checkout.amountError ? true : undefined}
                    aria-describedby={checkout.amountError ? amountErrorId : undefined}
                    className={cn(
                      'h-16 w-full min-w-0 rounded-xl border bg-white pl-10 pr-4 text-right text-2xl font-bold tabular-nums text-navy-900',
                      checkout.amountError ? 'border-rose-400' : 'border-slate-200',
                    )}
                  />
                </span>
                {checkout.amountError ? (
                  <p id={amountErrorId} className="text-sm font-medium text-rose-700">
                    {checkout.amountError}
                  </p>
                ) : null}
              </div>

              {method === 'cash' ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-3">
                    <span className="text-base font-bold text-emerald-800">Change</span>
                    <span className="text-2xl font-bold text-emerald-700">
                      {formatCurrency(change)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-emerald-900">
                    Total due {formatCurrency(totals.total)}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-brand-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-3">
                    <span className="text-base font-bold text-brand-700">Remaining balance</span>
                    <span className="text-2xl font-bold text-brand-700">
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-brand-700">
                    Total due {formatCurrency(totals.total)}. The balance goes on the ledger.
                  </p>
                </div>
              )}
            </div>
          )}

          {error ? <Alert tone="error">{error}</Alert> : null}
          {!error && checkout.paymentMessage ? (
            <Alert tone="info">{checkout.paymentMessage}</Alert>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button icon={X} to={ROUTES.newSale} className="h-14 flex-1">
              Back to Sale
            </Button>
            <Button
              variant="primary"
              icon={Check}
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="h-14 flex-1 text-base"
            >
              Confirm Sale
            </Button>
          </div>

          <Button
            icon={Trash2}
            variant="ghost"
            onClick={() => setCancelOpen(true)}
            className="self-start text-rose-700 hover:bg-rose-50"
          >
            Cancel sale
          </Button>
        </section>
      </div>

      {isCancelOpen ? (
        <Dialog title="Cancel this sale?" onClose={() => setCancelOpen(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-navy-800">
              The {formatItemCount(totals.itemCount)} in the cart will be removed. Nothing is
              recorded and stock is not affected. To keep them for later, go back to the sale and
              use Hold Sale instead.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setCancelOpen(false)} className="flex-1">
                Keep sale
              </Button>
              <Button
                icon={Trash2}
                onClick={handleCancelSale}
                className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                Cancel sale
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}
