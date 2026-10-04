import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MOVEMENT_FILTERS,
  displayReference,
  formatQuantityDelta,
  isMovementLogFiltered,
  rangeForPreset,
  toMovementFilter,
} from '@/features/inventory/lib/movementQuery'

const NOW = new Date(2025, 4, 21, 14, 30)

describe('rangeForPreset', () => {
  it('covers today from local midnight to the end of the day', () => {
    const range = rangeForPreset('today', NOW)

    expect(range?.from).toEqual(new Date(2025, 4, 21, 0, 0, 0, 0))
    expect(range?.to).toEqual(new Date(2025, 4, 21, 23, 59, 59, 999))
  })

  it('counts today as one of the last 7 days', () => {
    expect(rangeForPreset('7d', NOW)?.from).toEqual(new Date(2025, 4, 15))
    expect(rangeForPreset('30d', NOW)?.from).toEqual(new Date(2025, 3, 22))
  })

  it('has no range for all time', () => {
    expect(rangeForPreset('all', NOW)).toBeUndefined()
  })
})

describe('toMovementFilter', () => {
  it('drops "all" selections so the domain filter matches everything', () => {
    const filter = toMovementFilter({ type: 'all', productId: 'all', datePreset: 'all' }, NOW)

    expect(filter).toEqual({ productId: undefined, types: undefined, range: undefined })
  })

  it('passes a chosen type and product through', () => {
    const filter = toMovementFilter(
      { type: 'adjustment', productId: 'CEM-001', datePreset: 'today' },
      NOW,
    )

    expect(filter.types).toEqual(['adjustment'])
    expect(filter.productId).toBe('CEM-001')
    expect(filter.range).toBeDefined()
  })
})

describe('isMovementLogFiltered', () => {
  it('is false for the defaults only', () => {
    expect(isMovementLogFiltered(DEFAULT_MOVEMENT_FILTERS)).toBe(false)
    expect(isMovementLogFiltered({ ...DEFAULT_MOVEMENT_FILTERS, datePreset: 'all' })).toBe(true)
  })
})

describe('formatQuantityDelta', () => {
  it('always shows the sign', () => {
    expect(formatQuantityDelta(150)).toBe('+150')
    expect(formatQuantityDelta(-5)).toBe('-5')
    expect(formatQuantityDelta(0)).toBe('0')
  })
})

describe('displayReference', () => {
  it('shows a dash for a blank reference', () => {
    expect(displayReference('')).toBe('—')
    expect(displayReference('INV-10021')).toBe('INV-10021')
  })
})
