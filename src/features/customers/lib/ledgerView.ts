import { LOCALE } from '@/config/app'
import type { CustomerBalance } from '@/domain/ledger'
import type { Centavos } from '@/domain/money'
import type { CustomerPayment } from '@/domain/types'

/**
 * Presentation helpers for the Customer Ledger screens. The balances
 * themselves come from src/domain/ledger.ts; nothing here re-derives money.
 */

export type LedgerSummary = {
  totalOutstanding: Centavos
  customersWithBalance: number
  /** The longest-waiting unsettled charge across every customer. */
  oldestOpenCharge: { occurredAt: string; customerId: string; customerName: string } | null
}

/** KPI strip figures. Expects every customer's row, settled ones included or not. */
export function summarizeBalances(rows: CustomerBalance[]): LedgerSummary {
  let totalOutstanding = 0
  let customersWithBalance = 0
  let oldestOpenCharge: LedgerSummary['oldestOpenCharge'] = null

  for (const row of rows) {
    if (row.outstanding <= 0) {
      continue
    }

    totalOutstanding += row.outstanding
    customersWithBalance += 1

    if (
      row.oldestOpenChargeAt !== null &&
      (oldestOpenCharge === null ||
        new Date(row.oldestOpenChargeAt).getTime() <
          new Date(oldestOpenCharge.occurredAt).getTime())
    ) {
      oldestOpenCharge = {
        occurredAt: row.oldestOpenChargeAt,
        customerId: row.customerId,
        customerName: row.customerName,
      }
    }
  }

  return { totalOutstanding, customersWithBalance, oldestOpenCharge }
}

/**
 * Matches the customer name (any word order, case-insensitive) or the phone
 * number by digits, so "0917555" finds "0917 555 0101".
 */
export function filterBalances(rows: CustomerBalance[], query: string): CustomerBalance[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)

  if (terms.length === 0) {
    return rows
  }

  const queryDigits = query.replace(/\D/g, '')

  return rows.filter((row) => {
    const name = row.customerName.toLowerCase()

    if (terms.every((term) => name.includes(term))) {
      return true
    }

    const phoneDigits = row.phone?.replace(/\D/g, '') ?? ''

    return queryDigits.length >= 3 && phoneDigits.includes(queryDigits)
  })
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole calendar days between the two moments, in local time. Never negative. */
export function daysBetween(fromIso: string, now: Date): number {
  const from = new Date(fromIso)
  const startFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  return Math.max(0, Math.round((startNow - startFrom) / DAY_MS))
}

/** "Today", "Yesterday", "12 days ago". */
export function describeAge(fromIso: string, now: Date): string {
  const days = daysBetween(fromIso, now)

  if (days === 0) {
    return 'Today'
  }

  if (days === 1) {
    return 'Yesterday'
  }

  return `${days} days ago`
}

/** One customer's payments, newest first, which is how a cashier checks the last one. */
export function listPaymentHistory(
  payments: CustomerPayment[],
  customerId: string,
): CustomerPayment[] {
  return payments
    .filter((payment) => payment.customerId === customerId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** "May 21, 2025". Ledger rows span months, so the year is always shown. */
export function formatLedgerDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}
