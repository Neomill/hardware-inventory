import { lastNDays, type DateRange } from '@/domain/dates'
import type { MovementFilter } from '@/domain/inventory'
import type { MovementType } from '@/domain/types'
import { formatNumber } from '@/lib/format'

export const ALL = 'all'

export type DatePreset = 'today' | '7d' | '30d' | typeof ALL

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
}

export const DATE_PRESET_ORDER: DatePreset[] = ['today', '7d', '30d', ALL]

export const MOVEMENT_TYPE_ORDER: MovementType[] = [
  'stock_in',
  'sale',
  'sale_reversal',
  'adjustment',
]

export type MovementLogFilters = {
  type: MovementType | typeof ALL
  productId: string
  datePreset: DatePreset
}

export const DEFAULT_MOVEMENT_FILTERS: MovementLogFilters = {
  type: ALL,
  productId: ALL,
  datePreset: '30d',
}

/** Whole local days ending today. "All time" has no range at all. */
export function rangeForPreset(preset: DatePreset, now: Date): DateRange | undefined {
  switch (preset) {
    case 'today':
      return lastNDays(now, 1)
    case '7d':
      return lastNDays(now, 7)
    case '30d':
      return lastNDays(now, 30)
    default:
      return undefined
  }
}

/** Screen filters to the domain's filter shape. */
export function toMovementFilter(filters: MovementLogFilters, now: Date): MovementFilter {
  return {
    productId: filters.productId === ALL ? undefined : filters.productId,
    types: filters.type === ALL ? undefined : [filters.type],
    range: rangeForPreset(filters.datePreset, now),
  }
}

export function isMovementLogFiltered(filters: MovementLogFilters): boolean {
  return (
    filters.type !== DEFAULT_MOVEMENT_FILTERS.type ||
    filters.productId !== DEFAULT_MOVEMENT_FILTERS.productId ||
    filters.datePreset !== DEFAULT_MOVEMENT_FILTERS.datePreset
  )
}

/** "+150" / "-5" / "0". The sign is the point, so it is always shown. */
export function formatQuantityDelta(quantityDelta: number): string {
  if (quantityDelta === 0) {
    return '0'
  }

  return `${quantityDelta > 0 ? '+' : '-'}${formatNumber(Math.abs(quantityDelta))}`
}

/** A delivery without an invoice has a blank reference; the log shows a dash. */
export function displayReference(reference: string): string {
  return reference.trim() === '' ? '—' : reference
}
