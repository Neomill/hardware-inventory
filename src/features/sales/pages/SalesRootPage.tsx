import { useEffect, useMemo, useState } from 'react'
import { BarChart3, PauseCircle, Plus, Receipt, Users, Wallet } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { SectionCard } from '@/components/common/SectionCard'
import { StatCard } from '@/components/common/StatCard'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import { remainingBySale } from '@/domain/ledger'
import { reportsHref } from '@/features/reports/lib/reportRange'
import { HeldSalesDialog } from '@/features/sales/components/HeldSalesDialog'
import { PaymentSummaryCard } from '@/features/sales/components/PaymentSummaryCard'
import { RecentSalesPanel } from '@/features/sales/components/RecentSalesPanel'
import {
  heldSalesButtonName,
  readSalesRootNotice,
  type CartNotice,
  type PosNavState,
} from '@/features/sales/lib/heldSales'
import { computeSalesMetrics } from '@/features/sales/lib/salesMetrics'
import { useShopStore } from '@/stores/useShopStore'
import { formatCurrency, formatNumber } from '@/lib/format'

export function SalesRootPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const sales = useShopStore((state) => state.sales)
  const payments = useShopStore((state) => state.payments)
  const heldCount = useShopStore((state) => state.heldSales.length)

  const [isHeldOpen, setHeldOpen] = useState(false)
  // "Sale held." arrives through router state from the POS page.
  const [notice, setNotice] = useState<string | null>(() => readSalesRootNotice(location.state))

  useEffect(() => {
    if (location.state !== null && location.state !== undefined) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const metrics = useMemo(() => computeSalesMetrics(sales, new Date(), payments), [sales, payments])
  const remaining = useMemo(() => remainingBySale(sales, payments), [sales, payments])

  function handleResumed(cartNotice: CartNotice | null) {
    setHeldOpen(false)
    const state: PosNavState | null = cartNotice ? { cartNotice } : null
    navigate(ROUTES.newSale, { state })
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          icon={Plus}
          variant="primary"
          to={ROUTES.newSale}
          className="h-14 flex-1 text-base sm:flex-none sm:px-10"
        >
          New Sale
        </Button>

        {/* Always shown and enabled, so its place never moves; at zero it opens the empty list. */}
        <Button
          icon={PauseCircle}
          onClick={() => {
            setNotice(null)
            setHeldOpen(true)
          }}
          aria-label={heldSalesButtonName(heldCount)}
          className="relative h-14"
        >
          Held Sales
          {heldCount > 0 ? (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white"
            >
              {heldCount}
            </span>
          ) : null}
        </Button>
      </div>

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={formatNumber(metrics.transactionCount)}
          icon={BarChart3}
          tone="blue"
          iconShape="circle"
          footer={<span className="text-muted">transactions</span>}
          action={{
            to: reportsHref({ range: { preset: 'today' }, section: 'daily-sales' }),
            label: 'View Report',
          }}
        />
        <StatCard
          label="Total Sales"
          value={formatCurrency(metrics.totalSales)}
          icon={Wallet}
          tone="green"
          iconShape="circle"
          footer={<span className="text-muted">total amount</span>}
          action={{
            to: reportsHref({ range: { preset: 'today' }, section: 'daily-sales' }),
            label: 'View Report',
          }}
        />
        {/* Still unpaid now on today's sales, after customer payments: the same
            allocation as the Ledger, so the two never disagree. */}
        <StatCard
          label="Outstanding from today's sales"
          value={formatCurrency(metrics.outstanding)}
          icon={Receipt}
          tone="orange"
          iconShape="circle"
          footer={
            <span className="text-muted">
              unpaid now on {formatNumber(metrics.outstandingCount)}{' '}
              {metrics.outstandingCount === 1 ? 'sale' : 'sales'}
            </span>
          }
          action={{ to: ROUTES.customers, label: 'View Ledger' }}
        />
        <StatCard
          label="Customers Served"
          value={formatNumber(metrics.customersServed)}
          icon={Users}
          tone="indigo"
          iconShape="circle"
          footer={<span className="text-muted">today, each walk-in sale counted once</span>}
          action={{ to: ROUTES.customers, label: 'View Customers' }}
        />
      </section>

      {/* grid-cols-1 (minmax(0, 1fr)) and min-w-0 keep the wide sales table
          scrolling inside its card instead of widening the page. The side
          column sits below the table until xl. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RecentSalesPanel sales={sales} remaining={remaining} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <PaymentSummaryCard slices={metrics.paymentSlices} total={metrics.paymentTotal} />

          <SectionCard
            title="Top Selling Products (Today)"
            className="min-w-0"
            action={<ViewAllLink to={reportsHref({ section: 'top-products' })} />}
          >
            {metrics.topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nothing sold yet today.</p>
            ) : (
              <ol className="space-y-3">
                {metrics.topProducts.map((product, index) => (
                  <li key={product.productId} className="flex items-center gap-3 text-sm">
                    <span className="w-4 shrink-0 text-muted">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-navy-900" title={product.name}>
                      {product.name}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-muted">
                      {formatNumber(product.quantity)} {product.unit}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-right font-semibold tabular-nums text-navy-900">
                      {formatCurrency(product.amount)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>
      </div>

      <Alert tone="info">
        Tip: tap <strong>New Sale</strong> to start a transaction, or search Recent Sales to find an
        earlier one.
      </Alert>

      {isHeldOpen ? (
        <HeldSalesDialog onClose={() => setHeldOpen(false)} onResumed={handleResumed} />
      ) : null}
    </div>
  )
}
