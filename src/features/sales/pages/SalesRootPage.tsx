import { BarChart3, PauseCircle, Plus, Receipt, Users, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { SectionCard } from '@/components/common/SectionCard'
import { StatCard } from '@/components/common/StatCard'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import { reportsHref } from '@/features/reports/lib/reportRange'
import { PaymentSummaryCard } from '@/features/sales/components/PaymentSummaryCard'
import { RecentSalesPanel } from '@/features/sales/components/RecentSalesPanel'
import { computeSalesMetrics } from '@/features/sales/lib/salesMetrics'
import { useShopStore } from '@/stores/useShopStore'
import { formatCurrency, formatNumber } from '@/lib/format'

export function SalesRootPage() {
  const navigate = useNavigate()
  const sales = useShopStore((state) => state.sales)
  const heldCarts = useShopStore((state) => state.heldCarts)
  const resumeHeldCart = useShopStore((state) => state.resumeHeldCart)
  const [notice, setNotice] = useState<string | null>(null)

  const metrics = computeSalesMetrics(sales, new Date())

  function handleResume() {
    const result = resumeHeldCart()

    if (!result.ok) {
      setNotice(result.message)

      return
    }

    navigate(ROUTES.newSale)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          icon={Plus}
          variant="primary"
          to={ROUTES.newSale}
          className="h-14 flex-1 text-base sm:flex-none sm:px-10"
        >
          New Sale
        </Button>

        <Button icon={PauseCircle} onClick={handleResume} className="relative h-14">
          Hold Sale
          {heldCarts.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
              {heldCarts.length}
            </span>
          ) : null}
        </Button>
      </div>

      {notice ? <Alert tone="info">{notice}</Alert> : null}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={formatNumber(metrics.transactionCount)}
          icon={BarChart3}
          tone="blue"
          iconShape="circle"
          footer={<span className="text-muted">transactions</span>}
          action={{ to: reportsHref({ range: { preset: 'today' }, section: 'daily-sales' }), label: 'View Report' }}
        />
        <StatCard
          label="Total Sales"
          value={formatCurrency(metrics.totalSales)}
          icon={Wallet}
          tone="green"
          iconShape="circle"
          footer={<span className="text-muted">total amount</span>}
          action={{ to: reportsHref({ range: { preset: 'today' }, section: 'daily-sales' }), label: 'View Report' }}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(metrics.outstanding)}
          icon={Receipt}
          tone="orange"
          iconShape="circle"
          footer={
            <span className="text-muted">
              from {formatNumber(metrics.outstandingCount)} transactions
            </span>
          }
          action={{ to: ROUTES.customers, label: 'View Details' }}
        />
        <StatCard
          label="Customers Served"
          value={formatNumber(metrics.customersServed)}
          icon={Users}
          tone="indigo"
          iconShape="circle"
          footer={<span className="text-muted">today</span>}
          action={{ to: ROUTES.customers, label: 'View Customers' }}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentSalesPanel sales={sales} />
        </div>

        <div className="flex flex-col gap-5">
          <PaymentSummaryCard slices={metrics.paymentSlices} total={metrics.paymentTotal} />

          <SectionCard
            title="Top Selling Products (Today)"
            action={<ViewAllLink to={reportsHref({ section: 'top-products' })} />}
          >
            {metrics.topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nothing sold yet today.</p>
            ) : (
              <ol className="space-y-3">
                {metrics.topProducts.map((product, index) => (
                  <li key={product.productId} className="flex items-center gap-3 text-sm">
                    <span className="w-4 shrink-0 text-muted">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-navy-900">{product.name}</span>
                    <span className="shrink-0 text-muted">
                      {formatNumber(product.quantity)} {product.unit}
                    </span>
                    <span className="w-24 shrink-0 text-right font-semibold text-navy-900">
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
        Tip: tap <strong>New Sale</strong> to start a transaction, or search above to find an
        earlier one.
      </Alert>
    </div>
  )
}
