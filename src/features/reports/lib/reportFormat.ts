import { LOCALE } from '@/config/app'

const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' })
const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** "May 21", for chart axes. */
export function formatShortDay(date: Date): string {
  return shortDayFormatter.format(date)
}

/** "Wed, May 21", for table rows and the chart readout. */
export function formatDayWithWeekday(date: Date): string {
  return `${weekdayFormatter.format(date)}, ${shortDayFormatter.format(date)}`
}

/** "May 21, 2025" */
export function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date)
}
