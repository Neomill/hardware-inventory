import { describe, expect, it } from 'vitest'

import { msUntilNextLocalMidnight } from '@/hooks/useCalendarDay'

describe('msUntilNextLocalMidnight', () => {
  it('counts to the next local midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 4, 23, 0, 0))).toBe(60 * 60 * 1000)
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 4, 12, 0, 0))).toBe(12 * 60 * 60 * 1000)
  })

  it('crosses month and year ends', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 11, 31, 23, 59, 59))).toBe(1000)
    expect(msUntilNextLocalMidnight(new Date(2026, 1, 28, 23, 59, 0))).toBe(60 * 1000)
  })

  it('waits a full day from exactly midnight, and never returns zero', () => {
    const midnight = new Date(2026, 9, 5)
    const next = new Date(2026, 9, 6)

    expect(msUntilNextLocalMidnight(midnight)).toBe(next.getTime() - midnight.getTime())
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 4, 23, 59, 59, 999))).toBe(1)
  })

  it('lands on the next calendar day', () => {
    const now = new Date(2026, 2, 8, 15, 30)
    const after = new Date(now.getTime() + msUntilNextLocalMidnight(now))

    expect(after.getDate()).toBe(9)
    expect(after.getHours()).toBe(0)
    expect(after.getMinutes()).toBe(0)
  })
})
