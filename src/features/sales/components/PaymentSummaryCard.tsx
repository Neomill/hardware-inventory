import { SectionCard } from '@/components/common/SectionCard'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { reportsHref } from '@/features/reports/lib/reportRange'
import { PAYMENT_LABELS } from '@/domain/sale'
import type { PaymentMethod } from '@/domain/types'
import type { PaymentSlice } from '@/features/sales/lib/salesMetrics'
import { formatCurrency } from '@/lib/format'

/**
 * Palette validated for light mode: lightness band, chroma floor,
 * normal-vision separation and contrast all pass. Orange against green sits in
 * the 6-8 deutan band, which is permitted only with secondary encoding -- every
 * slice is named in the legend and separated by a surface-coloured gap.
 */
const SLICE_COLORS: Record<PaymentMethod, string> = {
  cash: '#16A34A',
  partial: '#EA580C',
  credit: '#7C3AED',
}

const RADIUS = 56
const STROKE = 18
const GAP = 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type PaymentSummaryCardProps = {
  slices: PaymentSlice[]
  total: number
}

export function PaymentSummaryCard({ slices, total }: PaymentSummaryCardProps) {
  const drawn = slices.filter((slice) => slice.amount > 0)
  let offset = 0

  return (
    <SectionCard
      title="Payment Summary (Today)"
      action={<ViewAllLink to={reportsHref({ section: 'payment-breakdown' })} label="View Details" />}
    >
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No payments taken yet today.</p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative shrink-0">
            <svg
              viewBox="0 0 140 140"
              className="h-36 w-36 -rotate-90"
              role="img"
              aria-label={`Payments today total ${formatCurrency(total)}`}
            >
              {drawn.map((slice) => {
                const length = Math.max(slice.share * CIRCUMFERENCE - GAP, 0)
                const dash = `${length} ${CIRCUMFERENCE - length}`
                const element = (
                  <circle
                    key={slice.method}
                    cx="70"
                    cy="70"
                    r={RADIUS}
                    fill="none"
                    stroke={SLICE_COLORS[slice.method]}
                    strokeWidth={STROKE}
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                )

                offset += slice.share * CIRCUMFERENCE

                return element
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted">Total</span>
              <span className="text-base font-bold text-navy-900">{formatCurrency(total)}</span>
            </div>
          </div>

          <ul className="w-full flex-1 space-y-3">
            {slices.map((slice) => (
              <li key={slice.method} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SLICE_COLORS[slice.method] }}
                />
                <span className="flex-1 text-navy-900">{PAYMENT_LABELS[slice.method]}</span>
                <span className="font-semibold text-navy-900">
                  {formatCurrency(slice.amount)}
                </span>
                <span className="w-12 text-right text-muted">
                  {(slice.share * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}
