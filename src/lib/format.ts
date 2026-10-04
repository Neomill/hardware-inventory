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

/**
 * "12%" or "12.5%" from a stored rate (0.12, 0.125). Rates are kept to basis
 * points (see normalizeTaxRate), so the figure is built from whole basis points
 * and never shows float noise such as 7.000000000000001%.
 */
export function formatTaxRatePercent(rate: number): string {
  if (!Number.isFinite(rate)) {
    return ''
  }

  const basisPoints = Math.round(rate * 10_000)
  const sign = basisPoints < 0 ? '-' : ''
  const absolute = Math.abs(basisPoints)
  const whole = Math.floor(absolute / 100)
  const fraction = String(absolute % 100)
    .padStart(2, '0')
    .replace(/0+$/, '')

  return `${sign}${whole}${fraction ? `.${fraction}` : ''}%`
}

/**
 * The "From <day>" marker for something held on an earlier day than `now`:
 * "From May 20". Null when it is from today (or later), which needs no marker.
 */
export function formatFromDay(iso: string, now: Date): string | null {
  const date = new Date(iso)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (Number.isNaN(date.getTime()) || date.getTime() >= today.getTime()) {
    return null
  }

  return `From ${shortDateFormatter.format(date)}`
}
