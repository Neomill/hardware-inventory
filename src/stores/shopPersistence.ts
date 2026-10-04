import type { PersistStorage, StateStorage, StorageValue } from 'zustand/middleware'

import { SEED_CUSTOMERS } from '@/data/mock/customers'
import { SEED_PRODUCTS } from '@/data/mock/catalog'
import { buildSeedHistory } from '@/data/mock/seedSales'
import { normalizeTaxRate, validateTaxRate } from '@/domain/settings'
import type {
  CartLine,
  Customer,
  CustomerPayment,
  Product,
  Sale,
  StockMovement,
  StoreSettings,
} from '@/domain/types'
import { APP_NAME, STORAGE_NAMESPACE, VAT_RATE } from '@/config/app'

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
export const SHOP_STORAGE_VERSION = 1

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
  heldCarts: CartLine[][]
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
    heldCarts: state.heldCarts,
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
    heldCarts: [],
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

/** A list of records that each carry a string id. Anything else is not trusted. */
function isRecordList<T>(value: unknown): value is T[] {
  return (
    Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === 'string')
  )
}

function isCartLine(value: unknown): value is CartLine {
  return (
    isRecord(value) &&
    typeof value.productId === 'string' &&
    typeof value.quantity === 'number' &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0
  )
}

function sanitizeCart(value: unknown): CartLine[] {
  return Array.isArray(value) ? value.filter(isCartLine).map((line) => ({ ...line })) : []
}

function sanitizeHeldCarts(value: unknown): CartLine[][] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(sanitizeCart).filter((cart) => cart.length > 0)
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

/**
 * Checks a stored snapshot before it replaces the seed. The record lists must
 * all be present and well formed -- mixing half a stored dataset with half the
 * seed would produce stock and balances that do not add up -- so any doubt
 * there returns null and the app starts from the seed. The small fields (cart,
 * VAT rate, settings) fall back to defaults one by one.
 */
export function sanitizePersistedShop(value: unknown): PersistedShopData | null {
  if (!isRecord(value)) {
    return null
  }

  const { products, customers, sales, movements } = value

  if (
    !isRecordList<Product>(products) ||
    !isRecordList<Customer>(customers) ||
    !isRecordList<Sale>(sales) ||
    !isRecordList<StockMovement>(movements)
  ) {
    return null
  }

  const payments = value.payments === undefined ? [] : value.payments

  if (!isRecordList<CustomerPayment>(payments)) {
    return null
  }

  return {
    products,
    customers,
    sales,
    movements,
    payments,
    cart: sanitizeCart(value.cart),
    heldCarts: sanitizeHeldCarts(value.heldCarts),
    taxRate: sanitizeTaxRate(value.taxRate),
    settings: sanitizeSettings(value.settings),
  }
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

/**
 * `MIGRATIONS[n]` upgrades a version-n snapshot to version n + 1. Version 0 is
 * what zustand reports for a snapshot saved without a version: treated as the
 * first shape, which may lack the later additions (payments, held carts,
 * settings) -- the sanitizer fills those in.
 */
const MIGRATIONS: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {
  0: (state) => ({
    ...state,
    payments: state.payments ?? [],
    heldCarts: state.heldCarts ?? [],
    settings: state.settings ?? DEFAULT_STORE_SETTINGS,
  }),
}

/**
 * Brings a stored snapshot up to the current version. Returns null when it
 * cannot be read (the seed is used instead). A snapshot from a newer version
 * of the app is only kept if it still passes the current checks.
 */
export function migratePersistedShop(
  value: unknown,
  fromVersion: number,
): PersistedShopData | null {
  if (!isRecord(value) || !Number.isInteger(fromVersion) || fromVersion < 0) {
    return null
  }

  let state: Record<string, unknown> = value

  for (let version = fromVersion; version < SHOP_STORAGE_VERSION; version += 1) {
    const step = MIGRATIONS[version]

    if (!step) {
      return null
    }

    state = step(state)
  }

  return sanitizePersistedShop(state)
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
 * as "nothing saved" (the seed is used); a failed write (full or blocked
 * storage) is reported in the console and the app keeps working from memory.
 */
export function createSafeShopStorage(
  getBackend: () => StateStorage | undefined = getBrowserStorage,
): PersistStorage<PersistedShopData> {
  return {
    getItem(name) {
      try {
        const raw = getBackend()?.getItem(name)

        if (typeof raw !== 'string') {
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
