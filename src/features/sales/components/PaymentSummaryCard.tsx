import { PaymentDonut } from '@/components/common/PaymentDonut'
import { PaymentSwatch } from '@/components/common/StatusPills'
import { SectionCard } from '@/components/common/SectionCard'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { reportsHref } from '@/features/reports/lib/reportRange'
import { PAYMENT_LABELS } from '@/domain/sale'
import type { PaymentSlice } from '@/features/sales/lib/salesMetrics'
import { formatCurrency } from '@/lib/format'

type PaymentSummaryCardProps = {
  slices: PaymentSlice[]
  total: number
}

export function PaymentSummaryCard({ slices, total }: PaymentSummaryCardProps) {
  return (
    <SectionCard
      title="Payment Summary (Today)"
      className="min-w-0"
      action={
        <ViewAllLink to={reportsHref({ section: 'payment-breakdown' })} label="View Details" />
      }
    >
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No payments taken yet today.</p>
      ) : (
        // Side by side only where the card is wide (full width below xl); in the
        // narrow xl side column the legend sits under the ring.
        <div className="flex flex-col items-center gap-6 sm:flex-row xl:flex-col">
          <PaymentDonut slices={slices} total={total} label="Payments today" />

          <ul className="w-full min-w-0 flex-1 space-y-3">
            {slices.map((slice) => (
              // The figures wrap under the name rather than run past the card,
              // and money is never cut short.
              <li
                key={slice.method}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm"
              >
                <PaymentSwatch method={slice.method} />
                <span className="min-w-[4.5rem] flex-1 text-navy-900">
                  {PAYMENT_LABELS[slice.method]}
                </span>
                <span className="ml-auto flex items-baseline gap-2 tabular-nums">
                  <span className="font-semibold text-navy-900">
                    {formatCurrency(slice.amount)}
                  </span>
                  <span className="w-12 text-right text-muted">
                    {(slice.share * 100).toFixed(1)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}
