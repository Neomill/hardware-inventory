import { StatusPill } from '@/components/common/StatusPill'
import {
  MOVEMENT_TYPE_ICONS,
  MOVEMENT_TYPE_TONES,
  PAYMENT_METHOD_COLORS,
  PAYMENT_METHOD_SHAPES,
  PAYMENT_METHOD_TONES,
  STOCK_STATUS_ICONS,
  STOCK_STATUS_TONES,
  formatSignedQuantity,
  quantityDeltaIcon,
  quantityDeltaTone,
} from '@/components/common/statusTones'
import { MOVEMENT_TYPE_LABELS } from '@/domain/inventory'
import { PAYMENT_LABELS } from '@/domain/sale'
import { STOCK_STATUS_LABELS } from '@/domain/stock'
import type { MovementType, PaymentMethod, StockStatus } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/** "Stock In", "Sale", "Reversal", "Adjustment", each with its own icon. */
export function MovementTypePill({ type, className }: { type: MovementType; className?: string }) {
  return (
    <StatusPill
      tone={MOVEMENT_TYPE_TONES[type]}
      icon={MOVEMENT_TYPE_ICONS[type]}
      className={className}
    >
      {MOVEMENT_TYPE_LABELS[type]}
    </StatusPill>
  )
}

/** Shape-coded legend dot for a payment method, matching the donut slice colour. */
export function PaymentSwatch({
  method,
  className,
}: {
  method: PaymentMethod
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-2.5 w-2.5 shrink-0', PAYMENT_METHOD_SHAPES[method], className)}
      style={{ backgroundColor: PAYMENT_METHOD_COLORS[method].slice }}
    />
  )
}

/** "Cash", "Partial", "Credit" in the method's colour, with its legend shape. */
export function PaymentMethodPill({
  method,
  className,
}: {
  method: PaymentMethod
  className?: string
}) {
  return (
    <StatusPill tone={PAYMENT_METHOD_TONES[method]} className={className}>
      <PaymentSwatch method={method} className="mr-0.5 h-2 w-2" />
      {PAYMENT_LABELS[method]}
    </StatusPill>
  )
}

/** "+150 pcs" in green with an up arrow, "-5 pcs" in red with a down arrow. */
export function QuantityDeltaPill({
  delta,
  unit,
  className,
}: {
  delta: number
  unit?: string
  className?: string
}) {
  return (
    <StatusPill
      tone={quantityDeltaTone(delta)}
      icon={quantityDeltaIcon(delta)}
      className={className}
    >
      {formatSignedQuantity(delta)}
      {unit ? ` ${unit}` : null}
    </StatusPill>
  )
}

/**
 * "In Stock" / "Low Stock" / "Out of Stock" with a per-status icon. With
 * `stock`, shows the figure instead ("12 pcs"); the icon still marks the
 * status, and its name stays available to screen readers and as a tooltip.
 */
export function StockStatusPill({
  status,
  stock,
  unit,
  className,
}: {
  status: StockStatus
  stock?: number
  unit?: string
  className?: string
}) {
  const label = STOCK_STATUS_LABELS[status]

  if (stock === undefined) {
    return (
      <StatusPill
        tone={STOCK_STATUS_TONES[status]}
        icon={STOCK_STATUS_ICONS[status]}
        className={className}
      >
        {label}
      </StatusPill>
    )
  }

  return (
    <StatusPill
      tone={STOCK_STATUS_TONES[status]}
      icon={STOCK_STATUS_ICONS[status]}
      className={className}
    >
      <span title={label}>
        {formatNumber(stock)}
        {unit ? ` ${unit}` : null}
      </span>
      <span className="sr-only">, {label}</span>
    </StatusPill>
  )
}
