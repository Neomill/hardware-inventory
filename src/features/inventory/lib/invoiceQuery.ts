import { LOCALE } from '@/config/app'
import { fromDayKey, toDayKey, type DayKey } from '@/domain/dates'
import { isValidDayKey, sortInvoicesNewestFirst } from '@/domain/supplierInvoice'
import type { SupplierInvoice } from '@/domain/types'
import { formatTime } from '@/lib/format'

/** The Invoices list (spec 04 supplier invoices, s.5.5 and s.7.4). Read only. */

const invoiceDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/**
 * "Nov 1, 2026" from the invoice's printed date. Read as a local day, so it
 * never shifts a day across time zones the way new Date("2026-11-01") would.
 */
export function formatInvoiceDate(dayKey: DayKey): string {
  return isValidDayKey(dayKey) ? invoiceDateFormatter.format(fromDayKey(dayKey)) : dayKey
}

/** "Nov 1, 2026, 04:45 PM": when the invoice was saved. Blank for an unreadable time. */
export function formatRecordedAt(iso: string): string {
  const date = new Date(iso)

  return Number.isNaN(date.getTime())
    ? ''
    : `${formatInvoiceDate(toDayKey(date))}, ${formatTime(date)}`
}

/**
 * Newest first, narrowed by invoice number or supplier. Case and extra spaces
 * are ignored; a blank search keeps every invoice.
 */
export function searchInvoices(invoices: SupplierInvoice[], search: string): SupplierInvoice[] {
  const needle = search.trim().replace(/\s+/g, ' ').toLowerCase()
  const sorted = sortInvoicesNewestFirst(invoices)

  if (needle === '') {
    return sorted
  }

  return sorted.filter(
    (invoice) =>
      invoice.invoiceNumber.toLowerCase().includes(needle) ||
      invoice.supplier.toLowerCase().includes(needle),
  )
}

/** Numbers that have a saved invoice, so the movement log can link them (spec s.7.6). */
export function savedInvoiceNumbers(invoices: SupplierInvoice[]): Set<string> {
  return new Set(invoices.map((invoice) => invoice.invoiceNumber))
}
