import { Calculator, HandCoins, Receipt, ReceiptText, Wallet, type LucideIcon } from 'lucide-react'

import { Pagination } from '@/components/common/Pagination'
import { SectionCard } from '@/components/common/SectionCard'
import { StatCard } from '@/components/common/StatCard'
import type { IconTone } from '@/components/common/IconTile'
import type { DailySales, SalesSummary } from '@/domain/reports'
import { DailySalesChart } from '@/features/reports/components/DailySalesChart'
import { ReportSection } from '@/features/reports/components/ReportSection'
import { formatDayWithWeekday } from '@/features/reports/lib/reportFormat'
import type { ResolvedRange } from '@/features/reports/lib/reportRange'
import type { ChartScale } from '@/features/reports/lib/reportViewModel'
import { usePagedList } from '@/hooks/usePagedList'
import { formatCurrency, formatNumber } from '@/lib/format'

/** Days per table page; a week and a weekend fit, and a year is 25 pages. */
export const DAILY_TABLE_PAGE_SIZE = 15

type DailySalesSectionProps = {
  summary: SalesSummary
  days: DailySales[]
  scale: ChartScale
  range: ResolvedRange
}

type Tile = {
  label: string
  value: string
  icon: LucideIcon
  tone: IconTone
  footer: string
}

export function DailySalesSection({ summary, days, scale, range }: DailySalesSectionProps) {
  const tiles: Tile[] = [
    {
      label: 'Total Sales',
      value: formatCurrency(summary.totalSales),
      icon: Wallet,
      tone: 'green',
      footer:
        summary.discounts > 0
          ? `after ${formatCurrency(summary.discounts)} in discounts`
          : 'VAT included',
    },
    {
      label: 'Transactions',
      value: formatNumber(summary.transactionCount),
      icon: Receipt,
      tone: 'blue',
      footer: `${formatNumber(summary.itemCount)} ${summary.itemCount === 1 ? 'item' : 'items'} sold`,
    },
    {
      label: 'Average Sale',
      value: formatCurrency(summary.averageSale),
      icon: Calculator,
      tone: 'indigo',
      footer: 'per transaction',
    },
    {
      label: 'VAT Included',
      value: formatCurrency(summary.vat),
      icon: ReceiptText,
      tone: 'amber',
      footer: `${formatCurrency(summary.netOfVat)} net of VAT`,
    },
    {
      label: 'Collected',
      value: formatCurrency(summary.collected),
      icon: HandCoins,
      tone: 'green',
      footer: 'cash and down payments',
    },
    {
      label: 'Credit Extended',
      value: formatCurrency(summary.creditExtended),
      icon: Wallet,
      tone: 'orange',
      footer: 'left owing on these sales',
    },
  ]

  return (
    <ReportSection
      id="daily-sales"
      title="Daily Sales Report"
      description={`Completed sales for ${range.phrase}. Prices include VAT; the VAT figure is for reference only.`}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <StatCard
            key={tile.label}
            label={tile.label}
            value={tile.value}
            icon={tile.icon}
            tone={tile.tone}
            iconShape="circle"
            footer={<span className="text-muted">{tile.footer}</span>}
          />
        ))}
      </div>

      <CollectedSplit collected={summary.collected} credit={summary.creditExtended} />

      <SectionCard title="Sales per Day">
        <DailySalesChart days={days} scale={scale} rangeLabel={range.label} />
      </SectionCard>

      {/* Keyed by range so a new period starts on page one. */}
      <DailyTable key={`${range.from}:${range.to}`} days={days} summary={summary} />
    </ReportSection>
  )
}

/**
 * Collected against credit extended as one bar. Both halves are named with
 * their amount and share beside the bar, and the credit half is hatched, so
 * the split reads without telling the colours apart.
 */
function CollectedSplit({ collected, credit }: { collected: number; credit: number }) {
  const total = collected + credit

  if (total === 0) {
    return null
  }

  const collectedPercent = Math.round((collected / total) * 100)

  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="card-title">Collected vs Credit Extended</span>
        <span className="text-muted">of {formatCurrency(total)} sold</span>
      </div>

      <svg
        viewBox="0 0 100 4"
        preserveAspectRatio="none"
        className="h-4 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`${collectedPercent}% collected (${formatCurrency(collected)}), ${100 - collectedPercent}% on credit (${formatCurrency(credit)})`}
      >
        <defs>
          <pattern
            id="credit-hatch"
            width="1.5"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="1.5" height="4" fill="#EA580C" />
            <rect width="0.5" height="4" fill="#FFFFFF" fillOpacity="0.55" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={(collected / total) * 100} height="4" fill="#16A34A" />
        <rect
          x={(collected / total) * 100}
          y="0"
          width={(credit / total) * 100}
          height="4"
          fill="url(#credit-hatch)"
        />
      </svg>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm bg-[#16A34A]" />
          <dt className="text-navy-900">Collected</dt>
          <dd className="ml-auto font-semibold tabular-nums text-navy-900 sm:ml-2">
            {formatCurrency(collected)}{' '}
            <span className="font-normal text-muted">({collectedPercent}%)</span>
          </dd>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 rounded-sm"
            style={{
              background:
                'repeating-linear-gradient(45deg, #EA580C 0 3px, rgba(255,255,255,0.55) 3px 4px)',
            }}
          />
          <dt className="text-navy-900">Credit extended</dt>
          <dd className="ml-auto font-semibold tabular-nums text-navy-900 sm:ml-2">
            {formatCurrency(credit)}{' '}
            <span className="font-normal text-muted">({100 - collectedPercent}%)</span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

const HEADER_CELL =
  'whitespace-nowrap pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted'
const NUMBER_CELL = 'whitespace-nowrap py-3 pr-4 text-right tabular-nums'

function DailyTable({ days, summary }: { days: DailySales[]; summary: SalesSummary }) {
  const list = usePagedList(days, DAILY_TABLE_PAGE_SIZE)
  const paged = list.pageCount > 1

  return (
    <SectionCard title="Daily Breakdown">
      {days.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No days in this period.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <DailyTableBody days={list.rows} dayCount={days.length} summary={summary} paged={paged} />
          {paged ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted">Days {list.rangeLabel}</span>
              <Pagination
                page={list.page}
                pageCount={list.pageCount}
                onChange={list.setPage}
                label="Daily breakdown pages"
              />
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  )
}

function DailyTableBody({
  days,
  dayCount,
  summary,
  paged,
}: {
  days: DailySales[]
  dayCount: number
  summary: SalesSummary
  paged: boolean
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
        <caption className="sr-only">Sales per day with totals</caption>
        <thead>
          <tr>
            <th scope="col" className={HEADER_CELL}>
              Day
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Transactions
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Items
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Total Sales
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              VAT Included
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Collected
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Credit
            </th>
          </tr>
        </thead>

        <tbody>
          {days.map((day) => {
            const empty = day.transactionCount === 0

            return (
              <tr
                key={day.day}
                className={
                  empty
                    ? 'border-t border-slate-100 text-muted'
                    : 'border-t border-slate-100 text-navy-900'
                }
              >
                <th scope="row" className="whitespace-nowrap py-3 pr-4 font-medium">
                  {formatDayWithWeekday(day.date)}
                </th>
                <td className={NUMBER_CELL}>{formatNumber(day.transactionCount)}</td>
                <td className={NUMBER_CELL}>{formatNumber(day.itemCount)}</td>
                <td className={`${NUMBER_CELL} font-semibold`}>{formatCurrency(day.totalSales)}</td>
                <td className={NUMBER_CELL}>{formatCurrency(day.vat)}</td>
                <td className={NUMBER_CELL}>{formatCurrency(day.collected)}</td>
                <td className={NUMBER_CELL}>{formatCurrency(day.creditExtended)}</td>
              </tr>
            )
          })}
        </tbody>

        {dayCount > 1 ? (
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-semibold text-navy-900">
              <th scope="row" className="py-3 pr-4">
                {paged ? (
                  <>
                    Total{' '}
                    <span className="font-normal text-muted">
                      (all {formatNumber(dayCount)} days)
                    </span>
                  </>
                ) : (
                  'Total'
                )}
              </th>
              <td className={NUMBER_CELL}>{formatNumber(summary.transactionCount)}</td>
              <td className={NUMBER_CELL}>{formatNumber(summary.itemCount)}</td>
              <td className={NUMBER_CELL}>{formatCurrency(summary.totalSales)}</td>
              <td className={NUMBER_CELL}>{formatCurrency(summary.vat)}</td>
              <td className={NUMBER_CELL}>{formatCurrency(summary.collected)}</td>
              <td className={NUMBER_CELL}>{formatCurrency(summary.creditExtended)}</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}
