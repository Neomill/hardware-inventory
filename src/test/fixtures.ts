import type { CustomerPayment, PaymentMethod, Sale, SaleLine, StockMovement } from '@/domain/types'

/**
 * Small record builders for unit tests. Only the fields a test cares about
 * need passing; the rest default to a plausible completed sale.
 */

export function testLine(
  productId: string,
  unitPrice: number,
  quantity: number,
  productName = `Product ${productId}`,
): SaleLine {
  return {
    productId,
    productName,
    sku: productId,
    unit: 'pcs',
    unitPrice,
    quantity,
    lineTotal: unitPrice * quantity,
  }
}

let saleCounter = 0

export function testSale(overrides: {
  occurredAt: string
  total?: number
  lines?: SaleLine[]
  paymentMethod?: PaymentMethod
  amountPaid?: number
  balanceDue?: number
  customerId?: string | null
  status?: Sale['status']
  taxRate?: number
  discountAmount?: number
  id?: string
}): Sale {
  saleCounter += 1

  const lines = overrides.lines ?? [testLine('P-1', overrides.total ?? 10000, 1)]
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const discountAmount = overrides.discountAmount ?? 0
  const total = overrides.total ?? subtotal - discountAmount
  const paymentMethod = overrides.paymentMethod ?? 'cash'
  const amountPaid =
    overrides.amountPaid ?? (paymentMethod === 'cash' ? total : 0)

  return {
    id: overrides.id ?? `SALE-T${saleCounter}`,
    saleNumber: `#20250521-${String(saleCounter).padStart(4, '0')}`,
    occurredAt: overrides.occurredAt,
    lines,
    subtotal,
    discountAmount,
    total,
    taxRate: overrides.taxRate ?? 0.12,
    paymentMethod,
    amountPaid,
    changeGiven: 0,
    balanceDue: overrides.balanceDue ?? (paymentMethod === 'cash' ? 0 : total - amountPaid),
    customerId: overrides.customerId ?? null,
    customerName: overrides.customerId ? `Customer ${overrides.customerId}` : 'Walk-in Customer',
    status: overrides.status ?? 'completed',
    recordedBy: 'Tester',
  }
}

export function testPayment(
  customerId: string,
  amount: number,
  occurredAt: string,
  id = `PAY-T${amount}-${occurredAt}`,
): CustomerPayment {
  return {
    id,
    customerId,
    customerName: `Customer ${customerId}`,
    amount,
    note: null,
    recordedBy: 'Tester',
    occurredAt,
  }
}

export function testMovement(
  overrides: Partial<StockMovement> & Pick<StockMovement, 'id' | 'occurredAt'>,
): StockMovement {
  return {
    productId: 'P-1',
    type: 'stock_in',
    quantityDelta: 1,
    reference: '',
    description: '',
    reason: null,
    recordedBy: 'Tester',
    ...overrides,
  }
}
