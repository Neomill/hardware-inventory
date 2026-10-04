import { create } from 'zustand'
import { persist, type StateStorage } from 'zustand/middleware'

import { normalizeCustomerName, validateNewCustomer } from '@/domain/customer'
import { nextSequentialId } from '@/domain/ids'
import {
  normalizeSupplierInvoice,
  validateStockAdjustment,
  validateStockReceipt,
} from '@/domain/inventory'
import { computeOutstanding, validateCustomerPayment } from '@/domain/ledger'
import { normalizeTaxRate, validateSettingsUpdate, type SettingsUpdate } from '@/domain/settings'
import {
  computeBalanceDue,
  computeChange,
  computeSaleTotals,
  formatSaleNumber,
  validatePayment,
} from '@/domain/sale'
import type { Centavos } from '@/domain/money'
import type {
  CartLine,
  Customer,
  CustomerPayment,
  PaymentMethod,
  Product,
  Sale,
  SaleLine,
  StockMovement,
  StoreSettings,
} from '@/domain/types'
import { CURRENT_USER } from '@/config/app'
import {
  buildSeedData,
  createSafeShopStorage,
  DEFAULT_STORE_SETTINGS,
  getBrowserStorage,
  migratePersistedShop,
  sanitizePersistedShop,
  selectPersistedData,
  SHOP_STORAGE_KEY,
  SHOP_STORAGE_VERSION,
  type PersistedShopData,
} from '@/stores/shopPersistence'

export { DEFAULT_STORE_SETTINGS }

export type ActionResult = {
  ok: boolean
  message: string | null
}

export type RecordSaleInput = {
  paymentMethod: PaymentMethod
  amountPaid: Centavos
  customerId: string | null
}

export type RecordSaleResult = { ok: true; sale: Sale } | { ok: false; message: string }

export type ReceiveStockInput = {
  productId: string
  /** Whole units, more than zero. */
  quantity: number
  /** "INV-10021" (E6). Case and surrounding spaces are forgiven. */
  supplierInvoice?: string
  supplier?: string
  note?: string
}

export type AdjustStockInput = {
  productId: string
  /** Signed whole units: -2 for two damaged, +5 for a recount that found five. */
  quantityDelta: number
  reason: string
}

export type StockMovementResult =
  { ok: true; movement: StockMovement } | { ok: false; message: string }

export type RecordPaymentInput = {
  customerId: string
  amount: Centavos
  note?: string
}

export type RecordPaymentResult =
  { ok: true; payment: CustomerPayment } | { ok: false; message: string }

export type AddCustomerInput = {
  name: string
  phone?: string
}

export type AddCustomerResult = { ok: true; customer: Customer } | { ok: false; message: string }

type ShopState = {
  products: Product[]
  customers: Customer[]
  sales: Sale[]
  movements: StockMovement[]
  /** The sale being built at the counter. */
  cart: CartLine[]
  /** Carts parked with Hold Sale, newest last. */
  heldCarts: CartLine[][]
  /** Payments against customer balances, oldest first. Never edited. */
  payments: CustomerPayment[]
  /** VAT rate for sales recorded from now on. Each sale keeps its own (D1). */
  taxRate: number
  settings: StoreSettings

  addToCart: (productId: string, quantity: number) => ActionResult
  setCartQuantity: (productId: string, quantity: number) => ActionResult
  removeFromCart: (productId: string) => void
  clearCart: () => void
  holdCart: () => ActionResult
  resumeHeldCart: () => ActionResult
  recordSale: (input: RecordSaleInput) => RecordSaleResult
  receiveStock: (input: ReceiveStockInput) => StockMovementResult
  adjustStock: (input: AdjustStockInput) => StockMovementResult
  recordPayment: (input: RecordPaymentInput) => RecordPaymentResult
  addCustomer: (input: AddCustomerInput) => AddCustomerResult
  updateSettings: (update: SettingsUpdate) => ActionResult
  /** Throws away everything recorded on this device and starts again from the demo data. */
  resetToSeedData: () => void
}

export type CreateShopStoreOptions = {
  /** Where the data is saved. Defaults to the browser's localStorage when there is one. */
  storage?: () => StateStorage | undefined
  /** Clock for the seeded history. Defaults to the moment the store is created. */
  now?: () => Date
}

/** Blank optional text is stored as null rather than as an empty string. */
function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''

  return trimmed === '' ? null : trimmed
}

function toSaleLine(product: Product, quantity: number): SaleLine {
  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    unit: product.unit,
    unitPrice: product.price,
    quantity,
    lineTotal: product.price * quantity,
  }
}

/**
 * Builds the shop store. The app uses the single `useShopStore` below; tests
 * build their own with in-memory storage.
 */
export function createShopStore({
  storage = getBrowserStorage,
  now = () => new Date(),
}: CreateShopStoreOptions = {}) {
  return create<ShopState>()(
    persist<ShopState, [], [], PersistedShopData>(
      (set, get) => ({
        ...buildSeedData(now()),

        addToCart(productId, quantity) {
          const { products, cart } = get()
          const product = products.find((candidate) => candidate.id === productId)

          if (!product) {
            return { ok: false, message: 'That product no longer exists.' }
          }

          if (!product.isActive) {
            return { ok: false, message: `${product.name} is not available for sale.` }
          }

          if (product.stock <= 0) {
            return { ok: false, message: `${product.name} is out of stock.` }
          }

          const existing = cart.find((line) => line.productId === productId)
          const requested = (existing?.quantity ?? 0) + quantity

          if (requested > product.stock) {
            return {
              ok: false,
              message: `Only ${product.stock} ${product.unit} of ${product.name} left in stock.`,
            }
          }

          set({
            cart: existing
              ? cart.map((line) =>
                  line.productId === productId ? { ...line, quantity: requested } : line,
                )
              : [...cart, { productId, quantity }],
          })

          return { ok: true, message: null }
        },

        setCartQuantity(productId, quantity) {
          const { products, cart } = get()

          if (quantity <= 0) {
            set({ cart: cart.filter((line) => line.productId !== productId) })

            return { ok: true, message: null }
          }

          const product = products.find((candidate) => candidate.id === productId)

          if (product && quantity > product.stock) {
            return {
              ok: false,
              message: `Only ${product.stock} ${product.unit} of ${product.name} left in stock.`,
            }
          }

          set({
            cart: cart.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
          })

          return { ok: true, message: null }
        },

        removeFromCart(productId) {
          set({ cart: get().cart.filter((line) => line.productId !== productId) })
        },

        clearCart() {
          set({ cart: [] })
        },

        holdCart() {
          const { cart, heldCarts } = get()

          if (cart.length === 0) {
            return { ok: false, message: 'There is nothing to hold yet.' }
          }

          set({ heldCarts: [...heldCarts, cart], cart: [] })

          return { ok: true, message: 'Sale held. Resume it from the Sales screen.' }
        },

        resumeHeldCart() {
          const { cart, heldCarts } = get()

          if (heldCarts.length === 0) {
            return { ok: false, message: 'There are no held sales.' }
          }

          if (cart.length > 0) {
            return { ok: false, message: 'Finish or hold the current sale first.' }
          }

          const resumed = heldCarts[heldCarts.length - 1]

          set({ cart: resumed, heldCarts: heldCarts.slice(0, -1) })

          return { ok: true, message: null }
        },

        recordSale({ paymentMethod, amountPaid, customerId }) {
          const { products, customers, cart, sales, movements, taxRate } = get()

          const lines: SaleLine[] = []

          for (const line of cart) {
            const product = products.find((candidate) => candidate.id === line.productId)

            if (!product) {
              return { ok: false, message: 'A product in this sale no longer exists.' }
            }

            // Stock is checked again here, not only when the item was added.
            if (line.quantity > product.stock) {
              return {
                ok: false,
                message: `Only ${product.stock} ${product.unit} of ${product.name} left in stock.`,
              }
            }

            lines.push(toSaleLine(product, line.quantity))
          }

          const totals = computeSaleTotals(lines, 0, taxRate)
          const validation = validatePayment({
            method: paymentMethod,
            total: totals.total,
            amountPaid,
            customerId,
            lineCount: lines.length,
          })

          if (!validation.ok) {
            return { ok: false, message: validation.message ?? 'This sale cannot be completed.' }
          }

          const occurredAt = new Date()
          const dayKey = occurredAt.toDateString()
          const sequence =
            sales.filter((sale) => new Date(sale.occurredAt).toDateString() === dayKey).length + 1

          const customer = customers.find((candidate) => candidate.id === customerId) ?? null

          const sale: Sale = {
            id: `SALE-${occurredAt.getTime()}`,
            saleNumber: formatSaleNumber(occurredAt, sequence),
            occurredAt: occurredAt.toISOString(),
            lines,
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            total: totals.total,
            taxRate,
            paymentMethod,
            amountPaid,
            changeGiven: computeChange(totals.total, paymentMethod === 'cash' ? amountPaid : 0),
            balanceDue: computeBalanceDue(paymentMethod, totals.total, amountPaid),
            customerId: customer?.id ?? null,
            customerName: customer?.name ?? 'Walk-in Customer',
            status: 'completed',
            recordedBy: CURRENT_USER.name,
          }

          const saleMovements: StockMovement[] = lines.map((line) => ({
            id: `MOV-${sale.id}-${line.productId}`,
            productId: line.productId,
            type: 'sale',
            quantityDelta: -line.quantity,
            reference: sale.saleNumber,
            description: `Sold to ${sale.customerName}`,
            reason: null,
            recordedBy: sale.recordedBy,
            occurredAt: sale.occurredAt,
          }))

          // One update: the sale, its stock movements, the reduced stock, empty cart.
          set({
            sales: [...sales, sale],
            movements: [...movements, ...saleMovements],
            products: products.map((product) => {
              const sold = lines.find((line) => line.productId === product.id)

              return sold ? { ...product, stock: product.stock - sold.quantity } : product
            }),
            cart: [],
          })

          return { ok: true, sale }
        },

        receiveStock({ productId, quantity, supplierInvoice, supplier, note }) {
          const { products, movements } = get()
          const product = products.find((candidate) => candidate.id === productId)

          if (!product) {
            return { ok: false, message: 'That product no longer exists.' }
          }

          const validation = validateStockReceipt({ quantity, supplierInvoice })

          if (!validation.ok) {
            return { ok: false, message: validation.message ?? 'This delivery cannot be recorded.' }
          }

          const invoice = supplierInvoice ? normalizeSupplierInvoice(supplierInvoice) : null
          const supplierName = optionalText(supplier)

          const movement: StockMovement = {
            id: nextSequentialId(
              'MOV-IN-',
              movements.map((existing) => existing.id),
              5,
            ),
            productId,
            type: 'stock_in',
            quantityDelta: quantity,
            // Blank when a delivery came without an invoice.
            reference: invoice ?? '',
            description: supplierName ? `Received from ${supplierName}` : 'Stock received',
            reason: null,
            note: optionalText(note),
            recordedBy: CURRENT_USER.name,
            occurredAt: new Date().toISOString(),
          }

          // Stock only ever moves together with the movement that explains it.
          set({
            movements: [...movements, movement],
            products: products.map((candidate) =>
              candidate.id === productId
                ? { ...candidate, stock: candidate.stock + quantity }
                : candidate,
            ),
          })

          return { ok: true, movement }
        },

        adjustStock({ productId, quantityDelta, reason }) {
          const { products, movements } = get()
          const product = products.find((candidate) => candidate.id === productId)

          if (!product) {
            return { ok: false, message: 'That product no longer exists.' }
          }

          const validation = validateStockAdjustment({
            currentStock: product.stock,
            quantityDelta,
            reason,
          })

          if (!validation.ok) {
            return {
              ok: false,
              message: validation.message ?? 'This adjustment cannot be recorded.',
            }
          }

          const reference = nextSequentialId(
            'ADJ-',
            movements.map((existing) => existing.reference),
            5,
          )
          const statedReason = reason.trim()

          const movement: StockMovement = {
            id: `MOV-${reference}`,
            productId,
            type: 'adjustment',
            quantityDelta,
            reference,
            description: `Adjusted: ${statedReason}`,
            reason: statedReason,
            note: null,
            recordedBy: CURRENT_USER.name,
            occurredAt: new Date().toISOString(),
          }

          set({
            movements: [...movements, movement],
            products: products.map((candidate) =>
              candidate.id === productId
                ? { ...candidate, stock: candidate.stock + quantityDelta }
                : candidate,
            ),
          })

          return { ok: true, movement }
        },

        recordPayment({ customerId, amount, note }) {
          const { customers, sales, payments } = get()
          const customer = customers.find((candidate) => candidate.id === customerId)

          if (!customer) {
            return { ok: false, message: 'Choose a customer.' }
          }

          const validation = validateCustomerPayment({
            amount,
            outstanding: computeOutstanding(sales, payments, customerId),
          })

          if (!validation.ok) {
            return { ok: false, message: validation.message ?? 'This payment cannot be recorded.' }
          }

          const payment: CustomerPayment = {
            id: nextSequentialId(
              'PAY-',
              payments.map((existing) => existing.id),
              5,
            ),
            customerId,
            customerName: customer.name,
            amount,
            note: optionalText(note),
            recordedBy: CURRENT_USER.name,
            occurredAt: new Date().toISOString(),
          }

          set({ payments: [...payments, payment] })

          return { ok: true, payment }
        },

        addCustomer({ name, phone }) {
          const { customers } = get()
          const validation = validateNewCustomer({ name, phone }, customers)

          if (!validation.ok) {
            return { ok: false, message: validation.message ?? 'This customer cannot be added.' }
          }

          const trimmedPhone = optionalText(phone)
          const customer: Customer = {
            id: nextSequentialId(
              'CUS-',
              customers.map((existing) => existing.id),
              3,
            ),
            name: normalizeCustomerName(name),
            ...(trimmedPhone ? { phone: trimmedPhone } : {}),
          }

          set({ customers: [...customers, customer] })

          return { ok: true, customer }
        },

        updateSettings(update) {
          const validation = validateSettingsUpdate(update)

          if (!validation.ok) {
            return { ok: false, message: validation.message ?? 'These settings cannot be saved.' }
          }

          const { settings, taxRate } = get()

          // Only sales recorded from here on pick up a new rate. Past sales keep the
          // rate stamped on them (D1), so nothing else is touched.
          set({
            settings: {
              storeName: update.storeName?.trim() ?? settings.storeName,
              address: update.address?.trim() ?? settings.address,
              phone: update.phone?.trim() ?? settings.phone,
            },
            taxRate: update.taxRate === undefined ? taxRate : normalizeTaxRate(update.taxRate),
          })

          return { ok: true, message: 'Settings saved.' }
        },

        resetToSeedData() {
          // A fresh seed, dated from now, so the demo shows today's sales again.
          set(buildSeedData(now()))
        },
      }),
      {
        name: SHOP_STORAGE_KEY,
        version: SHOP_STORAGE_VERSION,
        storage: createSafeShopStorage(storage),
        partialize: selectPersistedData,
        migrate: (persisted, version) =>
          // Unreadable data resolves to null, which `merge` turns into the seed.
          migratePersistedShop(persisted, version) as PersistedShopData,
        merge: (persisted, current) => {
          const data = sanitizePersistedShop(persisted)

          return data ? { ...current, ...data } : current
        },
      },
    ),
  )
}

/**
 * Single source of truth for the prototype. Everything the screens display
 * comes from here, so a sale made at the counter is immediately visible in the
 * product list, the dashboard and the sales history.
 *
 * Saved on this device (Phase 10, decision D5): a refresh keeps every record,
 * the cart and held sales. A first visit, or unreadable saved data, starts
 * from the seeded demo data.
 */
export const useShopStore = createShopStore()
