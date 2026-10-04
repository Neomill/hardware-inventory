import { PaymentDonut } from '@/components/common/PaymentDonut'
import { SectionCard } from '@/components/common/SectionCard'
import { PaymentSwatch } from '@/components/common/StatusPills'
import type { PaymentBreakdownRow } from '@/domain/reports'
import { ReportSection } from '@/features/reports/components/ReportSection'
import type { ResolvedRange } from '@/features/reports/lib/reportRange'
import { formatCurrency, formatNumber } from '@/lib/format'

type PaymentBreakdownSectionProps = {
  rows: PaymentBreakdownRow[]
  total: number
  range: ResolvedRange
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
            <PaymentDonut
              slices={rows.map((row) => ({
                method: row.method,
                amount: row.total,
                share: row.share,
              }))}
              total={total}
              label={`Payment methods, ${range.label}`}
              size="lg"
            />

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
                          <PaymentSwatch method={row.method} />
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
