import {
  ArrowDownToLine,
  ArrowDown,
  ArrowUp,
  CircleAlert,
  CircleCheck,
  CircleX,
  Minus,
  ShoppingCart,
  SlidersHorizontal,
  Undo2,
  type LucideIcon,
} from 'lucide-react'

import type { PillTone } from '@/components/common/StatusPill'
import type { MovementType, PaymentMethod, StockStatus } from '@/domain/types'
import { formatNumber } from '@/lib/format'

/*
 * Presentation maps: which colour, icon and shape each status uses. The
 * statuses themselves and their labels stay in src/domain.
 */

// ---- Stock -----------------------------------------------------------------

export const STOCK_STATUS_TONES: Record<StockStatus, PillTone> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
}

/** Icon per stock status, so the pill does not rely on colour alone. */
export const STOCK_STATUS_ICONS: Record<StockStatus, LucideIcon> = {
  in_stock: CircleCheck,
  low_stock: CircleAlert,
  out_of_stock: CircleX,
}

/** The stock figure itself is coloured to match its status. */
export const STOCK_TEXT_STYLES: Record<StockStatus, string> = {
  in_stock: 'text-emerald-600',
  low_stock: 'text-amber-600',
  out_of_stock: 'text-rose-600',
}

// ---- Stock movements -------------------------------------------------------

export const MOVEMENT_TYPE_TONES: Record<MovementType, PillTone> = {
  stock_in: 'success',
  sale: 'danger',
  sale_reversal: 'info',
  adjustment: 'warning',
}

export const MOVEMENT_TYPE_ICONS: Record<MovementType, LucideIcon> = {
  stock_in: ArrowDownToLine,
  sale: ShoppingCart,
  sale_reversal: Undo2,
  adjustment: SlidersHorizontal,
}

/** Sign of a quantity change: the arrow repeats what the +/- already says. */
export function quantityDeltaTone(delta: number): PillTone {
  if (delta > 0) {
    return 'success'
  }

  return delta < 0 ? 'danger' : 'neutral'
}

export function quantityDeltaIcon(delta: number): LucideIcon {
  if (delta > 0) {
    return ArrowUp
  }

  return delta < 0 ? ArrowDown : Minus
}

/** "+150", "-5", "0"; the sign is the point, so it is always shown. */
export function formatSignedQuantity(delta: number): string {
  if (delta === 0) {
    return '0'
  }

  return `${delta > 0 ? '+' : '-'}${formatNumber(Math.abs(delta))}`
}

// ---- Payment methods -------------------------------------------------------

/**
 * One colour per payment method, used by the pill, the donut slice and the
 * legend swatch, so a method looks the same everywhere. `slice` is the solid
 * chart colour (validated for light mode); `tone` is the pill of the same hue.
 *
 * Orange against green is close for deuteranopes, so colour is never the only
 * cue: pills carry the method name, and swatches carry a distinct shape.
 */
export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, { slice: string; tone: PillTone }> = {
  cash: { slice: '#16A34A', tone: 'success' },
  partial: { slice: '#EA580C', tone: 'orange' },
  credit: { slice: '#7C3AED', tone: 'violet' },
}

export const PAYMENT_METHOD_TONES: Record<PaymentMethod, PillTone> = {
  cash: PAYMENT_METHOD_COLORS.cash.tone,
  partial: PAYMENT_METHOD_COLORS.partial.tone,
  credit: PAYMENT_METHOD_COLORS.credit.tone,
}

/** Swatch shape per method (Tailwind classes on a square). */
export const PAYMENT_METHOD_SHAPES: Record<PaymentMethod, string> = {
  cash: 'rounded-full',
  partial: 'rounded-sm',
  credit: 'rotate-45 rounded-[1px]',
}
