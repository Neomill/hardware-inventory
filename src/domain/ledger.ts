import { byOccurredAt } from '@/domain/dates'
import type { Centavos } from '@/domain/money'
import type { Customer, CustomerPayment, Sale, ValidationResult } from '@/domain/types'

/**
 * The customer ledger is a view over records that already exist: what a sale
 * left unpaid is a charge, and every CustomerPayment reduces it. Nothing here
 * stores a balance, so the ledger cannot drift from the sales history.
 *
 * Completed sales are never edited, so `sale.balanceDue` stays what was left
 * owing at the counter. Later payments are subtracted from the customer's
 * total, oldest charge first, rather than written back onto the sale.
 */

/** What a sale put on the customer's account. Cancelled sales charge nothing. */
export function chargedAmount(sale: Sale): Centavos {
  if (sale.status !== 'completed' || sale.customerId === null) {
    return 0
  }

  return sale.balanceDue
}

function isCharge(sale: Sale): boolean {
  return chargedAmount(sale) > 0
}

/** No cutoff means everything recorded so far. */
function onOrBefore(iso: string, asOf?: Date): boolean {
  return asOf === undefined || new Date(iso).getTime() <= asOf.getTime()
}

/** What one customer still owes. */
export function computeOutstanding(
  sales: Sale[],
  payments: CustomerPayment[],
  customerId: string,
  asOf?: Date,
): Centavos {
  const charged = sales
    .filter((sale) => sale.customerId === customerId && onOrBefore(sale.occurredAt, asOf))
    .reduce((sum, sale) => sum + chargedAmount(sale), 0)

  const paid = payments
    .filter((payment) => payment.customerId === customerId && onOrBefore(payment.occurredAt, asOf))
    .reduce((sum, payment) => sum + payment.amount, 0)

  return charged - paid
}

/** Every customer with ledger activity, keyed by id. Settled customers map to 0. */
export function computeOutstandingByCustomer(
  sales: Sale[],
  payments: CustomerPayment[],
  asOf?: Date,
): Map<string, Centavos> {
  const balances = new Map<string, Centavos>()

  for (const sale of sales) {
    if (sale.customerId !== null && onOrBefore(sale.occurredAt, asOf) && isCharge(sale)) {
      balances.set(sale.customerId, (balances.get(sale.customerId) ?? 0) + chargedAmount(sale))
    }
  }

  for (const payment of payments) {
    if (onOrBefore(payment.occurredAt, asOf)) {
      balances.set(payment.customerId, (balances.get(payment.customerId) ?? 0) - payment.amount)
    }
  }

  return balances
}

/** Money owed to the store across every customer. The dashboard KPI. */
export function computeTotalOutstanding(
  sales: Sale[],
  payments: CustomerPayment[],
  asOf?: Date,
): Centavos {
  let total = 0

  for (const balance of computeOutstandingByCustomer(sales, payments, asOf).values()) {
    total += balance
  }

  return total
}

export type CustomerBalance = {
  customerId: string
  customerName: string
  phone?: string
  totalCharged: Centavos
  totalPaid: Centavos
  outstanding: Centavos
  /** Charges not yet fully settled, oldest-first allocation. */
  openChargeCount: number
  /** When the oldest unsettled charge was made. Null when settled. */
  oldestOpenChargeAt: string | null
  /** Most recent charge or payment. Null when the customer has none. */
  lastActivityAt: string | null
}

/**
 * One row per customer for the Outstanding Balances list, largest debt first.
 * Customers who owe nothing are left out unless `includeSettled` is set.
 */
export function listCustomerBalances(
  customers: Customer[],
  sales: Sale[],
  payments: CustomerPayment[],
  options: { includeSettled?: boolean } = {},
): CustomerBalance[] {
  const rows = customers.map((customer): CustomerBalance => {
    const charges = sales.filter((sale) => sale.customerId === customer.id && isCharge(sale))
    const paid = payments.filter((payment) => payment.customerId === customer.id)
    const open = listOpenCharges(sales, payments, customer.id)

    const totalCharged = charges.reduce((sum, sale) => sum + chargedAmount(sale), 0)
    const totalPaid = paid.reduce((sum, payment) => sum + payment.amount, 0)

    const activity = [...charges, ...paid].sort(byOccurredAt)

    return {
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      totalCharged,
      totalPaid,
      outstanding: totalCharged - totalPaid,
      openChargeCount: open.length,
      oldestOpenChargeAt: open[0]?.occurredAt ?? null,
      lastActivityAt: activity[activity.length - 1]?.occurredAt ?? null,
    }
  })

  return rows
    .filter((row) => options.includeSettled || row.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding || a.customerName.localeCompare(b.customerName))
}

export type OpenCharge = {
  saleId: string
  saleNumber: string
  occurredAt: string
  charged: Centavos
  /** Payments allocated to this charge so far. */
  settled: Centavos
  remaining: Centavos
}

/**
 * The customer's unsettled sales. Payments are not tied to a sale, so they
 * settle the oldest charge first; what is left over shows here. The remaining
 * amounts always sum to computeOutstanding().
 */
export function listOpenCharges(
  sales: Sale[],
  payments: CustomerPayment[],
  customerId: string,
): OpenCharge[] {
  let unallocated = payments
    .filter((payment) => payment.customerId === customerId)
    .reduce((sum, payment) => sum + payment.amount, 0)

  const charges = sales
    .filter((sale) => sale.customerId === customerId && isCharge(sale))
    .sort(byOccurredAt)

  const open: OpenCharge[] = []

  for (const sale of charges) {
    const charged = chargedAmount(sale)
    const settled = Math.min(charged, unallocated)
    unallocated -= settled

    if (settled < charged) {
      open.push({
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        occurredAt: sale.occurredAt,
        charged,
        settled,
        remaining: charged - settled,
      })
    }
  }

  return open
}

export type LedgerEntryType = 'charge' | 'payment'

export type LedgerEntry = {
  /** The sale or payment id. Unique within a statement. */
  id: string
  type: LedgerEntryType
  occurredAt: string
  /** Sale number for a charge, payment id for a payment. */
  reference: string
  description: string
  /** Signed: a charge is positive, a payment negative. */
  amount: Centavos
  /** What the customer owed straight after this entry. */
  balance: Centavos
  saleId: string | null
  paymentId: string | null
}

const ENTRY_ORDER: Record<LedgerEntryType, number> = { charge: 0, payment: 1 }

function describeCharge(sale: Sale): string {
  if (sale.paymentMethod === 'partial') {
    return `Partial payment sale, ${sale.lines.length} item line${sale.lines.length === 1 ? '' : 's'}`
  }

  return `Credit sale, ${sale.lines.length} item line${sale.lines.length === 1 ? '' : 's'}`
}

/**
 * One customer's account in date order with a running balance -- the paper
 * ledger the store keeps today. A charge and a payment at the same moment list
 * the charge first, so the balance never reads negative.
 */
export function buildLedgerStatement(
  sales: Sale[],
  payments: CustomerPayment[],
  customerId: string,
): LedgerEntry[] {
  const entries: Omit<LedgerEntry, 'balance'>[] = [
    ...sales
      .filter((sale) => sale.customerId === customerId && isCharge(sale))
      .map((sale) => ({
        id: sale.id,
        type: 'charge' as const,
        occurredAt: sale.occurredAt,
        reference: sale.saleNumber,
        description: describeCharge(sale),
        amount: chargedAmount(sale),
        saleId: sale.id,
        paymentId: null,
      })),
    ...payments
      .filter((payment) => payment.customerId === customerId)
      .map((payment) => ({
        id: payment.id,
        type: 'payment' as const,
        occurredAt: payment.occurredAt,
        reference: payment.id,
        description: payment.note ? `Payment received: ${payment.note}` : 'Payment received',
        amount: -payment.amount,
        saleId: null,
        paymentId: payment.id,
      })),
  ]

  entries.sort((a, b) => byOccurredAt(a, b) || ENTRY_ORDER[a.type] - ENTRY_ORDER[b.type])

  let balance = 0

  return entries.map((entry) => {
    balance += entry.amount

    return { ...entry, balance }
  })
}

/**
 * A payment must be whole centavos, more than nothing, and no more than the
 * customer owes -- the store does not hold credit on account.
 */
export function validateCustomerPayment(input: {
  amount: Centavos
  outstanding: Centavos
}): ValidationResult {
  const { amount, outstanding } = input

  if (outstanding <= 0) {
    return { ok: false, message: 'This customer has no outstanding balance.' }
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false, message: 'Enter an amount greater than zero.' }
  }

  if (amount > outstanding) {
    return { ok: false, message: 'That is more than the customer owes.' }
  }

  return { ok: true, message: null }
}
