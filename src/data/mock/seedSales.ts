import { buildOpeningStockMovement, stockFromMovements } from '@/domain/inventory'
import { computeOutstanding } from '@/domain/ledger'
import { applyRate } from '@/domain/money'
import {
  computeBalanceDue,
  computeChange,
  computeSaleTotals,
  formatSaleNumber,
  nextSaleSequence,
} from '@/domain/sale'
import type {
  Customer,
  CustomerPayment,
  PaymentMethod,
  Product,
  Sale,
  SaleLine,
  StockMovement,
} from '@/domain/types'

/** When something happened: whole days before today, and the local time of day. */
export type SeedTime = [daysAgo: number, time: string]

type SaleSeed = {
  at: SeedTime
  items: [sku: string, quantity: number][]
  method: PaymentMethod
  customerId: string | null
  /** Share of the total already paid. Partial payments only. */
  paidShare?: number
}

/**
 * Sales history for the prototype, oldest first: a day of trade yesterday and
 * one today. Written as intent rather than as finished records so every total,
 * change and balance is computed by the same functions the live checkout uses
 * -- the figures cannot drift from the rules.
 */
const SEEDS: SaleSeed[] = [
  {
    at: [1, '09:15'],
    items: [
      ['CEM-001', 10],
      ['TIW-016', 5],
    ],
    method: 'cash',
    customerId: null,
  },
  {
    at: [1, '10:40'],
    items: [
      ['PVC-050', 12],
      ['PVCE-050', 8],
    ],
    method: 'credit',
    customerId: 'CUS-006',
  },
  { at: [1, '13:05'], items: [['LED-009', 6]], method: 'cash', customerId: null },
  {
    at: [1, '15:20'],
    items: [
      ['PNT-100', 2],
      ['PBR-003', 2],
    ],
    method: 'partial',
    customerId: 'CUS-004',
    paidShare: 0.5,
  },
  { at: [1, '16:45'], items: [['CHB-004', 200]], method: 'cash', customerId: null },

  {
    at: [0, '08:10'],
    items: [
      ['SFG-001', 4],
      ['SFH-001', 2],
    ],
    method: 'cash',
    customerId: null,
  },
  {
    at: [0, '08:55'],
    items: [
      ['GI-100', 6],
      ['GIE-100', 6],
    ],
    method: 'credit',
    customerId: 'CUS-002',
  },
  { at: [0, '09:30'], items: [['NAI-200', 3]], method: 'cash', customerId: null },
  {
    at: [0, '10:05'],
    items: [
      ['WIR-020', 1],
      ['TAP-001', 4],
    ],
    method: 'partial',
    customerId: 'CUS-003',
    paidShare: 0.4,
  },
  {
    at: [0, '10:50'],
    items: [
      ['SP-120', 10],
      ['TAP-002', 3],
    ],
    method: 'cash',
    customerId: null,
  },
  {
    at: [0, '11:35'],
    items: [
      ['CEM-001', 5],
      ['AGG-001', 1],
    ],
    method: 'cash',
    customerId: null,
  },
  { at: [0, '12:20'], items: [['PNT-701', 1]], method: 'credit', customerId: 'CUS-001' },
  {
    at: [0, '13:10'],
    items: [
      ['HAM-016', 1],
      ['SDS-006', 1],
    ],
    method: 'cash',
    customerId: null,
  },
  {
    at: [0, '13:55'],
    items: [
      ['PVC-075', 8],
      ['TEF-001', 4],
      ['BVL-050', 2],
    ],
    method: 'partial',
    customerId: 'CUS-005',
    paidShare: 0.6,
  },
  {
    at: [0, '14:40'],
    items: [
      ['THN-001', 2],
      ['PBR-003', 1],
    ],
    method: 'cash',
    customerId: null,
  },
  { at: [0, '15:20'], items: [['MTP-005', 1]], method: 'cash', customerId: null },
  {
    at: [0, '15:50'],
    items: [
      ['SFM-095', 1],
      ['SFG-002', 0],
    ],
    method: 'cash',
    customerId: null,
  },
  { at: [0, '16:25'], items: [['GI-200', 2]], method: 'credit', customerId: 'CUS-007' },
  {
    at: [0, '17:10'],
    items: [
      ['SCR-081', 100],
      ['SCR-101', 50],
    ],
    method: 'cash',
    customerId: null,
  },
]

/** The day the books open: every product's opening stock is dated here. */
const OPENING_AT: SeedTime = [30, '07:00']

const SEED_RECORDER = 'Juan Dela Cruz'

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
const RECEIPTS: [
  reference: string,
  sku: string,
  quantity: number,
  supplier: string,
  at: SeedTime,
][] = [
  ['INV-10021', 'PVC-050', 150, 'ABC Trading', [0, '16:45']],
  ['INV-10020', 'CEM-001', 50, 'XYZ Supplies', [1, '08:00']],
  ['INV-10019', 'WIR-020', 20, 'Metro Electrical', [2, '10:00']],
  ['INV-10018', 'LED-009', 60, 'Metro Electrical', [3, '14:00']],
]

/** Manual corrections, oldest first. Each carries the reason the audit trail needs. */
const ADJUSTMENTS: [sku: string, quantityDelta: number, reason: string, at: SeedTime][] = [
  ['DK-001', -2, 'Damaged in storage', [3, '11:00']],
  ['SCR-081', 25, 'Physical count correction', [2, '15:30']],
  ['SP-120', -2, 'Torn during handling', [0, '08:40']],
]

/**
 * Payments customers brought in against their balances, oldest first. 'balance'
 * settles the account in full. Amounts are capped at what is owed at that
 * moment, so the seed can never overpay a customer.
 */
const PAYMENTS: [
  customerId: string,
  amount: number | 'balance',
  note: string | null,
  at: SeedTime,
][] = [
  ['CUS-006', 20000, 'Partial payment, cash', [0, '08:30']],
  ['CUS-004', 'balance', 'Paid in full', [0, '11:20']],
  ['CUS-002', 50000, null, [0, '16:20']],
]

export type SeededHistory = {
  sales: Sale[]
  movements: StockMovement[]
  payments: CustomerPayment[]
}

function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)

  return hours * 60 + minutes
}

/** Every time of day used today, so the latest one can be fitted before `now`. */
const TODAY_TIMES: string[] = [
  ...SEEDS.map((seed) => seed.at),
  ...RECEIPTS.map((receipt) => receipt[4]),
  ...ADJUSTMENTS.map((adjustment) => adjustment[3]),
  ...PAYMENTS.map((payment) => payment[3]),
]
  .filter(([daysAgo]) => daysAgo === 0)
  .map(([, time]) => time)

/**
 * Turns a seed time into a real local date relative to `now`. Earlier days use
 * their time of day as written. Today's times are used as written when `now`
 * is already past the last of them; earlier in the day (a seed or reset at
 * 01:00) they are squeezed proportionally into the part of today that has
 * passed, keeping their order. Nothing is ever dated after `now`, and a fresh
 * seed always shows a day of trade today and yesterday.
 */
export function createSeedClock(now: Date): (at: SeedTime) => Date {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const elapsed = now.getTime() - midnight.getTime()
  const latestToday = Math.max(0, ...TODAY_TIMES.map(minutesOfDay)) * 60_000
  const scale = latestToday > elapsed ? elapsed / latestToday : 1

  return ([daysAgo, time]) => {
    const offset = minutesOfDay(time) * 60_000

    if (daysAgo === 0) {
      return new Date(midnight.getTime() + Math.floor(offset * scale))
    }

    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)

    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutesOfDay(time))
  }
}

/**
 * The seeded history, consistent with the catalogue: catalogue stock is what
 * is on hand now, and every product gets an opening-stock movement (see
 * OPENING_STOCK_REFERENCE) sized so that opening + receipts + adjustments -
 * sales equals that stock. Every product gets one, even when it opened with
 * nothing, so each product's log starts at the day the books opened.
 */
export function buildSeedHistory(
  products: Product[],
  customers: Customer[],
  taxRate: number,
  now: Date,
): SeededHistory {
  const clock = createSeedClock(now)
  const sales: Sale[] = []
  const history: StockMovement[] = []

  SEEDS.forEach((seed, index) => {
    const lines = buildLines(seed.items, products)

    if (lines.length === 0) {
      return
    }

    const occurredAt = clock(seed.at)
    const sequence = nextSaleSequence(sales, occurredAt)

    const totals = computeSaleTotals(lines, 0, taxRate)
    const customer = customers.find((candidate) => candidate.id === seed.customerId) ?? null

    const amountPaid =
      seed.method === 'cash'
        ? totals.total
        : seed.method === 'credit'
          ? 0
          : applyRate(totals.total, seed.paidShare ?? 0.5)

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
      recordedBy: SEED_RECORDER,
    }

    sales.push(sale)

    for (const line of lines) {
      history.push({
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
  for (const [reference, sku, quantity, supplier, at] of RECEIPTS) {
    const product = products.find((candidate) => candidate.sku === sku)

    if (!product) {
      continue
    }

    history.push({
      id: `MOV-${reference}`,
      productId: product.id,
      type: 'stock_in',
      quantityDelta: quantity,
      reference,
      description: `Received from ${supplier}`,
      reason: null,
      note: null,
      recordedBy: SEED_RECORDER,
      occurredAt: clock(at).toISOString(),
    })
  }

  ADJUSTMENTS.forEach(([sku, quantityDelta, reason, at], index) => {
    const product = products.find((candidate) => candidate.sku === sku)

    if (!product) {
      return
    }

    const reference = `ADJ-${String(index + 1).padStart(5, '0')}`

    history.push({
      id: `MOV-${reference}`,
      productId: product.id,
      type: 'adjustment',
      quantityDelta,
      reference,
      description: `Adjusted: ${reason}`,
      reason,
      note: null,
      recordedBy: SEED_RECORDER,
      occurredAt: clock(at).toISOString(),
    })
  })

  // Opening stock first, so the log reads from the day the books opened.
  const openedAt = clock(OPENING_AT).toISOString()
  const openings = products.map((product) =>
    buildOpeningStockMovement({
      productId: product.id,
      quantity: product.stock - stockFromMovements(history, product.id),
      occurredAt: openedAt,
      recordedBy: SEED_RECORDER,
    }),
  )

  const movements = [...openings, ...history]

  const payments: CustomerPayment[] = []

  for (const [customerId, amount, note, at] of PAYMENTS) {
    const customer = customers.find((candidate) => candidate.id === customerId)
    const occurredAt = clock(at)
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
      recordedBy: SEED_RECORDER,
      occurredAt: occurredAt.toISOString(),
    })
  }

  return { sales, movements, payments }
}
