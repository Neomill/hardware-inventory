import { CURRENCY, LOCALE } from '@/config/app'

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const weekdayFormatter = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' })

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

/** "₱42,560.00" */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

/** "May 21, 2025 (Wed)" */
export function formatDateLabel(date: Date): string {
  return `${dateFormatter.format(date)} (${weekdayFormatter.format(date)})`
}

/** "10:30 AM" */
export function formatTime(date: Date): string {
  return timeFormatter.format(date)
}
