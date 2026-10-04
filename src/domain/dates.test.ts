import { describe, expect, it } from 'vitest'

import {
  dayRange,
  eachDayKey,
  endOfDay,
  fromDayKey,
  isWithinRange,
  lastNDays,
  startOfDay,
  toDayKey,
} from '@/domain/dates'
import { nextSequentialId } from '@/domain/ids'

describe('day keys', () => {
  it('uses the local calendar day', () => {
    expect(toDayKey(new Date(2025, 4, 21, 23, 59))).toBe('2025-05-21')
    expect(toDayKey(new Date(2025, 0, 1, 0, 0))).toBe('2025-01-01')
  })

  it('round-trips through fromDayKey', () => {
    const day = fromDayKey('2025-05-21')

    expect(day.getHours()).toBe(0)
    expect(toDayKey(day)).toBe('2025-05-21')
  })
})

describe('ranges', () => {
  it('covers whole days at both ends', () => {
    const range = dayRange(new Date(2025, 4, 20, 15), new Date(2025, 4, 21, 9))

    expect(range.from).toEqual(startOfDay(new Date(2025, 4, 20)))
    expect(range.to).toEqual(endOfDay(new Date(2025, 4, 21)))
    expect(isWithinRange(new Date(2025, 4, 21, 23, 59, 59).toISOString(), range)).toBe(true)
    expect(isWithinRange(new Date(2025, 4, 22, 0, 0, 0).toISOString(), range)).toBe(false)
  })

  it('treats a missing range as no limit', () => {
    expect(isWithinRange('1999-01-01T00:00:00.000Z')).toBe(true)
  })

  it('counts today in the last N days', () => {
    const now = new Date(2025, 4, 21, 10)

    expect(eachDayKey(lastNDays(now, 7))).toEqual([
      '2025-05-15',
      '2025-05-16',
      '2025-05-17',
      '2025-05-18',
      '2025-05-19',
      '2025-05-20',
      '2025-05-21',
    ])
    expect(eachDayKey(lastNDays(now, 0))).toEqual(['2025-05-21'])
  })

  it('crosses month ends', () => {
    expect(eachDayKey(dayRange(new Date(2025, 1, 27), new Date(2025, 2, 2)))).toEqual([
      '2025-02-27',
      '2025-02-28',
      '2025-03-01',
      '2025-03-02',
    ])
  })
})

describe('nextSequentialId', () => {
  it('continues from the highest number with that prefix', () => {
    expect(nextSequentialId('CUS-', ['CUS-001', 'CUS-008', 'CUS-003'], 3)).toBe('CUS-009')
  })

  it('ignores ids with another prefix or no number', () => {
    expect(nextSequentialId('ADJ-', ['INV-10021', 'ADJ-x', '#20250521-0001'], 5)).toBe('ADJ-00001')
  })

  it('grows past its width rather than wrapping', () => {
    expect(nextSequentialId('CUS-', ['CUS-999'], 3)).toBe('CUS-1000')
  })
})
