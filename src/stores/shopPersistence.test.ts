import { describe, expect, it, vi } from 'vitest'

import { SEED_PRODUCTS } from '@/data/mock/catalog'
import { isOpeningStockMovement, stockFromMovements } from '@/domain/inventory'
import type { HeldSale } from '@/domain/types'
import {
  buildSeedData,
  createMemoryStorage,
  createSafeShopStorage,
  DEFAULT_STORE_SETTINGS,
  isDeviceStorageAvailable,
  migrateHeldCartsToHeldSales,
  inspectPersistedShop,
  migratePersistedShop,
  runPersistedMigrations,
  saveUnreadableBackup,
  unreadableBackupKey,
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
    expect(SHOP_STORAGE_VERSION).toBe(2)
  })

  it('starts from the seed when nothing is saved', () => {
    const storage = createMemoryStorage()
    const store = createShopStore({ storage: () => storage })

    expect(store.getState().sales.length).toBeGreaterThan(0)
    expect(store.getState().cart).toEqual([])
    expect(store.getState().settings).toEqual(DEFAULT_STORE_SETTINGS)
  })

  it('saves data fields only, including the cart and held sales', () => {
    const storage = createMemoryStorage()
    const store = createShopStore({ storage: () => storage })

    store.getState().addToCart(PVC, 3)
    store.getState().holdCart()
    store.getState().addToCart(PVC, 1)

    const snapshot = saved(storage)

    expect(snapshot.version).toBe(SHOP_STORAGE_VERSION)
    expect(snapshot.state.cart).toEqual([{ productId: PVC, quantity: 1 }])
    expect(snapshot.state.heldSales).toHaveLength(1)
    expect(snapshot.state.heldSales[0].lines).toEqual([
      { productId: PVC, quantity: 3, productName: 'PVC Pipe 1/2"', unitPrice: 2800 },
    ])
    expect(Object.keys(snapshot.state).sort()).toEqual(
      [
        'cart',
        'customers',
        'heldSales',
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
    // M2: a version-0 snapshot without heldCarts ends with no held sales.
    expect(migrated?.heldSales).toEqual([])
    expect(migrated?.settings).toEqual(DEFAULT_STORE_SETTINGS)
    expect(migrated?.taxRate).toBe(0.12)
    expect(migrated?.cart).toEqual([{ productId: PVC, quantity: 2 }])
  })

  it('turns version-1 held carts into held sales, oldest first (M1, M3)', () => {
    const seed = buildSeedData(new Date('2025-05-21T10:00:00'))
    const { heldSales: _unused, ...rest } = seed
    void _unused
    const v1 = {
      ...rest,
      heldCarts: [
        [{ productId: PVC, quantity: 2 }],
        [],
        [
          { productId: 'CEM-001', quantity: 1 },
          { productId: 'GONE-001', quantity: 3 },
          { productId: PVC, quantity: -1 },
        ],
      ],
    }
    const now = new Date('2025-05-22T09:00:00')

    const step = migrateHeldCartsToHeldSales(v1, now)

    expect('heldCarts' in step).toBe(false)

    const migrated = migratePersistedShop(v1, 1)

    expect(migrated).not.toBeNull()
    expect(migrated && 'heldCarts' in migrated).toBe(false)

    const held = (step.heldSales as HeldSale[]) ?? []

    expect(held).toHaveLength(2)
    expect(held.map((sale) => sale.lines)).toEqual([
      [{ productId: PVC, quantity: 2, productName: 'PVC Pipe 1/2"', unitPrice: 2800 }],
      [
        { productId: 'CEM-001', quantity: 1, productName: 'Cement (Holcim)', unitPrice: 26000 },
        { productId: 'GONE-001', quantity: 3, productName: 'Unknown product', unitPrice: 0 },
      ],
    ])
    // The newer cart keeps the later time; neither is after the migration.
    expect(new Date(held[1].heldAt).getTime()).toBe(now.getTime())
    expect(new Date(held[0].heldAt).getTime()).toBe(now.getTime() - 1)
    expect(held.every((sale) => sale.label === null && sale.heldBy === 'Juan Dela Cruz')).toBe(true)
    expect(new Set(held.map((sale) => sale.id)).size).toBe(2)
    expect(migrated?.heldSales.map((sale) => sale.lines.length)).toEqual([1, 2])
  })

  it('upgrades a stored version-1 snapshot when the store loads it', () => {
    const seed = buildSeedData(new Date('2025-05-21T10:00:00'))
    const { heldSales: _unused, ...rest } = seed
    void _unused
    const storage = createMemoryStorage({
      [SHOP_STORAGE_KEY]: JSON.stringify({
        state: { ...rest, heldCarts: [[{ productId: PVC, quantity: 4 }]] },
        version: 1,
      }),
    })

    const store = createShopStore({ storage: () => storage })

    expect(store.getState().heldSales).toHaveLength(1)
    expect(store.getState().heldSales[0].lines[0]).toMatchObject({ productId: PVC, quantity: 4 })
    expect(saved(storage).version).toBe(2)
    expect('heldCarts' in saved(storage).state).toBe(false)
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
      taxRate: 3,
      settings: { storeName: '  ', address: 5 },
    })

    expect(data?.cart).toEqual([{ productId: PVC, quantity: 2 }])
    expect(data?.taxRate).toBe(0.12)
    expect(data?.settings).toEqual(DEFAULT_STORE_SETTINGS)
  })

  it('rejects record lists whose items have no id', () => {
    const seed = buildSeedData()

    expect(sanitizePersistedShop({ ...seed, sales: [{ total: 1 }] })).toBeNull()
  })

  it('accepts the seed as it is', () => {
    const seed = buildSeedData(new Date('2025-05-21T10:00:00'))

    expect(sanitizePersistedShop(seed)).toEqual(seed)
  })

  describe('rejects a dataset with one malformed record', () => {
    const seed = buildSeedData(new Date('2025-05-21T10:00:00'))
    const [sale] = seed.sales
    const [product] = seed.products
    const [movement] = seed.movements
    const [payment] = seed.payments

    const withSale = (patch: Record<string, unknown>) => ({
      ...seed,
      sales: [...seed.sales.slice(1), { ...sale, ...patch }],
    })
    const withProduct = (patch: Record<string, unknown>) => ({
      ...seed,
      products: [{ ...product, ...patch }, ...seed.products.slice(1)],
    })

    it.each([
      ['a sale without lines', withSale({ lines: undefined })],
      ['a sale with no lines', withSale({ lines: [] })],
      ['a sale whose lines are not a list', withSale({ lines: 'PVC x2' })],
      [
        'a sale line with a fractional quantity',
        withSale({ lines: [{ ...sale.lines[0], quantity: 1.5 }] }),
      ],
      ['a sale with a string total', withSale({ total: '631.00' })],
      ['a sale with a fractional centavo', withSale({ amountPaid: 100.5 })],
      ['a sale with an unknown payment method', withSale({ paymentMethod: 'gcash' })],
      ['a sale with an unreadable date', withSale({ occurredAt: 'yesterday' })],
      ['a product with a string price', withProduct({ price: '28.00' })],
      ['a product with NaN stock', withProduct({ stock: Number.NaN })],
      ['a product with negative stock', withProduct({ stock: -1 })],
      ['a product without a name', withProduct({ name: undefined })],
      [
        'a movement with an unknown type',
        { ...seed, movements: [{ ...movement, type: 'gift' }, ...seed.movements.slice(1)] },
      ],
      [
        'a movement with a fractional delta',
        { ...seed, movements: [{ ...movement, quantityDelta: 0.5 }, ...seed.movements.slice(1)] },
      ],
      [
        'a payment of nothing',
        { ...seed, payments: [{ ...payment, amount: 0 }, ...seed.payments.slice(1)] },
      ],
      ['a customer list that is not a list', { ...seed, customers: { 'CUS-001': 'Juan' } }],
    ])('%s', (_, data) => {
      expect(sanitizePersistedShop(data)).toBeNull()
    })
  })

  it('merges repeated cart lines and drops lines for unknown products', () => {
    const seed = buildSeedData()
    const data = sanitizePersistedShop({
      ...seed,
      cart: [
        { productId: PVC, quantity: 2 },
        { productId: 'GONE-001', quantity: 1 },
        { productId: PVC, quantity: 3 },
      ],
    })

    expect(data?.cart).toEqual([{ productId: PVC, quantity: 5 }])
  })

  describe('held sales', () => {
    const seed = buildSeedData(new Date('2025-05-21T10:00:00'))
    const line = { productId: PVC, quantity: 2, productName: 'PVC Pipe 1/2"', unitPrice: 2800 }
    const good = (id: string, overrides: Record<string, unknown> = {}) => ({
      id,
      label: 'Pedro',
      lines: [line],
      heldAt: '2025-05-21T09:00:00.000Z',
      heldBy: 'Juan Dela Cruz',
      ...overrides,
    })

    it('drops bad held sales one by one and keeps the rest of the data (M4)', () => {
      const data = sanitizePersistedShop({
        ...seed,
        heldSales: [
          good('HOLD-1'),
          good('HOLD-2', {
            lines: [{ productId: PVC, quantity: 1.5, productName: 'x', unitPrice: 1 }],
          }),
          good('HOLD-3', { heldAt: 'not a date' }),
          good('HOLD-4', { id: 42 }),
          good('HOLD-5', { label: 7 }),
          good('HOLD-6', { lines: [line, { productId: PVC, quantity: 1 }] }),
          'junk',
          good('HOLD-7', { label: '   ', lines: [{ ...line, productId: 'GONE-001' }] }),
        ],
      })

      expect(data).not.toBeNull()
      expect(data?.sales).toEqual(seed.sales)
      expect(data?.heldSales.map((held) => held.id)).toEqual(['HOLD-1', 'HOLD-6', 'HOLD-7'])
      // A bad line is dropped, not the held sale.
      expect(data?.heldSales[1].lines).toEqual([line])
      // A line for a product that is gone is kept: resuming reports it.
      expect(data?.heldSales[2]).toMatchObject({ label: null, lines: [{ productId: 'GONE-001' }] })
    })

    it('keeps more held sales than the limit, and cuts an over-long label (M5)', () => {
      const many = Array.from({ length: 12 }, (_, index) => good(`HOLD-${index}`))
      const data = sanitizePersistedShop({
        ...seed,
        heldSales: [...many, good('HOLD-long', { label: 'x'.repeat(60) })],
      })

      expect(data?.heldSales).toHaveLength(13)
      expect(data?.heldSales[12].label).toBe('x'.repeat(40))
    })

    it('ignores a leftover heldCarts key', () => {
      const data = sanitizePersistedShop({
        ...seed,
        heldCarts: [[{ productId: PVC, quantity: 1 }]],
      })

      expect(data?.heldSales).toEqual([])
      expect(data && 'heldCarts' in data).toBe(false)
    })

    it('survives a reload with label and time intact (M6)', () => {
      const storage = createMemoryStorage()
      const first = createShopStore({ storage: () => storage })

      first.getState().addToCart(PVC, 3)
      const held = first.getState().holdCart({ label: ' Pedro, fetching cash ' })

      expect(held.ok).toBe(true)

      const reloaded = createShopStore({ storage: () => storage })

      expect(reloaded.getState().heldSales).toEqual(first.getState().heldSales)
      expect(reloaded.getState().heldSales[0].label).toBe('Pedro, fetching cash')
    })
  })

  it('adds the missing opening stock to data saved before it existed', () => {
    const seed = buildSeedData(new Date('2025-05-21T10:00:00'))
    const legacy = { ...seed, movements: seed.movements.filter((m) => !isOpeningStockMovement(m)) }
    const now = new Date('2025-05-22T09:00:00')

    const data = sanitizePersistedShop(legacy, now)

    expect(data).not.toBeNull()

    for (const product of seed.products) {
      expect(stockFromMovements(data?.movements ?? [], product.id)).toBe(product.stock)
    }

    // Stock itself is never rewritten, and a consistent snapshot is left alone.
    expect(data?.products).toEqual(seed.products)
    expect(sanitizePersistedShop(data, now)?.movements).toEqual(data?.movements)
  })

  it('repairs a legacy snapshot when the store loads it', () => {
    const seed = buildSeedData(new Date('2025-05-21T10:00:00'))
    const storage = createMemoryStorage({
      [SHOP_STORAGE_KEY]: JSON.stringify({
        state: { ...seed, movements: seed.movements.filter((m) => !isOpeningStockMovement(m)) },
        version: SHOP_STORAGE_VERSION,
      }),
    })

    const store = createShopStore({ storage: () => storage })

    for (const product of store.getState().products) {
      expect(stockFromMovements(store.getState().movements, product.id)).toBe(product.stock)
    }

    expect(store.getState().sales).toHaveLength(seed.sales.length)
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
    expect(state.heldSales).toEqual([])
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

describe('inspectPersistedShop: salvage rules', () => {
  const seed = buildSeedData(new Date('2025-05-21T10:00:00'))

  it('loads clean data with nothing dropped', () => {
    expect(inspectPersistedShop(seed)).toEqual({ data: seed, dropped: [] })
  })

  it('drops a bad customer no sale or payment points at', () => {
    // Rosa Mendoza (CUS-008) has never bought on credit.
    const customers = seed.customers.map((customer) =>
      customer.id === 'CUS-008' ? { ...customer, phone: 917 } : customer,
    )

    const result = inspectPersistedShop({ ...seed, customers })

    expect(result.dropped).toEqual(['1 customer record'])
    expect(result.data?.customers.map((customer) => customer.id)).not.toContain('CUS-008')
    expect(result.data?.sales).toEqual(seed.sales)
    expect(result.data?.payments).toEqual(seed.payments)
  })

  it('refuses to drop a customer who has sales or payments', () => {
    const customers = seed.customers.map((customer) =>
      customer.id === 'CUS-002' ? { ...customer, name: null } : customer,
    )

    expect(inspectPersistedShop({ ...seed, customers }).data).toBeNull()
  })

  it('drops a bad product no stock movement points at', () => {
    const products = [...seed.products, { id: 'ODD-001', name: 'Odd', price: '12.00' }]
    const result = inspectPersistedShop({ ...seed, products })

    expect(result.dropped).toEqual(['1 product record'])
    expect(result.data?.products).toEqual(seed.products)
  })

  it('refuses to drop a product whose stock movements would be left unexplained', () => {
    const products = seed.products.map((product) =>
      product.id === PVC ? { ...product, price: 28.5 } : product,
    )

    expect(inspectPersistedShop({ ...seed, products }).data).toBeNull()
  })

  it('never drops a sale, movement or payment', () => {
    const [sale] = seed.sales
    const [movement] = seed.movements
    const [payment] = seed.payments

    expect(
      inspectPersistedShop({ ...seed, sales: [...seed.sales, { ...sale, id: 'X', lines: [] }] })
        .data,
    ).toBeNull()
    expect(
      inspectPersistedShop({
        ...seed,
        movements: [...seed.movements, { ...movement, id: 'X', quantityDelta: 1.5 }],
      }).data,
    ).toBeNull()
    expect(
      inspectPersistedShop({
        ...seed,
        payments: [...seed.payments, { ...payment, id: 'X', amount: -1 }],
      }).data,
    ).toBeNull()
  })

  it('reports dropped held sales, and renames duplicate held sale ids (d)', () => {
    const line = { productId: PVC, quantity: 1, productName: 'PVC Pipe 1/2"', unitPrice: 2800 }
    const heldAt = '2025-05-21T09:00:00.000Z'
    const held = (id: string, label: string) => ({
      id,
      label,
      lines: [line],
      heldAt,
      heldBy: 'Juan Dela Cruz',
    })

    const result = inspectPersistedShop({
      ...seed,
      heldSales: [held('HOLD-1', 'A'), held('HOLD-1', 'B'), held('HOLD-1', 'C'), { id: 'HOLD-9' }],
    })

    expect(result.dropped).toEqual(['1 held sale'])

    const ids = result.data?.heldSales.map((sale) => sale.id) ?? []

    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    expect(ids[0]).toBe('HOLD-1')
    expect(result.data?.heldSales.map((sale) => sale.label)).toEqual(['A', 'B', 'C'])
  })

  it('does not report cart lines it tidies up', () => {
    const result = inspectPersistedShop({ ...seed, cart: [{ productId: 'GONE', quantity: 1 }] })

    expect(result.dropped).toEqual([])
    expect(result.data?.cart).toEqual([])
  })
})

describe('data recovery on load', () => {
  const seed = buildSeedData(new Date('2025-05-21T10:00:00'))
  const clock = new Date('2025-05-22T08:30:00')
  const backupKey = `${SHOP_STORAGE_KEY}:unreadable-${clock.getTime()}`

  function load(raw: string, backend = createMemoryStorage({ [SHOP_STORAGE_KEY]: raw })) {
    const store = createShopStore({ storage: () => backend, now: () => clock })

    return { store, backend }
  }

  it('names the backup key after the time it was made', () => {
    expect(unreadableBackupKey(clock)).toBe(backupKey)
  })

  it('keeps a copy of corrupt text before starting from the seed', () => {
    const { store, backend } = load('{not json')

    expect(backend.dump()[backupKey]).toBe('{not json')
    expect(store.getState().dataRecovery).toEqual({
      outcome: 'reset',
      backupKey,
      at: clock.toISOString(),
      dropped: [],
    })
    expect(store.getState().products).toHaveLength(SEED_PRODUCTS.length)
  })

  it('keeps an old snapshot the new rules reject, though the upgrade overwrites the main key', () => {
    // The old store accepted fractional quantities; this rule now rejects the sale.
    const [sale] = seed.sales
    const { heldSales: _unused, ...rest } = seed
    void _unused
    const raw = JSON.stringify({
      state: {
        ...rest,
        sales: [{ ...sale, lines: [{ ...sale.lines[0], quantity: 1.5 }] }, ...seed.sales.slice(1)],
        heldCarts: [],
      },
      version: 1,
    })

    const { store, backend } = load(raw)

    expect(store.getState().dataRecovery?.outcome).toBe('reset')
    expect(backend.dump()[backupKey]).toBe(raw)
    // The main key now holds the seed at the current version; the copy is untouched.
    expect(saved(backend).version).toBe(SHOP_STORAGE_VERSION)
    expect(JSON.parse(backend.dump()[backupKey]).state.sales[0].lines[0].quantity).toBe(1.5)
  })

  it('loads salvaged data, keeps a copy and says what was dropped', () => {
    const raw = JSON.stringify({
      state: {
        ...seed,
        customers: seed.customers.map((customer) =>
          customer.id === 'CUS-008' ? { ...customer, id: 8 } : customer,
        ),
      },
      version: SHOP_STORAGE_VERSION,
    })

    const { store, backend } = load(raw)

    expect(store.getState().dataRecovery).toEqual({
      outcome: 'salvaged',
      backupKey,
      at: clock.toISOString(),
      dropped: ['1 customer record'],
    })
    expect(store.getState().sales).toEqual(seed.sales)
    expect(store.getState().customers).toHaveLength(seed.customers.length - 1)
    expect(backend.dump()[backupKey]).toBe(raw)
  })

  it('says nothing and copies nothing on a first visit or a clean load', () => {
    const empty = createMemoryStorage()
    const first = createShopStore({ storage: () => empty, now: () => clock })

    expect(first.getState().dataRecovery).toBeNull()

    first.getState().addToCart(PVC, 1)

    const again = createShopStore({ storage: () => empty, now: () => clock })

    expect(again.getState().dataRecovery).toBeNull()
    expect(Object.keys(empty.dump())).toEqual([SHOP_STORAGE_KEY])
  })

  it('is not saved, and can be dismissed', () => {
    const { store, backend } = load('{not json')

    store.getState().addToCart(PVC, 1)

    expect('dataRecovery' in saved(backend).state).toBe(false)

    store.getState().dismissDataRecovery()

    expect(store.getState().dataRecovery).toBeNull()
    // The copy stays.
    expect(backend.dump()[backupKey]).toBe('{not json')
  })

  it('still starts when the copy cannot be written', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const memory = createMemoryStorage({ [SHOP_STORAGE_KEY]: '{not json' })
    const backend = {
      ...memory,
      setItem: (name: string, value: string) => {
        if (name.includes(':unreadable-')) {
          throw new Error('QuotaExceededError')
        }

        memory.setItem(name, value)
      },
    }

    const store = createShopStore({ storage: () => backend, now: () => clock })

    expect(store.getState().dataRecovery).toMatchObject({ outcome: 'reset', backupKey: null })
    expect(saveUnreadableBackup(undefined, 'x', clock)).toBeNull()

    warn.mockRestore()
  })

  it('dates migrated held carts with the store clock (c)', () => {
    const { heldSales: _unused, ...rest } = seed
    void _unused
    const { store } = load(
      JSON.stringify({
        state: { ...rest, heldCarts: [[{ productId: PVC, quantity: 2 }]] },
        version: 1,
      }),
    )

    expect(store.getState().heldSales).toHaveLength(1)
    expect(store.getState().heldSales[0].heldAt).toBe(clock.toISOString())
    expect(store.getState().heldSales[0].id).toBe(`HOLD-${clock.getTime()}`)
    expect(store.getState().dataRecovery).toBeNull()
  })

  it('runs the migration steps on their own, with the clock it is given', () => {
    const state = runPersistedMigrations(
      { heldCarts: [[{ productId: PVC, quantity: 1 }]] },
      1,
      clock,
    )

    expect(state?.heldSales).toEqual([
      {
        id: `HOLD-${clock.getTime()}`,
        label: null,
        lines: [{ productId: PVC, quantity: 1, productName: 'Unknown product', unitPrice: 0 }],
        heldAt: clock.toISOString(),
        heldBy: 'Juan Dela Cruz',
      },
    ])
    expect(runPersistedMigrations('text', 1, clock)).toBeNull()
    expect(runPersistedMigrations({}, 99, clock)).toEqual({})
  })
})
