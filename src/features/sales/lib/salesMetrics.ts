import { SETTLEMENT_LABELS, remainingBySale, settlementStatus } from '@/domain/ledger'
import type { SettlementStatus } from '@/domain/ledger'
import type { Centavos } from '@/domain/money'
import type { CustomerPayment, PaymentMethod, Sale } from '@/domain/types'
import { formatNumber } from '@/lib/format'

export type PaymentSlice = {
  method: PaymentMethod
  amount: Centavos
  share: number
}

export type TopProduct = {
  productId: string
  name: string
  quantity: number
  unit: string
  amount: Centavos
}

export type SalesMetrics = {
  transactionCount: number
  totalSales: Centavos
  /**
   * What is still unpaid today on today's sales: each sale's charge less the
   * customer payments allocated to it (remainingBySale), not the balance left
   * at the counter. Same allocation as the Ledger and the Dashboard.
   */
  outstanding: Centavos
  /** Today's sales with something still unpaid on them. */
  outstandingCount: number
  customersServed: number
  paymentTotal: Centavos
  paymentSlices: PaymentSlice[]
  topProducts: TopProduct[]
}

export function isSameDay(iso: string, day: Date): boolean {
  return new Date(iso).toDateString() === day.toDateString()
}

export function salesOnDay(sales: Sale[], day: Date): Sale[] {
  return sales.filter((sale) => isSameDay(sale.occurredAt, day))
}

/** Newest first, which is how a cashier looks for the sale just made. */
export function newestFirst(sales: Sale[]): Sale[] {
  return [...sales].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
}

const PAYMENT_ORDER: PaymentMethod[] = ['cash', 'partial', 'credit']

/**
 * Customers served: each named customer once, however many times they bought,
 * plus one per walk-in sale. A walk-in has no identity, so two walk-in sales
 * cannot be told apart and each is counted as its own customer.
 */
export function countCustomersServed(sales: Sale[]): number {
  const named = new Set<string>()
  let walkIns = 0

  for (const sale of sales) {
    if (sale.customerId === null) {
      walkIns += 1
    } else {
      named.add(sale.customerId)
    }
  }

  return named.size + walkIns
}

/**
 * Everything the sales screen reports for one day, computed from the sales and
 * the customers' payments. No figure is stored, so nothing can disagree with
 * the list below it -- the design's own screens contradicted each other on
 * exactly these numbers (DESIGN-ERRATA E4).
 *
 * `payments` are all customer payments: they are allocated to every sale,
 * oldest charge first, before the day's sales are picked out, as the Ledger
 * does. It is optional (and last) so callers that only need totals, such as
 * the Dashboard, can leave it out; without it `outstanding` is the balance
 * left at the counter.
 */
export function computeSalesMetrics(
  sales: Sale[],
  day: Date,
  payments: CustomerPayment[] = [],
): SalesMetrics {
  const today = salesOnDay(sales, day).filter((sale) => sale.status === 'completed')
  const remaining = remainingBySale(sales, payments)

  const totalSales = today.reduce((sum, sale) => sum + sale.total, 0)
  const owing = today.filter((sale) => (remaining.get(sale.id) ?? 0) > 0)

  const amountByMethod = new Map<PaymentMethod, Centavos>()
  for (const sale of today) {
    amountByMethod.set(
      sale.paymentMethod,
      (amountByMethod.get(sale.paymentMethod) ?? 0) + sale.total,
    )
  }

  const paymentSlices = PAYMENT_ORDER.map((method) => {
    const amount = amountByMethod.get(method) ?? 0

    return {
      method,
      amount,
      share: totalSales === 0 ? 0 : amount / totalSales,
    }
  })

  const soldByProduct = new Map<string, TopProduct>()
  for (const sale of today) {
    for (const item of sale.lines) {
      const existing = soldByProduct.get(item.productId)

      soldByProduct.set(item.productId, {
        productId: item.productId,
        name: item.productName,
        unit: item.unit,
        quantity: (existing?.quantity ?? 0) + item.quantity,
        amount: (existing?.amount ?? 0) + item.lineTotal,
      })
    }
  }

  return {
    transactionCount: today.length,
    totalSales,
    outstanding: owing.reduce((sum, sale) => sum + (remaining.get(sale.id) ?? 0), 0),
    outstandingCount: owing.length,
    customersServed: countCustomersServed(today),
    paymentTotal: totalSales,
    paymentSlices,
    topProducts: [...soldByProduct.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
  }
}

export type SaleStatusLabel = {
  status: SettlementStatus
  label: string
  /** What is still unpaid on the sale now, after customer payments. */
  remaining: Centavos
  tone: 'success' | 'warning' | 'danger'
}

const SETTLEMENT_TONES: Record<SettlementStatus, SaleStatusLabel['tone']> = {
  paid: 'success',
  partially_paid: 'warning',
  outstanding: 'danger',
}

/**
 * How a sale's settlement reads now: Paid, Partially Paid or Outstanding, from
 * what is still unpaid after customer payments (`remaining`, from
 * remainingBySale) -- so the Sales screen agrees with the Ledger.
 */
export function describeSettlement(sale: Sale, remaining: Centavos): SaleStatusLabel {
  const status = settlementStatus(sale, remaining)

  return {
    status,
    label: SETTLEMENT_LABELS[status],
    remaining: Math.max(remaining, 0),
    tone: SETTLEMENT_TONES[status],
  }
}

/** "1 item", "3 items", "1,200 items": the one wording for unit counts on every sales screen. */
export function formatItemCount(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'item' : 'items'}`
}
