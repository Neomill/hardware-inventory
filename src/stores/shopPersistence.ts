import { z } from 'zod'
import type { PersistStorage, StateStorage, StorageValue } from 'zustand/middleware'

import { SEED_CUSTOMERS } from '@/data/mock/customers'
import { SEED_PRODUCTS } from '@/data/mock/catalog'
import { buildSeedHistory } from '@/data/mock/seedSales'
import { HELD_SALE_LABEL_MAX, nextHeldSaleId, UNKNOWN_PRODUCT_NAME } from '@/domain/heldSale'
import { isWholePositiveQuantity, reconcileOpeningStock } from '@/domain/inventory'
import { mergeCartLines } from '@/domain/sale'
import { normalizeTaxRate, validateTaxRate } from '@/domain/settings'
import type {
  CartLine,
  Customer,
  CustomerPayment,
  HeldSale,
  HeldSaleLine,
  Product,
  Sale,
  SaleLine,
  StockMovement,
  StoreSettings,
} from '@/domain/types'
import { APP_NAME, CURRENT_USER, STORAGE_NAMESPACE, VAT_RATE } from '@/config/app'

/**
 * Phase 10 persistence (decision D5): the shop's data is kept in the browser's
 * localStorage so a refresh -- even mid-sale -- does not lose anything. Only
 * plain data is stored, never actions. IndexedDB is the later step if the data
 * outgrows localStorage.
 */

/** One key for the whole dataset, under the app's namespace. */
export const SHOP_STORAGE_KEY = `${STORAGE_NAMESPACE}:shop`

/**
 * Bump when the stored shape changes, and add a step to `MIGRATIONS` that
 * turns the previous version into the new one.
 */
export const SHOP_STORAGE_VERSION = 2

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: APP_NAME,
  address: '',
  phone: '',
}

/** Everything that is saved. Actions and derived values are not. */
export type PersistedShopData = {
  products: Product[]
  customers: Customer[]
  sales: Sale[]
  movements: StockMovement[]
  payments: CustomerPayment[]
  cart: CartLine[]
  /** Carts set aside with Hold Sale, oldest first (spec 03, D6). */
  heldSales: HeldSale[]
  taxRate: number
  settings: StoreSettings
}

export function selectPersistedData(state: PersistedShopData): PersistedShopData {
  return {
    products: state.products,
    customers: state.customers,
    sales: state.sales,
    movements: state.movements,
    payments: state.payments,
    cart: state.cart,
    heldSales: state.heldSales,
    taxRate: state.taxRate,
    settings: state.settings,
  }
}

/**
 * The demo dataset. History is placed relative to `now`, so a fresh seed always
 * shows sales from today and yesterday.
 */
export function buildSeedData(now: Date = new Date()): PersistedShopData {
  const history = buildSeedHistory(SEED_PRODUCTS, SEED_CUSTOMERS, VAT_RATE, now)

  return {
    products: SEED_PRODUCTS.map((product) => ({ ...product })),
    customers: SEED_CUSTOMERS.map((customer) => ({ ...customer })),
    sales: history.sales,
    movements: history.movements,
    payments: history.payments,
    cart: [],
    heldSales: [],
    taxRate: VAT_RATE,
    settings: { ...DEFAULT_STORE_SETTINGS },
  }
}

// ---------------------------------------------------------------------------
// Validation of what comes back from storage
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whole centavos (or whole units), never NaN or a fraction. */
const wholeNumber = z.number().refine(Number.isSafeInteger, 'Expected a whole number')
const nonNegative = wholeNumber.refine((value) => value >= 0, 'Expected zero or more')
const positive = wholeNumber.refine((value) => value > 0, 'Expected more than zero')
const timestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Expected a date')

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  category: z.string(),
  unit: z.string(),
  price: nonNegative,
  stock: nonNegative,
  reorderLevel: nonNegative,
  isActive: z.boolean(),
  imageUrl: z.string().optional(),
}) satisfies z.ZodType<Product>

const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().optional(),
}) satisfies z.ZodType<Customer>

const saleLineSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  sku: z.string(),
  unit: z.string(),
  unitPrice: nonNegative,
  quantity: positive,
  lineTotal: nonNegative,
}) satisfies z.ZodType<SaleLine>

const saleSchema = z.object({
  id: z.string(),
  saleNumber: z.string(),
  occurredAt: timestamp,
  lines: z.array(saleLineSchema).min(1),
  subtotal: nonNegative,
  discountAmount: nonNegative,
  total: nonNegative,
  taxRate: z.number().finite().min(0).max(1),
  paymentMethod: z.enum(['cash', 'partial', 'credit']),
  amountPaid: nonNegative,
  changeGiven: nonNegative,
  balanceDue: nonNegative,
  customerId: z.string().nullable(),
  customerName: z.string(),
  status: z.enum(['completed', 'cancelled']),
  recordedBy: z.string(),
}) satisfies z.ZodType<Sale>

const movementSchema = z.object({
  id: z.string(),
  productId: z.string(),
  type: z.enum(['stock_in', 'sale', 'sale_reversal', 'adjustment']),
  quantityDelta: wholeNumber,
  reference: z.string(),
  description: z.string(),
  reason: z.string().nullable(),
  note: z.string().nullable().optional(),
  recordedBy: z.string(),
  occurredAt: timestamp,
}) satisfies z.ZodType<StockMovement>

const paymentSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  amount: positive,
  note: z.string().nullable(),
  recordedBy: z.string(),
  occurredAt: timestamp,
}) satisfies z.ZodType<CustomerPayment>

/** Every record valid, or null: one bad record means the list cannot be trusted. */
function parseRecords<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown): T[] | null {
  const result = z.array(schema).safeParse(value)

  return result.success ? result.data : null
}

function isCartLine(value: unknown): value is CartLine {
  return (
    isRecord(value) &&
    typeof value.productId === 'string' &&
    typeof value.quantity === 'number' &&
    isWholePositiveQuantity(value.quantity)
  )
}

/** Well-formed lines for products that still exist, one line per product (repeats added together). */
function sanitizeCart(value: unknown, productIds: ReadonlySet<string>): CartLine[] {
  if (!Array.isArray(value)) {
    return []
  }

  return mergeCartLines(value.filter(isCartLine).filter((line) => productIds.has(line.productId)))
}

function isHeldSaleLine(value: unknown): value is HeldSaleLine {
  if (!isRecord(value) || !isCartLine(value)) {
    return false
  }

  const { productName, unitPrice } = value as Record<string, unknown>

  return (
    typeof productName === 'string' &&
    typeof unitPrice === 'number' &&
    Number.isSafeInteger(unitPrice) &&
    unitPrice >= 0
  )
}

/**
 * One held sale, or null when it cannot be trusted: it needs a string id, a
 * readable heldAt, a null or string label and at least one valid line. Bad
 * lines are dropped. Lines for products that no longer exist are kept --
 * resuming reports and removes them. A label over the limit is cut to it.
 */
function sanitizeHeldSale(value: unknown): HeldSale | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null
  }

  if (typeof value.heldAt !== 'string' || Number.isNaN(Date.parse(value.heldAt))) {
    return null
  }

  if (value.label !== null && value.label !== undefined && typeof value.label !== 'string') {
    return null
  }

  const lines = Array.isArray(value.lines) ? value.lines.filter(isHeldSaleLine) : []

  if (lines.length === 0) {
    return null
  }

  const label = typeof value.label === 'string' ? value.label.trim() : ''

  return {
    id: value.id,
    label: label === '' ? null : label.slice(0, HELD_SALE_LABEL_MAX),
    lines: lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      productName: line.productName,
      unitPrice: line.unitPrice,
    })),
    heldAt: value.heldAt,
    heldBy: typeof value.heldBy === 'string' ? value.heldBy : CURRENT_USER.name,
  }
}

/**
 * Held sales are checked one by one: a bad entry is dropped, the rest kept.
 * More than HELD_SALE_LIMIT are all kept; the limit only stops new holds.
 */
function sanitizeHeldSales(value: unknown): { kept: HeldSale[]; dropped: number } {
  if (!Array.isArray(value)) {
    return { kept: [], dropped: 0 }
  }

  const valid = value.map(sanitizeHeldSale).filter((held): held is HeldSale => held !== null)

  // Ids must be unique (resume and discard find a held sale by id). A repeat,
  // which only tampered storage can produce, keeps its data under a fresh id.
  const ids: string[] = []
  const kept = valid.map((held) => {
    const id = ids.includes(held.id) ? nextHeldSaleId(new Date(held.heldAt), ids) : held.id
    ids.push(id)

    return id === held.id ? held : { ...held, id }
  })

  return { kept, dropped: value.length - valid.length }
}

function sanitizeTaxRate(value: unknown): number {
  return typeof value === 'number' && validateTaxRate(value).ok ? normalizeTaxRate(value) : VAT_RATE
}

function sanitizeSettings(value: unknown): StoreSettings {
  const stored = isRecord(value) ? value : {}
  const text = (field: keyof StoreSettings) =>
    typeof stored[field] === 'string' ? (stored[field] as string) : DEFAULT_STORE_SETTINGS[field]

  const storeName = text('storeName').trim()

  return {
    storeName: storeName === '' ? DEFAULT_STORE_SETTINGS.storeName : storeName,
    address: text('address'),
    phone: text('phone'),
  }
}

/** Valid records and how many were not, or null when the value is not a list at all. */
function salvageRecords<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  value: unknown,
): { kept: T[]; dropped: number } | null {
  if (!Array.isArray(value)) {
    return null
  }

  const kept: T[] = []

  for (const item of value) {
    const result = schema.safeParse(item)

    if (result.success) {
      kept.push(result.data)
    }
  }

  return { kept, dropped: value.length - kept.length }
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export type PersistedShopInspection = {
  /** The data to load, or null when it cannot be trusted (start from the seed). */
  data: PersistedShopData | null
  /** Plain words for each kind of record that was dropped: "1 customer record". */
  dropped: string[]
}

/**
 * Checks a stored snapshot before it replaces the seed, salvaging what is safe
 * to salvage. Every record is checked field by field (a sale needs its lines,
 * money must be whole centavos, and so on). What happens to a bad record
 * depends on what else rests on it:
 *
 * - Sales, stock movements and customer payments: never dropped. Stock is the
 *   sum of the movements and a balance is charges minus payments, so losing
 *   one would silently change stock or what a customer owes. One bad record
 *   means the snapshot cannot be trusted: `data` is null.
 * - Products: a bad one is dropped only if no stock movement points at its
 *   id; otherwise stock could no longer be explained, and `data` is null.
 * - Customers: a bad one is dropped only if no sale or payment points at its
 *   id; otherwise their balance would have no owner, and `data` is null.
 * - Held sales: dropped one by one (they record nothing). Duplicate ids are
 *   renamed. Cart lines that are bad or point at a missing product are
 *   dropped and repeats merged. VAT rate and settings fall back to defaults.
 *   None of these is reported in `dropped` except held sales.
 *
 * Stock must equal the sum of each product's movements; data saved before
 * opening-stock movements existed is repaired with reconcileOpeningStock (a
 * no-op once consistent). `now` dates any correction that repair adds.
 */
export function inspectPersistedShop(
  value: unknown,
  now: Date = new Date(),
): PersistedShopInspection {
  const unreadable: PersistedShopInspection = { data: null, dropped: [] }

  if (!isRecord(value)) {
    return unreadable
  }

  const products = salvageRecords(productSchema, value.products)
  const customers = salvageRecords(customerSchema, value.customers)
  const sales = parseRecords(saleSchema, value.sales)
  const movements = parseRecords(movementSchema, value.movements)
  const payments = parseRecords(paymentSchema, value.payments === undefined ? [] : value.payments)

  if (!products || !customers || !sales || !movements || !payments) {
    return unreadable
  }

  const productIds = new Set(products.kept.map((product) => product.id))
  const customerIds = new Set(customers.kept.map((customer) => customer.id))

  // A dropped record is only safe to lose if nothing that must add up points at it.
  if (products.dropped > 0 && movements.some((movement) => !productIds.has(movement.productId))) {
    return unreadable
  }

  if (
    customers.dropped > 0 &&
    [...sales, ...payments].some(
      (record) => record.customerId !== null && !customerIds.has(record.customerId),
    )
  ) {
    return unreadable
  }

  const heldSales = sanitizeHeldSales(value.heldSales)
  const dropped = [
    products.dropped > 0 ? plural(products.dropped, 'product record') : null,
    customers.dropped > 0 ? plural(customers.dropped, 'customer record') : null,
    heldSales.dropped > 0 ? plural(heldSales.dropped, 'held sale') : null,
  ].filter((entry): entry is string => entry !== null)

  return {
    data: {
      products: products.kept,
      customers: customers.kept,
      sales,
      movements: reconcileOpeningStock({ products: products.kept, movements, sales, now }),
      payments,
      cart: sanitizeCart(value.cart, productIds),
      heldSales: heldSales.kept,
      taxRate: sanitizeTaxRate(value.taxRate),
      settings: sanitizeSettings(value.settings),
    },
    dropped,
  }
}

/** The data inspectPersistedShop would load, without the report of what it dropped. */
export function sanitizePersistedShop(
  value: unknown,
  now: Date = new Date(),
): PersistedShopData | null {
  return inspectPersistedShop(value, now).data
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

/**
 * Version 1 to 2 (spec 03 section 4.3): every non-empty held cart becomes a
 * HeldSale with no label, held by CURRENT_USER. The true hold time was never
 * stored, so heldAt is `now` minus one millisecond per position from the end,
 * which keeps the old order (newest last). Name and price are copied from the
 * product; a product that no longer exists gives "Unknown product" at 0, and
 * resuming removes that line. Malformed lines are skipped here and anything
 * else is left to the sanitizer. The heldCarts key is removed.
 */
export function migrateHeldCartsToHeldSales(
  state: Record<string, unknown>,
  now: Date = new Date(),
): Record<string, unknown> {
  const products = Array.isArray(state.products) ? state.products.filter(isRecord) : []
  const carts = Array.isArray(state.heldCarts) ? state.heldCarts : []

  const nonEmpty = carts
    .map((cart) => (Array.isArray(cart) ? cart.filter(isCartLine) : []))
    .filter((cart) => cart.length > 0)

  const heldSales: HeldSale[] = nonEmpty.map((cart, index) => {
    const heldAt = new Date(now.getTime() - (nonEmpty.length - 1 - index))

    return {
      id: `HOLD-${heldAt.getTime()}`,
      label: null,
      lines: cart.map((line) => {
        const product = products.find((candidate) => candidate.id === line.productId)
        const price = product?.price

        return {
          productId: line.productId,
          quantity: line.quantity,
          productName: typeof product?.name === 'string' ? product.name : UNKNOWN_PRODUCT_NAME,
          unitPrice:
            product && typeof price === 'number' && Number.isSafeInteger(price) && price >= 0
              ? price
              : 0,
        }
      }),
      heldAt: heldAt.toISOString(),
      heldBy: CURRENT_USER.name,
    }
  })

  const { heldCarts: _dropped, ...rest } = state
  void _dropped

  return { ...rest, heldSales }
}

/**
 * `MIGRATIONS[n]` upgrades a version-n snapshot to version n + 1. Version 0 is
 * what zustand reports for a snapshot saved without a version: treated as the
 * first shape, which may lack the later additions (payments, held carts,
 * settings) -- the sanitizer fills those in. Version 0 runs through every
 * later step too.
 */
const MIGRATIONS: Record<
  number,
  (state: Record<string, unknown>, now: Date) => Record<string, unknown>
> = {
  0: (state) => ({
    ...state,
    payments: state.payments ?? [],
    heldCarts: state.heldCarts ?? [],
    settings: state.settings ?? DEFAULT_STORE_SETTINGS,
  }),
  1: (state, now) => migrateHeldCartsToHeldSales(state, now),
}

/**
 * Runs the migration steps from `fromVersion` up to the current version,
 * without checking the records (inspectPersistedShop does that). Null when the
 * snapshot is not an object or no step exists for its version. `now` is the
 * store's clock, used where a step has to invent a time.
 */
export function runPersistedMigrations(
  value: unknown,
  fromVersion: number,
  now: Date = new Date(),
): Record<string, unknown> | null {
  if (!isRecord(value) || !Number.isInteger(fromVersion) || fromVersion < 0) {
    return null
  }

  let state: Record<string, unknown> = value

  for (let version = fromVersion; version < SHOP_STORAGE_VERSION; version += 1) {
    const step = MIGRATIONS[version]

    if (!step) {
      return null
    }

    state = step(state, now)
  }

  return state
}

/**
 * Brings a stored snapshot up to the current version and checks it. Returns
 * null when it cannot be read (the seed is used instead). A snapshot from a
 * newer version of the app is only kept if it still passes the current checks.
 */
export function migratePersistedShop(
  value: unknown,
  fromVersion: number,
  now: Date = new Date(),
): PersistedShopData | null {
  const state = runPersistedMigrations(value, fromVersion, now)

  return state ? sanitizePersistedShop(state, now) : null
}

// ---------------------------------------------------------------------------
// Recovery: never lose what could not be loaded
// ---------------------------------------------------------------------------

/**
 * Shown once after a load that could not use the saved data as it was:
 * "reset" when the app started from the demo data, "salvaged" when some
 * records were dropped and the rest loaded. Not saved: it describes this load.
 */
export type DataRecovery = {
  outcome: 'reset' | 'salvaged'
  /** Where the untouched saved text was copied, or null if it could not be written. */
  backupKey: string | null
  /** ISO 8601, when the problem was found. */
  at: string
  /** What was dropped, in words. Empty for a reset. */
  dropped: string[]
}

/** "olaer-store:shop:unreadable-1747801234567": the time the copy was made, in ms. */
export function unreadableBackupKey(at: Date): string {
  return `${SHOP_STORAGE_KEY}:unreadable-${at.getTime()}`
}

/**
 * Copies the saved text, exactly as it was read, to its own key before the
 * app replaces it. Returns the key, or null when it could not be written (no
 * storage, full or blocked). Never throws.
 */
export function saveUnreadableBackup(
  backend: StateStorage | undefined,
  raw: string,
  at: Date,
): string | null {
  if (!backend) {
    return null
  }

  const key = unreadableBackupKey(at)

  try {
    backend.setItem(key, raw)

    return key
  } catch (error) {
    console.warn(`[${STORAGE_NAMESPACE}] Could not keep a copy of the unreadable data.`, error)

    return null
  }
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** The browser's localStorage, or undefined when there is none or it is blocked. */
export function getBrowserStorage(): StateStorage | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return undefined
    }

    return window.localStorage
  } catch {
    // Some privacy modes throw on the mere access.
    return undefined
  }
}

/** True when data can actually be written on this device right now. */
export function isDeviceStorageAvailable(
  backend: StateStorage | undefined = getBrowserStorage(),
): boolean {
  if (!backend) {
    return false
  }

  const probe = `${STORAGE_NAMESPACE}:probe`

  try {
    backend.setItem(probe, '1')
    backend.removeItem(probe)

    return true
  } catch {
    return false
  }
}

/** A plain in-memory storage, for tests and as a stand-in when the browser has none. */
export function createMemoryStorage(initial: Record<string, string> = {}): StateStorage & {
  dump: () => Record<string, string>
} {
  const items = new Map(Object.entries(initial))

  return {
    getItem: (name) => items.get(name) ?? null,
    setItem: (name, value) => {
      items.set(name, value)
    },
    removeItem: (name) => {
      items.delete(name)
    },
    dump: () => Object.fromEntries(items),
  }
}

/**
 * JSON storage that never throws into the app. Unreadable or corrupt data reads
 * as "nothing saved" (the store then keeps a copy, see saveUnreadableBackup,
 * and starts from the seed); a failed write (full or blocked
 * storage) is reported in the console and the app keeps working from memory.
 */
export function createSafeShopStorage(
  getBackend: () => StateStorage | undefined = getBrowserStorage,
  options: {
    /** Told the raw text of every read (null when nothing is saved), before it is parsed. */
    onRead?: (raw: string | null) => void
  } = {},
): PersistStorage<PersistedShopData> {
  return {
    getItem(name) {
      try {
        const stored = getBackend()?.getItem(name)
        const raw = typeof stored === 'string' ? stored : null

        options.onRead?.(raw)

        if (raw === null) {
          return null
        }

        const parsed: unknown = JSON.parse(raw)

        if (!isRecord(parsed) || !('state' in parsed)) {
          return null
        }

        return {
          state: parsed.state as PersistedShopData,
          version: typeof parsed.version === 'number' ? parsed.version : 0,
        }
      } catch {
        return null
      }
    },
    setItem(name, value: StorageValue<PersistedShopData>) {
      try {
        getBackend()?.setItem(name, JSON.stringify(value))
      } catch (error) {
        console.warn(`[${STORAGE_NAMESPACE}] Could not save data on this device.`, error)
      }
    },
    removeItem(name) {
      try {
        getBackend()?.removeItem(name)
      } catch {
        // Nothing to do: there is no saved copy to remove.
      }
    },
  }
}
