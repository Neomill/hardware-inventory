import {
  eachDayKey,
  fromDayKey,
  isWithinRange,
  toDayKey,
  type DateRange,
  type DayKey,
} from '@/domain/dates'
import { breakDownVat, type Centavos } from '@/domain/money'
import { PAYMENT_LABELS } from '@/domain/sale'
import type { CustomerPayment, PaymentMethod, Sale } from '@/domain/types'

/**
 * Report aggregation. Every figure is summed from completed sales as they were
 * recorded: VAT uses the rate stamped on each sale, never today's rate (D1),
 * and cancelled sales count for nothing. A missing range means all time.
 */

export function completedSalesIn(sales: Sale[], range?: DateRange): Sale[] {
  return sales.filter(
    (sale) => sale.status === 'completed' && isWithinRange(sale.occurredAt, range),
  )
}

/** Money taken at the counter: the total for cash, the amount paid otherwise. */
export function collectedAtSale(sale: Sale): Centavos {
  return sale.paymentMethod === 'cash' ? sale.total : sale.amountPaid
}

export type SalesSummary = {
  transactionCount: number
  itemCount: number
  /** Sum of subtotals, before discounts. */
  grossSales: Centavos
  discounts: Centavos
  /** Sum of totals: what customers were charged, VAT included. */
  totalSales: Centavos
  /** Net of VAT and VAT, each sale split at its own stamped rate. */
  netOfVat: Centavos
  vat: Centavos
  /** Paid at the counter (cash totals plus partial down payments). */
  collected: Centavos
  /** Left owing on partial and credit sales. */
  creditExtended: Centavos
  /** Whole centavos, half-up. Zero when there were no sales. */
  averageSale: Centavos
}

function emptySummary(): SalesSummary {
  return {
    transactionCount: 0,
    itemCount: 0,
    grossSales: 0,
    discounts: 0,
    totalSales: 0,
    netOfVat: 0,
    vat: 0,
    collected: 0,
    creditExtended: 0,
    averageSale: 0,
  }
}

function addSale(summary: SalesSummary, sale: Sale): void {
  const { net, vat } = breakDownVat(sale.total, sale.taxRate)

  summary.transactionCount += 1
  summary.itemCount += sale.lines.reduce((count, line) => count + line.quantity, 0)
  summary.grossSales += sale.subtotal
  summary.discounts += sale.discountAmount
  summary.totalSales += sale.total
  summary.netOfVat += net
  summary.vat += vat
  summary.collected += collectedAtSale(sale)
  summary.creditExtended += sale.balanceDue
}

function finishSummary(summary: SalesSummary): SalesSummary {
  summary.averageSale =
    summary.transactionCount === 0 ? 0 : Math.round(summary.totalSales / summary.transactionCount)

  return summary
}

export function summarizeSales(sales: Sale[], range?: DateRange): SalesSummary {
  const summary = emptySummary()

  for (const sale of completedSalesIn(sales, range)) {
    addSale(summary, sale)
  }

  return finishSummary(summary)
}

export type DailySales = SalesSummary & {
  day: DayKey
  /** Local midnight at the start of the day. */
  date: Date
}

/**
 * One row per day, oldest first. With a range, every day in it gets a row --
 * zero-sale days included -- so a chart has no gaps. Without one, only days
 * that had sales appear.
 */
export function aggregateSalesByDay(sales: Sale[], range?: DateRange): DailySales[] {
  const byDay = new Map<DayKey, SalesSummary>()

  if (range) {
    for (const key of eachDayKey(range)) {
      byDay.set(key, emptySummary())
    }
  }

  for (const sale of completedSalesIn(sales, range)) {
    const key = toDayKey(sale.occurredAt)
    const summary = byDay.get(key) ?? emptySummary()

    addSale(summary, sale)
    byDay.set(key, summary)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, summary]) => ({ ...finishSummary(summary), day, date: fromDayKey(day) }))
}

export type ProductSales = {
  productId: string
  /** As named on the most recent sale. */
  productName: string
  sku: string
  unit: string
  quantity: number
  /** Sum of line totals. Before any sale-level discount, VAT included. */
  revenue: Centavos
  /** Sales that included the product. */
  saleCount: number
}

/** Units and revenue per product across completed sales, unsorted. */
export function aggregateProductSales(sales: Sale[], range?: DateRange): ProductSales[] {
  const byProduct = new Map<string, ProductSales>()

  // Oldest first, so the name kept is the latest one used.
  const ordered = [...completedSalesIn(sales, range)].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  )

  for (const sale of ordered) {
    const seenInSale = new Set<string>()

    for (const line of sale.lines) {
      const existing = byProduct.get(line.productId)

      byProduct.set(line.productId, {
        productId: line.productId,
        productName: line.productName,
        sku: line.sku,
        unit: line.unit,
        quantity: (existing?.quantity ?? 0) + line.quantity,
        revenue: (existing?.revenue ?? 0) + line.lineTotal,
        saleCount: (existing?.saleCount ?? 0) + (seenInSale.has(line.productId) ? 0 : 1),
      })
      seenInSale.add(line.productId)
    }
  }

  return [...byProduct.values()]
}

/** Best sellers by units sold. Ties go to the higher revenue, then by name. */
export function topProductsByQuantity(
  sales: Sale[],
  limit = 10,
  range?: DateRange,
): ProductSales[] {
  return aggregateProductSales(sales, range)
    .sort(
      (a, b) =>
        b.quantity - a.quantity ||
        b.revenue - a.revenue ||
        a.productName.localeCompare(b.productName),
    )
    .slice(0, limit)
}

/** Best sellers by revenue. Ties go to the higher quantity, then by name. */
export function topProductsByRevenue(sales: Sale[], limit = 10, range?: DateRange): ProductSales[] {
  return aggregateProductSales(sales, range)
    .sort(
      (a, b) =>
        b.revenue - a.revenue ||
        b.quantity - a.quantity ||
        a.productName.localeCompare(b.productName),
    )
    .slice(0, limit)
}

export type PaymentBreakdownRow = {
  method: PaymentMethod
  label: string
  saleCount: number
  /** Sum of sale totals for this method. */
  total: Centavos
  /** Fraction of all sales, 0 to 1. */
  share: number
  /** Whole percentages that always add up to exactly 100 (or all 0). */
  percent: number
}

const PAYMENT_ORDER: PaymentMethod[] = ['cash', 'partial', 'credit']

/**
 * Whole percentages for display that add up to 100. Plain rounding can give
 * 33 + 33 + 33 = 99; the largest-remainder method hands the missing point to
 * whichever share was rounded down the most.
 */
export function wholePercentages(amounts: number[]): number[] {
  const sum = amounts.reduce((total, amount) => total + amount, 0)

  if (sum <= 0) {
    return amounts.map(() => 0)
  }

  const exact = amounts.map((amount) => (amount / sum) * 100)
  const floors = exact.map(Math.floor)
  let missing = 100 - floors.reduce((total, value) => total + value, 0)

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)

  for (const { index } of byRemainder) {
    if (missing <= 0) {
      break
    }

    floors[index] += 1
    missing -= 1
  }

  return floors
}

/** Cash, partial and credit, always in that order and always all three. */
export function paymentMethodBreakdown(sales: Sale[], range?: DateRange): PaymentBreakdownRow[] {
  const completed = completedSalesIn(sales, range)
  const grandTotal = completed.reduce((sum, sale) => sum + sale.total, 0)

  const rows = PAYMENT_ORDER.map((method) => {
    const matching = completed.filter((sale) => sale.paymentMethod === method)
    const total = matching.reduce((sum, sale) => sum + sale.total, 0)

    return {
      method,
      label: PAYMENT_LABELS[method],
      saleCount: matching.length,
      total,
      share: grandTotal === 0 ? 0 : total / grandTotal,
      percent: 0,
    }
  })

  const percents = wholePercentages(rows.map((row) => row.total))

  return rows.map((row, index) => ({ ...row, percent: percents[index] }))
}

/** Ledger payments received in a period, separate from money taken at sale. */
export function sumPayments(payments: CustomerPayment[], range?: DateRange): Centavos {
  return payments
    .filter((payment) => isWithinRange(payment.occurredAt, range))
    .reduce((sum, payment) => sum + payment.amount, 0)
}
