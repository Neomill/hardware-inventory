import { useId } from 'react'

import { PAYMENT_METHOD_COLORS } from '@/components/common/statusTones'
import { PAYMENT_LABELS } from '@/domain/sale'
import type { Centavos } from '@/domain/money'
import type { PaymentMethod } from '@/domain/types'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

export type PaymentDonutSlice = {
  method: PaymentMethod
  amount: Centavos
  /** Fraction of the total, 0 to 1. */
  share: number
}

type PaymentDonutProps = {
  slices: PaymentDonutSlice[]
  total: Centavos
  /** Opens the accessible description, e.g. "Payments today" or "Payment methods, May 2025". */
  label: string
  size?: 'md' | 'lg'
  className?: string
}

const RADIUS = 56
const STROKE = 18
const GAP = 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const SIZE_STYLES = { md: 'h-36 w-36', lg: 'h-44 w-44' } as const

/**
 * Payment-method ring with the total in the middle. Colours come from
 * PAYMENT_METHOD_COLORS, the same map as PaymentMethodPill and PaymentSwatch.
 * The chart is one image whose text alternative names every slice; pair it
 * with a legend or table using PaymentSwatch, since colour alone is not enough.
 */
export function PaymentDonut({ slices, total, label, size = 'md', className }: PaymentDonutProps) {
  const titleId = useId()
  const drawn = slices.filter((slice) => slice.amount > 0 && slice.share > 0)
  // A single method fills the ring; a gap would leave a pointless notch.
  const gap = drawn.length > 1 ? GAP : 0
  let offset = 0

  const description = `${label}: total ${formatCurrency(total)}. ${slices
    .map(
      (slice) =>
        `${PAYMENT_LABELS[slice.method]} ${Math.round(slice.share * 100)}% (${formatCurrency(slice.amount)})`,
    )
    .join(', ')}`

  return (
    <div className={cn('relative shrink-0', className)}>
      <svg
        viewBox="0 0 140 140"
        className={cn('-rotate-90', SIZE_STYLES[size])}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{description}</title>
        <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#F1F5F9" strokeWidth={STROKE} />
        {drawn.map((slice) => {
          const length = Math.max(slice.share * CIRCUMFERENCE - gap, 0)
          const element = (
            <circle
              key={slice.method}
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke={PAYMENT_METHOD_COLORS[slice.method].slice}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-offset}
            />
          )

          offset += slice.share * CIRCUMFERENCE

          return element
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-xs text-muted">Total</span>
        <span className="text-base font-bold tabular-nums text-navy-900">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  )
}
