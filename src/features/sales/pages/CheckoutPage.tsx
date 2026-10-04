import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Banknote, Check, CreditCard, HandCoins, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { SelectField } from '@/components/common/SelectField'
import { ROUTES } from '@/app/routes'
import { parseAmountInput, type Centavos } from '@/domain/money'
import { computeBalanceDue, computeChange, validatePayment } from '@/domain/sale'
import type { PaymentMethod } from '@/domain/types'
import { CartTotals } from '@/features/sales/components/CartTotals'
import { useCart } from '@/features/sales/hooks/useCart'
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

  const { entries, totals, taxRate, isEmpty } = useCart()

  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [customerId, setCustomerId] = useState<string>(WALK_IN)
  const [tendered, setTendered] = useState('')
  const [error, setError] = useState<string | null>(null)

  // An empty cart has nothing to check out; go back rather than show a blank form.
  useEffect(() => {
    if (isEmpty) {
      navigate(ROUTES.newSale, { replace: true })
    }
  }, [isEmpty, navigate])

  const resolvedCustomerId = customerId === WALK_IN ? null : customerId

  const amountPaid: Centavos = useMemo(() => {
    if (method === 'credit') {
      return 0
    }

    return parseAmountInput(tendered) ?? 0
  }, [method, tendered])

  const change = computeChange(totals.total, amountPaid)
  const balanceDue = computeBalanceDue(method, totals.total, amountPaid)

  const validation = validatePayment({
    method,
    total: totals.total,
    amountPaid,
    customerId: resolvedCustomerId,
    lineCount: totals.lineCount,
  })

  function handleMethodChange(next: PaymentMethod) {
    setMethod(next)
    setError(null)

    // Cash defaults to the exact amount: the most common case becomes one tap.
    if (next === 'cash') {
      setTendered((totals.total / 100).toFixed(2))
    } else {
      setTendered('')
    }
  }

  function handleConfirm() {
    const result = recordSale({
      paymentMethod: method,
      amountPaid,
      customerId: resolvedCustomerId,
    })

    if (!result.ok) {
      setError(result.message)

      return
    }

    navigate(ROUTES.saleDetail(result.sale.id), { state: { completed: true } })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="card flex flex-col gap-4 p-5">
        <h2 className="text-base font-semibold text-navy-900">
          1. Sale Items ({totals.itemCount} items)
        </h2>

        <ul className="divide-y divide-slate-100">
          {entries.map(({ line, product }) => (
            <li key={line.productId} className="flex flex-wrap items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-navy-900">
                  {line.productName}
                </span>
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

              <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums text-navy-900">
                {formatCurrency(line.lineTotal)}
              </span>
            </li>
          ))}
        </ul>

        <CartTotals totals={totals} taxRate={taxRate} />
      </section>

      <div className="flex flex-col gap-5">
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

          {method !== 'cash' && !resolvedCustomerId ? (
            <Alert tone="error">
              Choose a customer. A balance cannot be recorded for a walk-in customer.
            </Alert>
          ) : null}
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-base font-semibold text-navy-900">3. Payment</h2>

          <div className="grid gap-3 sm:grid-cols-3">
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
                    'flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-colors',
                    isSelected
                      ? option.selected
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <Icon className="h-7 w-7 text-navy-800" aria-hidden />
                  <span className="text-sm font-semibold text-navy-900">{option.label}</span>
                  <span className="text-xs text-muted">{option.hint}</span>
                </button>
              )
            })}
          </div>

          {method === 'credit' ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4">
              <div className="flex items-center justify-between">
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
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-navy-900">
                  {method === 'cash' ? 'Cash received' : 'Amount paid now'}
                </span>
                <span className="relative flex items-center">
                  <span className="pointer-events-none absolute left-4 text-lg text-muted">
                    &#8369;
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tendered}
                    onChange={(event) => {
                      setTendered(event.target.value)
                      setError(null)
                    }}
                    placeholder="0.00"
                    className="h-16 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-right text-2xl font-bold tabular-nums text-navy-900"
                  />
                </span>
              </label>

              {method === 'cash' ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-4">
                  <div className="flex items-center justify-between">
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
                  <div className="flex items-center justify-between">
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
          {!error && !validation.ok && validation.message ? (
            <Alert tone="info">{validation.message}</Alert>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button icon={X} to={ROUTES.newSale} className="h-14 flex-1">
              Back to Sale
            </Button>
            <Button
              variant="primary"
              icon={Check}
              onClick={handleConfirm}
              disabled={!validation.ok}
              className="h-14 flex-1 text-base"
            >
              Confirm Sale
            </Button>
          </div>

          <Button icon={ArrowLeft} variant="ghost" to={ROUTES.sales} className="self-start">
            Cancel sale
          </Button>
        </section>
      </div>
    </div>
  )
}
