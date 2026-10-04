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

/** One line of a held sale. */
export type HeldSaleLine = {
  productId: string
  /** Whole units, more than zero (D2). */
  quantity: number
  /** Copied when the sale is held, so the list can show it. Never used to price the sale. */
  productName: string
  /** Copied when the sale is held. Used only to warn about a price change (Q5). */
  unitPrice: Centavos
}

/** A cart set aside with Hold Sale. Not a Sale: it records nothing and moves no stock. */
export type HeldSale = {
  /** "HOLD-1747801234567": the hold time in ms, plus "-2", "-3" on a clash. */
  id: string
  /** Optional words to find it again: "Pedro, fetching cash". Trimmed; blank is null. */
  label: string | null
  /** At least one line, in the order they were added to the cart. */
  lines: HeldSaleLine[]
  /** ISO 8601. */
  heldAt: string
  /** CURRENT_USER.name (D3). */
  heldBy: string
}

/** What changed when a held sale (or any cart) was checked against current stock. */
export type CartAdjustment =
  | { kind: 'removed_missing'; productId: string; productName: string; quantity: number }
  | { kind: 'removed_inactive'; productId: string; productName: string; quantity: number }
  | { kind: 'removed_out_of_stock'; productId: string; productName: string; quantity: number }
  | {
      kind: 'reduced'
      productId: string
      productName: string
      from: number
      to: number
      unit: string
    }
