import { toPesos, type Centavos } from '@/domain/money'
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

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
})

const numberFormatter = new Intl.NumberFormat(LOCALE)

/** "₱42,560.00" from an integer centavo amount. */
export function formatCurrency(amount: Centavos): string {
  return currencyFormatter.format(toPesos(amount))
}

/** "May 21, 2025 (Wed)" */
export function formatDateLabel(date: Date): string {
  return `${dateFormatter.format(date)} (${weekdayFormatter.format(date)})`
}

/** "10:30 AM" */
export function formatTime(date: Date): string {
  return timeFormatter.format(date)
}

/** "May 21, 10:15 AM" */
export function formatDateTimeShort(date: Date): string {
  return `${shortDateFormatter.format(date)}, ${timeFormatter.format(date)}`
}

/** "2,153" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}
