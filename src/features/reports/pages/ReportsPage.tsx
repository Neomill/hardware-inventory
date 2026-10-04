import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { DailySalesSection } from '@/features/reports/components/DailySalesSection'
import { OutstandingCreditSection } from '@/features/reports/components/OutstandingCreditSection'
import { PaymentBreakdownSection } from '@/features/reports/components/PaymentBreakdownSection'
import { RangeSelector } from '@/features/reports/components/RangeSelector'
import { TopProductsSection } from '@/features/reports/components/TopProductsSection'
import {
  REPORT_SECTIONS,
  parseRangeParams,
  parseSectionParam,
  parseTopMetricParam,
  resolveRange,
  writeRangeParams,
  type ReportRangeSelection,
  type ReportSectionId,
  type TopProductsMetric,
} from '@/features/reports/lib/reportRange'
import { buildReportViewModel } from '@/features/reports/lib/reportViewModel'
import { useShopStore } from '@/stores/useShopStore'

function scrollToSection(id: ReportSectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Reports (Phase 9, D4). The period, the top-products ranking and the section
 * to open on all live in the query string, so other screens can deep-link with
 * reportsHref() and a refresh keeps the view.
 */
export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sales = useShopStore((state) => state.sales)
  const payments = useShopStore((state) => state.payments)
  const customers = useShopStore((state) => state.customers)

  // Fixed for the visit, so "today" does not shift under the user mid-read.
  const [now] = useState(() => new Date())

  const selection = parseRangeParams(searchParams)
  const resolved = resolveRange(selection, now)
  const topMetric = parseTopMetricParam(searchParams)
  const section = parseSectionParam(searchParams)

  const view = useMemo(
    () =>
      buildReportViewModel({ sales, payments, customers, range: resolved.range, topMetric }),
    // resolved.range is rebuilt each render; its day keys identify it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sales, payments, customers, resolved.from, resolved.to, topMetric],
  )

  useEffect(() => {
    if (section) {
      scrollToSection(section)
    }
  }, [section])

  function handleRangeChange(next: ReportRangeSelection) {
    setSearchParams((current) => writeRangeParams(current, next), { replace: true })
  }

  function handleMetricChange(metric: TopProductsMetric) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('top', metric)

        return next
      },
      { replace: true },
    )
  }

  function handleJump(id: ReportSectionId) {
    scrollToSection(id)
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('section', id)

        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="card flex flex-col gap-4 p-5" aria-label="Report period">
        <div>
          <p className="card-title">Report Period</p>
          <p className="text-sm text-muted">
            Showing <span className="font-semibold text-navy-900">{resolved.label}</span>
            {resolved.dayCount > 1 ? ` (${resolved.dayCount} days)` : null}. Every figure is
            computed from recorded transactions.
          </p>
        </div>

        <RangeSelector resolved={resolved} now={now} onChange={handleRangeChange} />

        <nav aria-label="Report sections" className="-mx-1 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {REPORT_SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleJump(item.id)}
              aria-current={section === item.id ? 'location' : undefined}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-navy-700 transition-colors hover:bg-navy-50 aria-[current=location]:border-navy-300 aria-[current=location]:bg-navy-50"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </section>

      <DailySalesSection
        summary={view.summary}
        days={view.daily}
        scale={view.dailyScale}
        range={resolved}
      />

      <TopProductsSection
        rows={view.topProducts}
        metric={topMetric}
        onMetricChange={handleMetricChange}
        range={resolved}
      />

      <PaymentBreakdownSection rows={view.paymentRows} total={view.paymentTotal} range={resolved} />

      <OutstandingCreditSection credit={view.credit} range={resolved} />
    </div>
  )
}
