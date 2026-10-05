import { CURRENCY, LOCALE } from '@/config/app'
import { byOccurredAt, isWithinRange, type DateRange } from '@/domain/dates'
import {
  computeTotalOutstanding,
  listCustomerBalances,
  type CustomerBalance,
} from '@/domain/ledger'
import { toPesos, type Centavos } from '@/domain/money'
import {
  aggregateSalesByDay,
  paymentMethodBreakdown,
  summarizeSales,
  sumPayments,
  topProductsByQuantity,
  topProductsByRevenue,
  wholePercentages,
  type DailySales,
  type PaymentBreakdownRow,
  type ProductSales,
  type SalesSummary,
} from '@/domain/reports'
import type { Customer, CustomerPayment, Sale } from '@/domain/types'
import type { TopProductsMetric } from '@/features/reports/lib/reportRange'

/**
 * Everything the Reports page shows, derived from the store's records for one
 * date range. No figure is authored (DESIGN-ERRATA E4): each one is summed by
 * the tested report and ledger functions in src/domain.
 */

export const TOP_PRODUCTS_LIMIT = 10

export type ChartScale = {
  /** Top of the axis, a round number at or above the largest value. */
  max: number
  /** Evenly spaced gridline values from 0 to max, both included. */
  ticks: number[]
}

/**
 * A "nice" axis for non-negative values: the top is the smallest 1, 2, 2.5 or
 * 5 x 10^n step multiple that holds the largest value. All-zero data gets a
 * 0..1 axis so bars sit on the baseline instead of dividing by zero.
 */
export function niceScale(values: number[], tickCount = 4): ChartScale {
  const largest = Math.max(0, ...values)

  if (largest === 0) {
    return { max: 1, ticks: [0, 1] }
  }

  const rawStep = largest / tickCount
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const candidate =
    [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((value) => value >= rawStep) ??
    10 * magnitude
  // Values are whole centavos or units, so a step below one is never useful.
  const step = Math.max(1, candidate)
  const stepCount = Math.ceil(largest / step)
  const ticks = Array.from({ length: stepCount + 1 }, (_, index) => index * step)

  return { max: stepCount * step, ticks }
}

const compactCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  notation: 'compact',
  // Older ICU builds (Node 20) default currency to 2 minimum digits and print "₱150.0K".
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/** "₱1.2K" for chart axes, where a full "₱1,234.00" would not fit. */
export function formatCompactCurrency(amount: Centavos): string {
  return compactCurrencyFormatter.format(toPesos(amount))
}

export type TopProductRow = ProductSales & {
  rank: number
  /** Whole-percent share of the listed products' measured value (sums to 100). */
  percent: number
}

export function buildTopProducts(
  sales: Sale[],
  metric: TopProductsMetric,
  range: DateRange,
  limit = TOP_PRODUCTS_LIMIT,
): TopProductRow[] {
  const products =
    metric === 'revenue'
      ? topProductsByRevenue(sales, limit, range)
      : topProductsByQuantity(sales, limit, range)
  const percents = wholePercentages(
    products.map((product) => (metric === 'revenue' ? product.revenue : product.quantity)),
  )

  return products.map((product, index) => ({
    ...product,
    rank: index + 1,
    percent: percents[index],
  }))
}

export type OutstandingCreditView = {
  /** Owed right now, across every customer. Not limited to the range. */
  totalOutstanding: Centavos
  balances: CustomerBalance[]
  /** Ledger payments received inside the range, newest first. */
  paymentsInRange: CustomerPayment[]
  paymentsReceived: Centavos
}

export function buildOutstandingCredit(
  customers: Customer[],
  sales: Sale[],
  payments: CustomerPayment[],
  range: DateRange,
): OutstandingCreditView {
  const paymentsInRange = payments
    .filter((payment) => isWithinRange(payment.occurredAt, range))
    .sort(byOccurredAt)
    .reverse()

  return {
    totalOutstanding: computeTotalOutstanding(sales, payments),
    balances: listCustomerBalances(customers, sales, payments),
    paymentsInRange,
    paymentsReceived: sumPayments(payments, range),
  }
}

export type ReportViewModel = {
  summary: SalesSummary
  daily: DailySales[]
  dailyScale: ChartScale
  topProducts: TopProductRow[]
  paymentRows: PaymentBreakdownRow[]
  paymentTotal: Centavos
  credit: OutstandingCreditView
}

export function buildReportViewModel(input: {
  sales: Sale[]
  payments: CustomerPayment[]
  customers: Customer[]
  range: DateRange
  topMetric: TopProductsMetric
}): ReportViewModel {
  const { sales, payments, customers, range, topMetric } = input
  const daily = aggregateSalesByDay(sales, range)
  const paymentRows = paymentMethodBreakdown(sales, range)

  return {
    summary: summarizeSales(sales, range),
    daily,
    dailyScale: niceScale(daily.map((day) => day.totalSales)),
    topProducts: buildTopProducts(sales, topMetric, range),
    paymentRows,
    paymentTotal: paymentRows.reduce((sum, row) => sum + row.total, 0),
    credit: buildOutstandingCredit(customers, sales, payments, range),
  }
}
