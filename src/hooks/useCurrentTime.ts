import { useEffect, useState } from 'react'

/**
 * Ticking clock for the top bar.
 * Re-renders once per interval instead of on every animation frame so the
 * dashboard stays cheap on an entry-level tablet.
 */
export function useCurrentTime(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}
