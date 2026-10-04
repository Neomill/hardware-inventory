import { ClipboardList, Package, Tag, Wallet } from 'lucide-react'

import { KpiCard } from '@/features/dashboard/components/KpiCard'
import { LowStockCard } from '@/features/dashboard/components/LowStockCard'
import { QuickActions } from '@/features/dashboard/components/QuickActions'
import { RecentMovementsCard } from '@/features/dashboard/components/RecentMovementsCard'
import { RecentSalesCard } from '@/features/dashboard/components/RecentSalesCard'
import { TrendIndicator } from '@/features/dashboard/components/TrendIndicator'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { formatCurrency, formatNumber } from '@/lib/format'

/*
 * Every grid declares grid-cols-1 (minmax(0, 1fr)) so a wide table scrolls
 * inside its card instead of stretching the column past the screen. The two
 * tables sit side by side only from 2xl, where both fit without scrolling.
 */
export function DashboardPage() {
  const { kpis, recentSales, lowStockItems, recentMovements } = useDashboardData()

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today's Sales"
          value={formatCurrency(kpis.todaysSales)}
          icon={ClipboardList}
          tone="blue"
          footer={
            <>
              <span className="text-muted">vs Yesterday</span>
              {kpis.todaysSalesChange === null ? (
                <span className="text-muted">--</span>
              ) : (
                <TrendIndicator changePercent={kpis.todaysSalesChange} higherIsBetter />
              )}
            </>
          }
        />

        <KpiCard
          label="Outstanding Credit"
          value={formatCurrency(kpis.outstandingCredit)}
          icon={Wallet}
          tone="orange"
          footer={
            <>
              <span className="text-muted">vs Yesterday</span>
              {kpis.outstandingCreditChange === null ? (
                <span className="text-muted">--</span>
              ) : (
                <TrendIndicator
                  changePercent={kpis.outstandingCreditChange}
                  higherIsBetter={false}
                />
              )}
            </>
          }
        />

        <KpiCard
          label="Low Stock Items"
          value={formatNumber(kpis.lowStockCount)}
          icon={Package}
          tone="amber"
          footer={<span className="text-muted">Items need restocking</span>}
        />

        <KpiCard
          label="Total Products"
          value={formatNumber(kpis.totalActiveProducts)}
          icon={Tag}
          tone="indigo"
          footer={<span className="text-muted">Active products</span>}
        />
      </section>

      <QuickActions />

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        <RecentSalesCard sales={recentSales} />
        <LowStockCard items={lowStockItems} />
      </div>

      <RecentMovementsCard movements={recentMovements} />
    </div>
  )
}
