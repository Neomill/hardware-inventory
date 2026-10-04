import { useEffect, useState } from 'react'

import { toDayKey, type DayKey } from '@/domain/dates'

/** Lands the timer just past midnight, so the new key is already in effect. */
const MIDNIGHT_MARGIN_MS = 50

/**
 * Milliseconds from `now` to the next local midnight, at least 1. Built from
 * calendar fields, so a 23- or 25-hour daylight-saving day is handled.
 */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  return Math.max(1, next.getTime() - now.getTime())
}

/**
 * Today's local date as a "YYYY-MM-DD" key that changes just after midnight,
 * so a screen left open overnight rolls over to the new day. A tablet that
 * slept through midnight may have its timer throttled, so the day is also
 * rechecked when the page becomes visible again or the window regains focus.
 */
export function useCalendarDay(): DayKey {
  const [key, setKey] = useState(() => toDayKey(new Date()))

  useEffect(() => {
    // setKey ignores an unchanged key, so rechecks cost no render.
    const sync = () => setKey(toDayKey(new Date()))

    // Re-armed whenever the key changes.
    const timer = window.setTimeout(sync, msUntilNextLocalMidnight(new Date()) + MIDNIGHT_MARGIN_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        sync()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', sync)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', sync)
    }
  }, [key])

  return key
}
