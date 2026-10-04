import { create } from 'zustand'
import { persist, type StateStorage } from 'zustand/middleware'

import { normalizeCustomerName, validateNewCustomer } from '@/domain/customer'
import {
  buildHeldSale,
  HELD_SALE_MISSING_MESSAGE,
  HELD_SALE_UNSELLABLE_MESSAGE,
  HOLD_EMPTY_MESSAGE,
  normalizeHeldSaleLabel,
  reconcileCartWithStock,
  validateHold,
} from '@/domain/heldSale'
import { nextSequentialId } from '@/domain/ids'
import {
  isWholePositiveQuantity,
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
  mergeCartLines,
  nextSaleSequence,
  validatePayment,
} from '@/domain/sale'
import type { Centavos } from '@/domain/money'
import type {
  CartAdjustment,
  CartLine,
  Customer,
  CustomerPayment,
  HeldSale,
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
  inspectPersistedShop,
  runPersistedMigrations,
  saveUnreadableBackup,
  selectPersistedData,
  SHOP_STORAGE_KEY,
  SHOP_STORAGE_VERSION,
  type DataRecovery,
  type PersistedShopData,
} from '@/stores/shopPersistence'

export { DEFAULT_STORE_SETTINGS }
export type { DataRecovery }

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

export type HoldCartInput = {
  /** Optional, at most HELD_SALE_LABEL_MAX characters after trimming. Blank is no label. */
  label?: string
}

export type HoldCartResult = { ok: true; heldSale: HeldSale } | { ok: false; message: string }

/** `adjustments` lists every line that was reduced or removed on resume, in cart order. */
export type ResumeHeldSaleResult =
  { ok: true; adjustments: CartAdjustment[] } | { ok: false; message: string }

type ShopState = {
  products: Product[]
  customers: Customer[]
  sales: Sale[]
  movements: StockMovement[]
  /** The sale being built at the counter. */
  cart: CartLine[]
  /** Carts set aside with Hold Sale, oldest first. They reserve no stock (D6). */
  heldSales: HeldSale[]
  /** Payments against customer balances, oldest first. Never edited. */
  payments: CustomerPayment[]
  /** VAT rate for sales recorded from now on. Each sale keeps its own (D1). */
  taxRate: number
  settings: StoreSettings
  /**
   * Set when the saved data could not be loaded as it was: the app started
   * from the demo data ("reset") or dropped some records ("salvaged"). The
   * saved text was copied to `backupKey` first. Not saved; cleared by
   * dismissDataRecovery.
   */
  dataRecovery: DataRecovery | null

  addToCart: (productId: string, quantity: number) => ActionResult
  setCartQuantity: (productId: string, quantity: number) => ActionResult
  removeFromCart: (productId: string) => void
  clearCart: () => void
  holdCart: (input?: HoldCartInput) => HoldCartResult
  resumeHeldSale: (heldSaleId: string) => ResumeHeldSaleResult
  discardHeldSale: (heldSaleId: string) => ActionResult
  swapWithHeldSale: (heldSaleId: string, input?: HoldCartInput) => ResumeHeldSaleResult
  recordSale: (input: RecordSaleInput) => RecordSaleResult
  receiveStock: (input: ReceiveStockInput) => StockMovementResult
  adjustStock: (input: AdjustStockInput) => StockMovementResult
  recordPayment: (input: RecordPaymentInput) => RecordPaymentResult
  addCustomer: (input: AddCustomerInput) => AddCustomerResult
  updateSettings: (update: SettingsUpdate) => ActionResult
  /** Throws away everything recorded on this device and starts again from the demo data. */
  resetToSeedData: () => void
  /** Hides the data recovery notice. The backup copy stays where it is. */
  dismissDataRecovery: () => void
}

export type CreateShopStoreOptions = {
  /** Where the data is saved. Defaults to the browser's localStorage when there is one. */
  storage?: () => StateStorage | undefined
  /**
   * The store's clock: dates the seeded history (at creation and on reset) and
   * every record an action writes. Defaults to the real time.
   */
  now?: () => Date
}

/** Blank optional text is stored as null rather than as an empty string. */
function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''

  return trimmed === '' ? null : trimmed
}

const WHOLE_QUANTITY_MESSAGE = 'Enter a whole number of units greater than zero.'

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
  /** The raw text of the last read from storage, kept for a backup if it cannot be used. */
  let lastRead: string | null = null

  return create<ShopState>()(
    persist<ShopState, [], [], PersistedShopData>(
      (set, get) => ({
        ...buildSeedData(now()),
        dataRecovery: null,

        addToCart(productId, quantity) {
          if (!isWholePositiveQuantity(quantity)) {
            return { ok: false, message: WHOLE_QUANTITY_MESSAGE }
          }

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

          // Zero is how a stepper removes a line; anything else must be whole and positive.
          if (quantity === 0) {
            set({ cart: cart.filter((line) => line.productId !== productId) })

            return { ok: true, message: null }
          }

          if (!isWholePositiveQuantity(quantity)) {
            return { ok: false, message: WHOLE_QUANTITY_MESSAGE }
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

        holdCart(input = {}) {
          const { cart, heldSales, products } = get()
          const validation = validateHold({
            cartLineCount: cart.length,
            heldCount: heldSales.length,
            label: input.label,
          })

          if (!validation.ok) {
            return { ok: false, message: validation.message ?? 'This sale cannot be held.' }
          }

          const heldSale = buildHeldSale({
            cart,
            products,
            label: normalizeHeldSaleLabel(input.label),
            heldBy: CURRENT_USER.name,
            now: now(),
            existingIds: heldSales.map((held) => held.id),
          })

          // No stock movement and no stock change: a held sale reserves nothing (D6).
          set({ heldSales: [...heldSales, heldSale], cart: [] })

          return { ok: true, heldSale }
        },

        resumeHeldSale(heldSaleId) {
          const { cart, heldSales, products } = get()
          const held = heldSales.find((candidate) => candidate.id === heldSaleId)

          if (!held) {
            return { ok: false, message: HELD_SALE_MISSING_MESSAGE }
          }

          if (cart.length > 0) {
            return { ok: false, message: 'Finish or hold the current sale first.' }
          }

          const reconciled = reconcileCartWithStock(held.lines, products)

          // Kept, so the cashier can see what it was and discard it on purpose.
          if (reconciled.lines.length === 0) {
            return { ok: false, message: HELD_SALE_UNSELLABLE_MESSAGE }
          }

          set({
            cart: reconciled.lines,
            heldSales: heldSales.filter((candidate) => candidate.id !== heldSaleId),
          })

          return { ok: true, adjustments: reconciled.adjustments }
        },

        discardHeldSale(heldSaleId) {
          const { heldSales } = get()

          if (!heldSales.some((candidate) => candidate.id === heldSaleId)) {
            return { ok: false, message: HELD_SALE_MISSING_MESSAGE }
          }

          set({ heldSales: heldSales.filter((candidate) => candidate.id !== heldSaleId) })

          return { ok: true, message: 'Held sale discarded.' }
        },

        swapWithHeldSale(heldSaleId, input = {}) {
          const { cart, heldSales, products } = get()
          const held = heldSales.find((candidate) => candidate.id === heldSaleId)

          if (!held) {
            return { ok: false, message: HELD_SALE_MISSING_MESSAGE }
          }

          if (cart.length === 0) {
            return { ok: false, message: HOLD_EMPTY_MESSAGE }
          }

          // One in, one out: the limit does not apply, but the label rule does.
          const validation = validateHold({
            cartLineCount: cart.length,
            heldCount: 0,
            label: input.label,
          })

          if (!validation.ok) {
            return { ok: false, message: validation.message ?? 'This sale cannot be held.' }
          }

          const reconciled = reconcileCartWithStock(held.lines, products)

          if (reconciled.lines.length === 0) {
            return { ok: false, message: HELD_SALE_UNSELLABLE_MESSAGE }
          }

          const remaining = heldSales.filter((candidate) => candidate.id !== heldSaleId)
          const current = buildHeldSale({
            cart,
            products,
            label: normalizeHeldSaleLabel(input.label),
            heldBy: CURRENT_USER.name,
            now: now(),
            existingIds: heldSales.map((candidate) => candidate.id),
          })

          set({ heldSales: [...remaining, current], cart: reconciled.lines })

          return { ok: true, adjustments: reconciled.adjustments }
        },

        recordSale({ paymentMethod, amountPaid, customerId }) {
          const { products, customers, cart, sales, movements, taxRate } = get()

          const lines: SaleLine[] = []

          // One line per product, so the stock taken equals the movements written.
          for (const line of mergeCartLines(cart)) {
            if (!isWholePositiveQuantity(line.quantity)) {
              return { ok: false, message: WHOLE_QUANTITY_MESSAGE }
            }

            const product = products.find((candidate) => candidate.id === line.productId)

            if (!product) {
              return { ok: false, message: 'A product in this sale no longer exists.' }
            }

            // Inactive products cannot be sold (business rules), even from an old cart.
            if (!product.isActive) {
              return {
                ok: false,
                message: `${product.name} is no longer for sale. Remove it to continue.`,
              }
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

          const occurredAt = now()
          const sequence = nextSaleSequence(sales, occurredAt)
          const baseId = `SALE-${occurredAt.getTime()}`
          const id = sales.some((existing) => existing.id === baseId)
            ? `${baseId}-${sequence}`
            : baseId

          const customer = customers.find((candidate) => candidate.id === customerId) ?? null

          const sale: Sale = {
            id,
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
            occurredAt: now().toISOString(),
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
            occurredAt: now().toISOString(),
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
            occurredAt: now().toISOString(),
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

        dismissDataRecovery() {
          set({ dataRecovery: null })
        },
      }),
      {
        name: SHOP_STORAGE_KEY,
        version: SHOP_STORAGE_VERSION,
        storage: createSafeShopStorage(storage, {
          onRead: (raw) => {
            lastRead = raw
          },
        }),
        partialize: selectPersistedData,
        migrate: (persisted, version) =>
          // Only the steps here; `merge` checks the records. Unreadable data
          // resolves to null, which `merge` turns into the seed.
          runPersistedMigrations(persisted, version, now()) as unknown as PersistedShopData,
        merge: (persisted, current) => {
          const { data, dropped } = inspectPersistedShop(persisted, now())

          if (data && dropped.length === 0) {
            return { ...current, ...data }
          }

          // Nothing was saved: a first visit, not a problem.
          if (lastRead === null) {
            return current
          }

          // Zustand writes over the saved copy straight after this, so keep
          // the text exactly as it was read before anything replaces it.
          const at = now()
          const dataRecovery: DataRecovery = {
            outcome: data ? 'salvaged' : 'reset',
            backupKey: saveUnreadableBackup(storage(), lastRead, at),
            at: at.toISOString(),
            dropped,
          }

          return data ? { ...current, ...data, dataRecovery } : { ...current, dataRecovery }
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
