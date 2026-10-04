import type { Centavos } from '@/domain/money'

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type PaymentMethod = 'cash' | 'partial' | 'credit'
export type SaleStatus = 'completed' | 'cancelled'

export type MovementType = 'stock_in' | 'sale' | 'sale_reversal' | 'adjustment'

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  /** Exactly one selling unit per product (decision D2). */
  unit: string
  price: Centavos
  stock: number
  /** Stock at or below this level counts as low. */
  reorderLevel: number
  isActive: boolean
  imageUrl?: string
}

export type Customer = {
  id: string
  name: string
  phone?: string
}

/** What the cashier has scanned up so far. Quantities are whole units. */
export type CartLine = {
  productId: string
  quantity: number
}

/**
 * Product details are copied onto the line. A completed sale cannot be edited,
 * so it must stay a faithful record after a product is renamed or repriced.
 */
export type SaleLine = {
  productId: string
  productName: string
  sku: string
  unit: string
  unitPrice: Centavos
  quantity: number
  lineTotal: Centavos
}

export type Sale = {
  id: string
  /** "#20250521-0042" (E6). Supplier invoices use INV- instead. */
  saleNumber: string
  occurredAt: string
  lines: SaleLine[]
  subtotal: Centavos
  discountAmount: Centavos
  total: Centavos
  /** Stamped at write time so reports never recompute history (D1). */
  taxRate: number
  paymentMethod: PaymentMethod
  amountPaid: Centavos
  changeGiven: Centavos
  balanceDue: Centavos
  customerId: string | null
  customerName: string
  status: SaleStatus
  recordedBy: string
}

export type StockMovement = {
  id: string
  productId: string
  type: MovementType
  /** Signed: negative for a sale, positive for stock received. */
  quantityDelta: number
  reference: string
  /** Plain-language line for the movement log: "Sold to Pedro Santos". */
  description: string
  /** Required for an adjustment, null otherwise. */
  reason: string | null
  /** Free text the person receiving stock added, if any. */
  note?: string | null
  recordedBy: string
  occurredAt: string
}

/**
 * Money a customer hands over against their balance. It is not tied to one
 * sale: it reduces what the customer owes overall, and the ledger settles the
 * oldest charges first. Like a sale, it is never edited once recorded.
 */
export type CustomerPayment = {
  /** "PAY-00001". Also the reference shown on the ledger. */
  id: string
  customerId: string
  /** Copied so the record survives a later rename. */
  customerName: string
  amount: Centavos
  note: string | null
  recordedBy: string
  occurredAt: string
}

/** Editable in Settings. The VAT rate lives beside these as `taxRate`. */
export type StoreSettings = {
  storeName: string
  address: string
  phone: string
}

/** Outcome of a pure validation: a plain-language message when it fails. */
export type ValidationResult = {
  ok: boolean
  message: string | null
}
