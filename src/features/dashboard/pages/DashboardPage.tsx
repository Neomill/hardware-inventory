import { ClipboardList, Package, Tag, Wallet } from 'lucide-react'

import { StatCard } from '@/components/common/StatCard'
import { LowStockCard } from '@/features/dashboard/components/LowStockCard'
import { NoteCard } from '@/features/dashboard/components/NoteCard'
import { QuickActions } from '@/features/dashboard/components/QuickActions'
import { RecentMovementsCard } from '@/features/dashboard/components/RecentMovementsCard'
import { RecentSalesCard } from '@/features/dashboard/components/RecentSalesCard'
import { TrendIndicator } from '@/features/dashboard/components/TrendIndicator'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { formatCurrency, formatNumber } from '@/lib/format'

export function DashboardPage() {
  const { kpis, recentSales, lowStockItems, recentMovements, note } = useDashboardData()

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
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

        <StatCard
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

        <StatCard
          label="Low Stock Items"
          value={formatNumber(kpis.lowStockCount)}
          icon={Package}
          tone="amber"
          footer={<span className="text-muted">Items need restocking</span>}
        />

        <StatCard
          label="Total Products"
          value={formatNumber(kpis.totalActiveProducts)}
          icon={Tag}
          tone="indigo"
          footer={<span className="text-muted">Active products</span>}
        />
      </section>

      <QuickActions />

      <div className="grid gap-5 xl:grid-cols-2">
        <RecentSalesCard sales={recentSales} />
        <LowStockCard items={lowStockItems} />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-9">
          <RecentMovementsCard movements={recentMovements} />
        </div>

        {note ? (
          <div className="xl:col-span-3">
            <NoteCard note={note} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
