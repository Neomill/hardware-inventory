import { useId } from 'react'

import { SectionCard } from '@/components/common/SectionCard'
import type { PaymentBreakdownRow } from '@/domain/reports'
import type { PaymentMethod } from '@/domain/types'
import { ReportSection } from '@/features/reports/components/ReportSection'
import type { ResolvedRange } from '@/features/reports/lib/reportRange'
import { formatCurrency, formatNumber } from '@/lib/format'

/**
 * The palette the Sales root's Payment Summary donut uses, so a method keeps
 * its colour across screens. Orange against green is close for deuteranopes,
 * so every slice is also named in the legend and table, a surface-coloured
 * gap separates slices, and the legend swatches carry distinct shapes.
 */
const SLICE_COLORS: Record<PaymentMethod, string> = {
  cash: '#16A34A',
  partial: '#EA580C',
  credit: '#7C3AED',
}

const SWATCH_SHAPES: Record<PaymentMethod, string> = {
  cash: 'rounded-full',
  partial: 'rounded-sm',
  credit: 'rotate-45 rounded-[1px]',
}

const RADIUS = 56
const STROKE = 18
const GAP = 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type PaymentBreakdownSectionProps = {
  rows: PaymentBreakdownRow[]
  total: number
  range: ResolvedRange
}

function Swatch({ method }: { method: PaymentMethod }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2.5 w-2.5 shrink-0 ${SWATCH_SHAPES[method]}`}
      style={{ backgroundColor: SLICE_COLORS[method] }}
    />
  )
}

function Donut({ rows, total, rangeLabel }: { rows: PaymentBreakdownRow[]; total: number; rangeLabel: string }) {
  const titleId = useId()
  const drawn = rows.filter((row) => row.total > 0)
  // A single method fills the ring; a gap would leave a pointless notch.
  const gap = drawn.length > 1 ? GAP : 0
  let offset = 0

  return (
    <div className="relative shrink-0">
      <svg viewBox="0 0 140 140" className="h-44 w-44 -rotate-90" role="img" aria-labelledby={titleId}>
        <title id={titleId}>
          {`Payment methods, ${rangeLabel}: `}
          {rows.map((row) => `${row.label} ${row.percent}% (${formatCurrency(row.total)})`).join(', ')}
        </title>
        <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#F1F5F9" strokeWidth={STROKE} />
        {drawn.map((row) => {
          const length = Math.max(row.share * CIRCUMFERENCE - gap, 0)
          const element = (
            <circle
              key={row.method}
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke={SLICE_COLORS[row.method]}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-offset}
            />
          )

          offset += row.share * CIRCUMFERENCE

          return element
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-xs text-muted">Total</span>
        <span className="text-base font-bold tabular-nums text-navy-900">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

export function PaymentBreakdownSection({ rows, total, range }: PaymentBreakdownSectionProps) {
  const saleCount = rows.reduce((sum, row) => sum + row.saleCount, 0)

  return (
    <ReportSection
      id="payment-breakdown"
      title="Payment Breakdown"
      description={`How completed sales were paid for ${range.phrase}, by sale total.`}
    >
      <SectionCard title="By Payment Method">
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No sales in this period.</p>
        ) : (
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
            <Donut rows={rows} total={total} rangeLabel={range.label} />

            <div className="-mx-5 w-full flex-1 overflow-x-auto px-5">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <caption className="sr-only">Sales by payment method</caption>
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-muted">
                    <th scope="col" className="pb-3 pr-4">
                      Method
                    </th>
                    <th scope="col" className="pb-3 pr-4 text-right">
                      Sales
                    </th>
                    <th scope="col" className="pb-3 pr-4 text-right">
                      Amount
                    </th>
                    <th scope="col" className="pb-3 text-right">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.method} className="border-t border-slate-100 text-navy-900">
                      <th scope="row" className="py-3 pr-4 font-medium">
                        <span className="flex items-center gap-3">
                          <Swatch method={row.method} />
                          {row.label}
                        </span>
                      </th>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {formatNumber(row.saleCount)}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted">{row.percent}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-semibold text-navy-900">
                    <th scope="row" className="py-3 pr-4">
                      Total
                    </th>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatNumber(saleCount)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatCurrency(total)}</td>
                    <td className="py-3 text-right tabular-nums text-muted">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      {total > 0 ? (
        <p className="text-xs text-muted">
          Partial and credit amounts are full sale totals. What was actually paid at the counter is
          under Collected in the Daily Sales Report.
        </p>
      ) : null}
    </ReportSection>
  )
}
