import { describe, expect, it } from 'vitest'

import { formatFromDay, formatTaxRatePercent } from '@/lib/format'

describe('formatTaxRatePercent', () => {
  it('drops decimals a whole percentage does not need', () => {
    expect(formatTaxRatePercent(0.12)).toBe('12%')
    expect(formatTaxRatePercent(0)).toBe('0%')
    expect(formatTaxRatePercent(0.5)).toBe('50%')
  })

  it('keeps the decimals a rate does have', () => {
    expect(formatTaxRatePercent(0.125)).toBe('12.5%')
    expect(formatTaxRatePercent(0.0725)).toBe('7.25%')
    expect(formatTaxRatePercent(0.1205)).toBe('12.05%')
  })

  it('shows no float noise', () => {
    expect(formatTaxRatePercent(0.07)).toBe('7%')
    expect(formatTaxRatePercent(0.1 + 0.02)).toBe('12%')
    expect(formatTaxRatePercent(0.075 + 1e-17)).toBe('7.5%')
  })

  it('is blank for a non-number', () => {
    expect(formatTaxRatePercent(Number.NaN)).toBe('')
  })
})

describe('formatFromDay', () => {
  const now = new Date(2025, 4, 21, 9, 30)

  it('marks anything from an earlier day', () => {
    expect(formatFromDay(new Date(2025, 4, 20, 16, 15).toISOString(), now)).toBe('From May 20')
    expect(formatFromDay(new Date(2025, 4, 20, 23, 59, 59).toISOString(), now)).toBe('From May 20')
  })

  it('leaves today unmarked, from midnight on', () => {
    expect(formatFromDay(new Date(2025, 4, 21, 0, 0).toISOString(), now)).toBeNull()
    expect(formatFromDay(new Date(2025, 4, 21, 9, 0).toISOString(), now)).toBeNull()
  })

  it('is null for an unreadable date', () => {
    expect(formatFromDay('not a date', now)).toBeNull()
  })
})
