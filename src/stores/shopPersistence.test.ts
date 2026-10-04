import { describe, expect, it, vi } from 'vitest'

import { SEED_PRODUCTS } from '@/data/mock/catalog'
import {
  buildSeedData,
  createMemoryStorage,
  createSafeShopStorage,
  DEFAULT_STORE_SETTINGS,
  isDeviceStorageAvailable,
  migratePersistedShop,
  sanitizePersistedShop,
  SHOP_STORAGE_KEY,
  SHOP_STORAGE_VERSION,
} from '@/stores/shopPersistence'
import { createShopStore, useShopStore } from '@/stores/useShopStore'

const PVC = 'PVC-050'

function saved(storage: ReturnType<typeof createMemoryStorage>) {
  const raw = storage.dump()[SHOP_STORAGE_KEY]

  return raw ? JSON.parse(raw) : null
}

function stockOf(store: ReturnType<typeof createShopStore>, productId: string) {
  return store.getState().products.find((product) => product.id === productId)?.stock
}

describe('shop persistence', () => {
  it('uses a namespaced, versioned key', () => {
    expect(SHOP_STORAGE_KEY).toBe('olaer-store:shop')
    expect(SHOP_STORAGE_VERSION).toBe(1)
  })

  it('starts from the seed when nothing is saved', () => {
    const storage = createMemoryStorage()
    const store = createShopStore({ storage: () => storage })

    expect(store.getState().sales.length).toBeGreaterThan(0)
    expect(store.getState().cart).toEqual([])
    expect(store.getState().settings).toEqual(DEFAULT_STORE_SETTINGS)
  })

  it('saves data fields only, including the cart and held carts', () => {
    const storage = createMemoryStorage()
    const store = createShopStore({ storage: () => storage })

    store.getState().addToCart(PVC, 3)
    store.getState().holdCart()
    store.getState().addToCart(PVC, 1)

    const snapshot = saved(storage)

    expect(snapshot.version).toBe(SHOP_STORAGE_VERSION)
    expect(snapshot.state.cart).toEqual([{ productId: PVC, quantity: 1 }])
    expect(snapshot.state.heldCarts).toEqual([[{ productId: PVC, quantity: 3 }]])
    expect(Object.keys(snapshot.state).sort()).toEqual(
      [
        'cart',
        'customers',
        'heldCarts',
        'movements',
        'payments',
        'products',
        'sales',
        'settings',
        'taxRate',
      ].sort(),
    )
  })

  it('restores everything after a reload, mid-sale included', () => {
    const storage = createMemoryStorage()
    const first = createShopStore({ storage: () => storage })

    first.getState().addToCart(PVC, 2)
    first.getState().recordSale({ paymentMethod: 'cash', amountPaid: 1_000_000, customerId: null })
    first.getState().addToCart(PVC, 5)
    first.getState().updateSettings({ storeName: 'Olaer Hardware', taxRate: 0.1 })

    const reloaded = createShopStore({ storage: () => storage })
    const state = reloaded.getState()

    expect(state.sales).toHaveLength(first.getState().sales.length)
    expect(stockOf(reloaded, PVC)).toBe(stockOf(first, PVC))
    expect(state.cart).toEqual([{ productId: PVC, quantity: 5 }])
    expect(state.settings.storeName).toBe('Olaer Hardware')
    expect(state.taxRate).toBe(0.1)
    // Actions survive the merge.
    expect(typeof state.addToCart).toBe('function')
  })

  it('falls back to the seed when the saved data is corrupt', () => {
    const storage = createMemoryStorage({ [SHOP_STORAGE_KEY]: '{not json' })
    const store = createShopStore({ storage: () => storage })

    expect(store.getState().products).toHaveLength(SEED_PRODUCTS.length)
    expect(store.getState().sales.length).toBeGreaterThan(0)
  })

  it('falls back to the seed when the saved shape is wrong', () => {
    const storage = createMemoryStorage({
      [SHOP_STORAGE_KEY]: JSON.stringify({
        state: { products: 'nope', sales: [] },
        version: SHOP_STORAGE_VERSION,
      }),
    })
    const store = createShopStore({ storage: () => storage })

    expect(store.getState().products).toHaveLength(SEED_PRODUCTS.length)
  })

  it('keeps working when storage is unavailable or throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    }

    const store = createShopStore({ storage: () => broken })

    expect(store.getState().products).toHaveLength(SEED_PRODUCTS.length)
    expect(store.getState().addToCart(PVC, 1).ok).toBe(true)
    expect(store.getState().cart).toHaveLength(1)
    expect(isDeviceStorageAvailable(broken)).toBe(false)

    const missing = createShopStore({ storage: () => undefined })

    expect(missing.getState().addToCart(PVC, 1).ok).toBe(true)
    expect(isDeviceStorageAvailable(undefined)).toBe(false)

    warn.mockRestore()
  })

  it('the app store does not persist under the test runner (no window)', () => {
    expect(isDeviceStorageAvailable()).toBe(false)
    expect(typeof useShopStore.persist.getOptions().name).toBe('string')
  })
})

describe('migratePersistedShop', () => {
  it('upgrades an unversioned snapshot, filling in later fields', () => {
    const seed = buildSeedData(new Date('2025-05-21T10:00:00'))
    const legacy = {
      products: seed.products,
      customers: seed.customers,
      sales: seed.sales,
      movements: seed.movements,
      cart: [{ productId: PVC, quantity: 2 }],
    }

    const migrated = migratePersistedShop(legacy, 0)

    expect(migrated).not.toBeNull()
    expect(migrated?.payments).toEqual([])
    expect(migrated?.heldCarts).toEqual([])
    expect(migrated?.settings).toEqual(DEFAULT_STORE_SETTINGS)
    expect(migrated?.taxRate).toBe(0.12)
    expect(migrated?.cart).toEqual([{ productId: PVC, quantity: 2 }])
  })

  it('runs through zustand when the stored version is older', () => {
    const seed = buildSeedData(new Date('2025-05-21T10:00:00'))
    const storage = createMemoryStorage({
      [SHOP_STORAGE_KEY]: JSON.stringify({
        state: { products: seed.products, customers: seed.customers, sales: [], movements: [] },
        version: 0,
      }),
    })

    const store = createShopStore({ storage: () => storage })

    expect(store.getState().sales).toEqual([])
    expect(store.getState().payments).toEqual([])
    // The upgraded snapshot is written back at the current version.
    expect(saved(storage).version).toBe(SHOP_STORAGE_VERSION)
  })

  it('rejects snapshots it cannot read', () => {
    expect(migratePersistedShop(null, 0)).toBeNull()
    expect(migratePersistedShop('text', 0)).toBeNull()
    expect(migratePersistedShop({ products: [] }, 0)).toBeNull()
    expect(migratePersistedShop({}, -1)).toBeNull()
  })
})

describe('sanitizePersistedShop', () => {
  it('drops bad cart lines and an out-of-range VAT rate', () => {
    const seed = buildSeedData()
    const data = sanitizePersistedShop({
      ...seed,
      cart: [{ productId: PVC, quantity: 2 }, { productId: PVC, quantity: -1 }, 'junk'],
      heldCarts: [[], [{ productId: PVC, quantity: 1 }], 'junk'],
      taxRate: 3,
      settings: { storeName: '  ', address: 5 },
    })

    expect(data?.cart).toEqual([{ productId: PVC, quantity: 2 }])
    expect(data?.heldCarts).toEqual([[{ productId: PVC, quantity: 1 }]])
    expect(data?.taxRate).toBe(0.12)
    expect(data?.settings).toEqual(DEFAULT_STORE_SETTINGS)
  })

  it('rejects record lists whose items have no id', () => {
    const seed = buildSeedData()

    expect(sanitizePersistedShop({ ...seed, sales: [{ total: 1 }] })).toBeNull()
  })
})

describe('createSafeShopStorage', () => {
  it('reads a snapshot saved without a version as version 0', () => {
    const backend = createMemoryStorage({ key: JSON.stringify({ state: { a: 1 } }) })
    const storage = createSafeShopStorage(() => backend)

    expect(storage.getItem('key')).toEqual({ state: { a: 1 }, version: 0 })
  })
})

describe('resetToSeedData', () => {
  it('restores the seed, empties the cart and is saved', () => {
    const storage = createMemoryStorage()
    let clock = new Date('2025-05-21T10:00:00')
    const store = createShopStore({ storage: () => storage, now: () => clock })
    const seededCount = store.getState().sales.length

    store.getState().addToCart(PVC, 2)
    store.getState().recordSale({ paymentMethod: 'cash', amountPaid: 1_000_000, customerId: null })
    store.getState().addToCart(PVC, 1)
    store.getState().holdCart()
    store.getState().updateSettings({ storeName: 'Elsewhere', taxRate: 0.05 })
    store.getState().addCustomer({ name: 'New Buyer' })

    clock = new Date('2025-06-01T09:00:00')
    store.getState().resetToSeedData()

    const state = store.getState()

    expect(state.sales).toHaveLength(seededCount)
    expect(state.cart).toEqual([])
    expect(state.heldCarts).toEqual([])
    expect(state.taxRate).toBe(0.12)
    expect(state.settings).toEqual(DEFAULT_STORE_SETTINGS)
    expect(state.customers.some((customer) => customer.name === 'New Buyer')).toBe(false)
    expect(stockOf(store, PVC)).toBe(SEED_PRODUCTS.find((p) => p.id === PVC)?.stock)

    // History is regenerated relative to the reset, not the first load.
    const newest = state.sales[state.sales.length - 1]
    expect(new Date(newest.occurredAt).getTime()).toBeLessThanOrEqual(clock.getTime())
    expect(new Date(newest.occurredAt).getTime()).toBeGreaterThan(
      new Date('2025-05-31T09:00:00').getTime(),
    )

    expect(saved(storage).state.sales).toHaveLength(seededCount)
  })
})
