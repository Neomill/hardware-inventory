import { computeOutstanding } from '@/domain/ledger'
import { computeBalanceDue, computeChange, computeSaleTotals, formatSaleNumber } from '@/domain/sale'
import type {
  Customer,
  CustomerPayment,
  PaymentMethod,
  Product,
  Sale,
  SaleLine,
  StockMovement,
} from '@/domain/types'

type SaleSeed = {
  /** Minutes before "now", so the list always looks like it happened today. */
  minutesAgo: number
  items: [sku: string, quantity: number][]
  method: PaymentMethod
  customerId: string | null
  /** Share of the total already paid. Partial payments only. */
  paidShare?: number
}

/**
 * Sales history for the prototype, newest last. Written as intent rather than
 * as finished records so every total, change and balance is computed by the
 * same functions the live checkout uses -- the figures cannot drift from the
 * rules.
 */
const SEEDS: SaleSeed[] = [
  { minutesAgo: 1400, items: [['CEM-001', 10], ['TIW-016', 5]], method: 'cash', customerId: null },
  { minutesAgo: 1355, items: [['PVC-050', 12], ['PVCE-050', 8]], method: 'credit', customerId: 'CUS-006' },
  { minutesAgo: 1290, items: [['LED-009', 6]], method: 'cash', customerId: null },
  { minutesAgo: 1240, items: [['PNT-100', 2], ['PBR-003', 2]], method: 'partial', customerId: 'CUS-004', paidShare: 0.5 },
  { minutesAgo: 1180, items: [['CHB-004', 200]], method: 'cash', customerId: null },

  { minutesAgo: 320, items: [['SFG-001', 4], ['SFH-001', 2]], method: 'cash', customerId: null },
  { minutesAgo: 295, items: [['GI-100', 6], ['GIE-100', 6]], method: 'credit', customerId: 'CUS-002' },
  { minutesAgo: 268, items: [['NAI-200', 3]], method: 'cash', customerId: null },
  { minutesAgo: 240, items: [['WIR-020', 1], ['TAP-001', 4]], method: 'partial', customerId: 'CUS-003', paidShare: 0.4 },
  { minutesAgo: 205, items: [['SP-120', 10], ['TAP-002', 3]], method: 'cash', customerId: null },
  { minutesAgo: 176, items: [['CEM-001', 5], ['AGG-001', 1]], method: 'cash', customerId: null },
  { minutesAgo: 150, items: [['PNT-701', 1]], method: 'credit', customerId: 'CUS-001' },
  { minutesAgo: 124, items: [['HAM-016', 1], ['SDS-006', 1]], method: 'cash', customerId: null },
  { minutesAgo: 96, items: [['PVC-075', 8], ['TEF-001', 4], ['BVL-050', 2]], method: 'partial', customerId: 'CUS-005', paidShare: 0.6 },
  { minutesAgo: 70, items: [['THN-001', 2], ['PBR-003', 1]], method: 'cash', customerId: null },
  { minutesAgo: 48, items: [['MTP-005', 1]], method: 'cash', customerId: null },
  { minutesAgo: 31, items: [['SFM-095', 1], ['SFG-002', 0]], method: 'cash', customerId: null },
  { minutesAgo: 18, items: [['GI-200', 2]], method: 'credit', customerId: 'CUS-007' },
  { minutesAgo: 9, items: [['SCR-081', 100], ['SCR-101', 50]], method: 'cash', customerId: null },
]

function buildLines(items: SaleSeed['items'], products: Product[]): SaleLine[] {
  return items
    .map(([sku, quantity]) => {
      const product = products.find((candidate) => candidate.sku === sku)

      if (!product || quantity <= 0) {
        return null
      }

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        unitPrice: product.price,
        quantity,
        lineTotal: product.price * quantity,
      }
    })
    .filter((line): line is SaleLine => line !== null)
}

/** Supplier deliveries, newest first. Numbered INV-NNNNN (E6). */
const RECEIPTS: [reference: string, sku: string, quantity: number, supplier: string, minutesAgo: number][] = [
  ['INV-10021', 'PVC-050', 150, 'ABC Trading', 75],
  ['INV-10020', 'CEM-001', 50, 'XYZ Supplies', 1075],
  ['INV-10019', 'WIR-020', 20, 'Metro Electrical', 2600],
  ['INV-10018', 'LED-009', 60, 'Metro Electrical', 4300],
]

/** Manual corrections, oldest first. Each carries the reason the audit trail needs. */
const ADJUSTMENTS: [sku: string, quantityDelta: number, reason: string, minutesAgo: number][] = [
  ['DK-001', -2, 'Damaged in storage', 3900],
  ['SCR-081', 25, 'Physical count correction', 2950],
  ['SP-120', -2, 'Torn during handling', 560],
]

/**
 * Payments customers brought in against their balances, oldest first. 'balance'
 * settles the account in full. Amounts are capped at what is owed at that
 * moment, so the seed can never overpay a customer.
 */
const PAYMENTS: [customerId: string, amount: number | 'balance', note: string | null, minutesAgo: number][] = [
  ['CUS-006', 20000, 'Partial payment, cash', 600],
  ['CUS-004', 'balance', 'Paid in full', 400],
  ['CUS-002', 50000, null, 100],
]

export type SeededHistory = {
  sales: Sale[]
  movements: StockMovement[]
  payments: CustomerPayment[]
}

/**
 * Product stock in the catalogue is already current, so this history does not
 * reduce it again. Only sales made during the session move stock.
 */
export function buildSeedHistory(
  products: Product[],
  customers: Customer[],
  taxRate: number,
  now: Date,
): SeededHistory {
  const sales: Sale[] = []
  const movements: StockMovement[] = []
  const sequenceByDay = new Map<string, number>()

  SEEDS.forEach((seed, index) => {
    const lines = buildLines(seed.items, products)

    if (lines.length === 0) {
      return
    }

    const occurredAt = new Date(now.getTime() - seed.minutesAgo * 60_000)
    const dayKey = occurredAt.toDateString()
    const sequence = (sequenceByDay.get(dayKey) ?? 0) + 1
    sequenceByDay.set(dayKey, sequence)

    const totals = computeSaleTotals(lines, 0, taxRate)
    const customer = customers.find((candidate) => candidate.id === seed.customerId) ?? null

    const amountPaid =
      seed.method === 'cash'
        ? totals.total
        : seed.method === 'credit'
          ? 0
          : Math.round(totals.total * (seed.paidShare ?? 0.5))

    const sale: Sale = {
      id: `SALE-${String(index + 1).padStart(4, '0')}`,
      saleNumber: formatSaleNumber(occurredAt, sequence),
      occurredAt: occurredAt.toISOString(),
      lines,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      total: totals.total,
      taxRate,
      paymentMethod: seed.method,
      amountPaid,
      changeGiven: computeChange(totals.total, seed.method === 'cash' ? amountPaid : 0),
      balanceDue: computeBalanceDue(seed.method, totals.total, amountPaid),
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? 'Walk-in Customer',
      status: 'completed',
      recordedBy: 'Juan Dela Cruz',
    }

    sales.push(sale)

    for (const line of lines) {
      movements.push({
        id: `MOV-${sale.id}-${line.productId}`,
        productId: line.productId,
        type: 'sale',
        quantityDelta: -line.quantity,
        reference: sale.saleNumber,
        description: `Sold to ${sale.customerName}`,
        reason: null,
        recordedBy: sale.recordedBy,
        occurredAt: sale.occurredAt,
      })
    }
  })

  // Supplier receipts and adjustments, so the movement log is not only sales.
  // Like the sales above these are history: catalogue stock is already current.
  for (const [reference, sku, quantity, supplier, minutesAgo] of RECEIPTS) {
    const product = products.find((candidate) => candidate.sku === sku)

    if (!product) {
      continue
    }

    const occurredAt = new Date(now.getTime() - minutesAgo * 60_000)

    movements.push({
      id: `MOV-${reference}`,
      productId: product.id,
      type: 'stock_in',
      quantityDelta: quantity,
      reference,
      description: `Received from ${supplier}`,
      reason: null,
      note: null,
      recordedBy: 'Juan Dela Cruz',
      occurredAt: occurredAt.toISOString(),
    })
  }

  ADJUSTMENTS.forEach(([sku, quantityDelta, reason, minutesAgo], index) => {
    const product = products.find((candidate) => candidate.sku === sku)

    if (!product) {
      return
    }

    const reference = `ADJ-${String(index + 1).padStart(5, '0')}`

    movements.push({
      id: `MOV-${reference}`,
      productId: product.id,
      type: 'adjustment',
      quantityDelta,
      reference,
      description: `Adjusted: ${reason}`,
      reason,
      note: null,
      recordedBy: 'Juan Dela Cruz',
      occurredAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    })
  })

  const payments: CustomerPayment[] = []

  for (const [customerId, amount, note, minutesAgo] of PAYMENTS) {
    const customer = customers.find((candidate) => candidate.id === customerId)
    const occurredAt = new Date(now.getTime() - minutesAgo * 60_000)
    const owing = computeOutstanding(sales, payments, customerId, occurredAt)
    const paid = Math.min(amount === 'balance' ? owing : amount, owing)

    if (!customer || paid <= 0) {
      continue
    }

    payments.push({
      id: `PAY-${String(payments.length + 1).padStart(5, '0')}`,
      customerId,
      customerName: customer.name,
      amount: paid,
      note,
      recordedBy: 'Juan Dela Cruz',
      occurredAt: occurredAt.toISOString(),
    })
  }

  return { sales, movements, payments }
}
