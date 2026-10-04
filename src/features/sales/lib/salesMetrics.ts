import type { Centavos } from '@/domain/money'
import type { PaymentMethod, Sale } from '@/domain/types'

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
  outstanding: Centavos
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
 * Everything the sales screen reports for one day, computed from the sales
 * themselves. No figure is stored, so nothing can disagree with the list below
 * it -- the design's own screens contradicted each other on exactly these
 * numbers (DESIGN-ERRATA E4).
 */
export function computeSalesMetrics(sales: Sale[], day: Date): SalesMetrics {
  const today = salesOnDay(sales, day).filter((sale) => sale.status === 'completed')

  const totalSales = today.reduce((sum, sale) => sum + sale.total, 0)
  const owing = today.filter((sale) => sale.balanceDue > 0)

  const amountByMethod = new Map<PaymentMethod, Centavos>()
  for (const sale of today) {
    amountByMethod.set(sale.paymentMethod, (amountByMethod.get(sale.paymentMethod) ?? 0) + sale.total)
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
    outstanding: owing.reduce((sum, sale) => sum + sale.balanceDue, 0),
    outstandingCount: owing.length,
    // A walk-in is not a named customer, so each one counts once.
    customersServed: today.filter((sale) => sale.customerId !== null).length,
    paymentTotal: totalSales,
    paymentSlices,
    topProducts: [...soldByProduct.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
  }
}

export type SaleStatusLabel = {
  label: string
  detail: string | null
  tone: 'success' | 'warning' | 'danger'
}

/** How a sale's settlement reads in the list: Paid, Partially Paid, Outstanding. */
export function describeSettlement(sale: Sale): SaleStatusLabel {
  if (sale.balanceDue === 0) {
    return { label: 'Paid', detail: null, tone: 'success' }
  }

  if (sale.amountPaid > 0) {
    return { label: 'Partially Paid', detail: 'left', tone: 'warning' }
  }

  return { label: 'Outstanding', detail: null, tone: 'danger' }
}
