import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PRESET,
  MAX_CUSTOM_DAYS,
  isValidDayKey,
  parseRangeParams,
  parseSectionParam,
  parseTopMetricParam,
  reportsHref,
  resolveRange,
  writeRangeParams,
} from '@/features/reports/lib/reportRange'

// 2025-05-21 14:30 local time.
const NOW = new Date(2025, 4, 21, 14, 30)

describe('resolveRange', () => {
  it('covers the whole of today', () => {
    const resolved = resolveRange({ preset: 'today' }, NOW)

    expect(resolved.from).toBe('2025-05-21')
    expect(resolved.to).toBe('2025-05-21')
    expect(resolved.range.from).toEqual(new Date(2025, 4, 21, 0, 0, 0, 0))
    expect(resolved.range.to).toEqual(new Date(2025, 4, 21, 23, 59, 59, 999))
    expect(resolved.dayCount).toBe(1)
    expect(resolved.label).toBe('Today')
  })

  it('covers the whole of yesterday, across a month boundary', () => {
    const resolved = resolveRange({ preset: 'yesterday' }, new Date(2025, 5, 1, 8))

    expect(resolved.from).toBe('2025-05-31')
    expect(resolved.to).toBe('2025-05-31')
    expect(resolved.label).toBe('Yesterday')
  })

  it('counts today as one of the last 7 and last 30 days', () => {
    const week = resolveRange({ preset: '7d' }, NOW)
    const month = resolveRange({ preset: '30d' }, NOW)

    expect([week.from, week.to, week.dayCount]).toEqual(['2025-05-15', '2025-05-21', 7])
    expect([month.from, month.to, month.dayCount]).toEqual(['2025-04-22', '2025-05-21', 30])
  })

  it('uses the custom days given and labels them as dates', () => {
    const resolved = resolveRange({ preset: 'custom', from: '2025-05-01', to: '2025-05-10' }, NOW)

    expect([resolved.from, resolved.to, resolved.dayCount]).toEqual([
      '2025-05-01',
      '2025-05-10',
      10,
    ])
    expect(resolved.label).toContain('May 1')
    expect(resolved.label).toContain('May 10')
  })

  it('swaps a custom range picked backwards', () => {
    const resolved = resolveRange({ preset: 'custom', from: '2025-05-10', to: '2025-05-01' }, NOW)

    expect([resolved.from, resolved.to]).toEqual(['2025-05-01', '2025-05-10'])
  })

  it('fills a missing custom end with today', () => {
    const resolved = resolveRange({ preset: 'custom', from: '2025-05-18' }, NOW)

    expect([resolved.from, resolved.to]).toEqual(['2025-05-18', '2025-05-21'])
  })

  it('caps a custom range at the maximum length, keeping its end', () => {
    const resolved = resolveRange({ preset: 'custom', from: '2000-01-01', to: '2025-05-21' }, NOW)

    expect(resolved.dayCount).toBe(MAX_CUSTOM_DAYS)
    expect(resolved.to).toBe('2025-05-21')
  })
})

describe('isValidDayKey', () => {
  it('accepts real days and rejects impossible or malformed ones', () => {
    expect(isValidDayKey('2024-02-29')).toBe(true)
    expect(isValidDayKey('2025-02-29')).toBe(false)
    expect(isValidDayKey('2025-5-1')).toBe(false)
    expect(isValidDayKey('')).toBe(false)
    expect(isValidDayKey(null)).toBe(false)
  })
})

describe('range query params', () => {
  it('defaults when the range is missing or unknown', () => {
    expect(parseRangeParams(new URLSearchParams())).toEqual({ preset: DEFAULT_PRESET })
    expect(parseRangeParams(new URLSearchParams('range=forever'))).toEqual({
      preset: DEFAULT_PRESET,
    })
  })

  it('reads presets and drops invalid custom days', () => {
    expect(parseRangeParams(new URLSearchParams('range=7d&from=2025-05-01'))).toEqual({
      preset: '7d',
    })
    expect(parseRangeParams(new URLSearchParams('range=custom&from=2025-05-01&to=nope'))).toEqual({
      preset: 'custom',
      from: '2025-05-01',
      to: undefined,
    })
  })

  it('round-trips a custom range and keeps unrelated params', () => {
    const written = writeRangeParams(new URLSearchParams('top=revenue&from=x'), {
      preset: 'custom',
      from: '2025-05-01',
      to: '2025-05-10',
    })

    expect(written.get('top')).toBe('revenue')
    expect(parseRangeParams(written)).toEqual({
      preset: 'custom',
      from: '2025-05-01',
      to: '2025-05-10',
    })
  })

  it('clears custom days when switching to a preset', () => {
    const written = writeRangeParams(new URLSearchParams('range=custom&from=2025-05-01'), {
      preset: '30d',
    })

    expect(written.toString()).toBe('range=30d')
  })

  it('reads the section and the top-products metric', () => {
    expect(parseSectionParam(new URLSearchParams('section=payment-breakdown'))).toBe(
      'payment-breakdown',
    )
    expect(parseSectionParam(new URLSearchParams('section=elsewhere'))).toBeNull()
    expect(parseTopMetricParam(new URLSearchParams('top=revenue'))).toBe('revenue')
    expect(parseTopMetricParam(new URLSearchParams('top=junk'))).toBe('quantity')
  })
})

describe('reportsHref', () => {
  it('builds plain and deep links', () => {
    expect(reportsHref()).toBe('/reports')
    expect(reportsHref({ range: { preset: 'today' }, section: 'top-products' })).toBe(
      '/reports?range=today&section=top-products',
    )
  })
})
