import { useEffect, useState } from 'react'

import { dayKey, msUntilNextDay } from '@/features/dashboard/lib/dashboardMetrics'

/**
 * Today's local date as a "YYYY-MM-DD" key that changes at midnight, so a
 * dashboard left open overnight rolls over to the new day. A tablet that slept
 * through midnight may have its timer throttled, so the day is also rechecked
 * when the page becomes visible again.
 */
export function useCalendarDay(): string {
  const [key, setKey] = useState(() => dayKey(new Date()))

  useEffect(() => {
    const sync = () => setKey(dayKey(new Date()))

    // Re-armed whenever the key changes; the small margin lands past midnight.
    const timer = window.setTimeout(sync, msUntilNextDay(new Date()) + 50)

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
