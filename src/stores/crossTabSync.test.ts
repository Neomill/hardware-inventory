import { afterEach, describe, expect, it, vi } from 'vitest'

import { SALE_ALREADY_CANCELLED_MESSAGE } from '@/domain/saleCancellation'
import {
  buildSeedData,
  createMemoryStorage,
  getBrowserWindow,
  SHOP_STORAGE_KEY,
  SHOP_STORAGE_VERSION,
  subscribeToShopStorage,
} from '@/stores/shopPersistence'
import { createShopStore } from '@/stores/useShopStore'

const PVC = 'PVC-050'
const CEMENT = 'CEM-001'
const CLOCK = new Date(2025, 4, 21, 18, 0)
const CASH = { paymentMethod: 'cash' as const, amountPaid: 10_000_000, customerId: null }

/** What the browser fires in every other tab when one tab writes localStorage. */
function storageEvent(key: string | null, storageArea?: unknown): Event {
  return Object.assign(new Event('storage'), { key, storageArea })
}

/**
 * Tabs of one browser: one shared localStorage, each tab with its own window.
 * `announce(from)` delivers the storage event to every tab except `from`, as
 * the browser does.
 */
function browser(storage = createMemoryStorage()) {
  const windows: EventTarget[] = []

  const openTab = () => {
    const target = new EventTarget()
    windows.push(target)

    return createShopStore({
      storage: () => storage,
      now: () => CLOCK,
      storageEvents: () => target,
    })
  }

  const announce = (
    from: ReturnType<typeof openTab> | null,
    tabs: ReturnType<typeof openTab>[],
  ) => {
    tabs.forEach((tab, index) => {
      if (tab !== from) {
        windows[index].dispatchEvent(storageEvent(SHOP_STORAGE_KEY))
      }
    })
  }

  return { storage, openTab, announce, windows }
}

function saved(storage: ReturnType<typeof createMemoryStorage>) {
  return JSON.parse(storage.dump()[SHOP_STORAGE_KEY])
}

function sellOne(store: ReturnType<typeof createShopStore>, productId = PVC) {
  expect(store.getState().addToCart(productId, 1).ok).toBe(true)

  const result = store.getState().recordSale(CASH)

  if (!result.ok) {
    throw new Error(result.message)
  }

  return result.sale
}

describe('subscribeToShopStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports writes to the shop key only, until unsubscribed', () => {
    const target = new EventTarget()
    const onChange = vi.fn()
    const unsubscribe = subscribeToShopStorage(target, onChange)

    target.dispatchEvent(storageEvent('something-else'))
    target.dispatchEvent(storageEvent(null))
    expect(onChange).not.toHaveBeenCalled()

    target.dispatchEvent(storageEvent(SHOP_STORAGE_KEY))
    expect(onChange).toHaveBeenCalledTimes(1)

    unsubscribe()
    target.dispatchEvent(storageEvent(SHOP_STORAGE_KEY))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ignores a write to a different storage area when both are known', () => {
    const target = new EventTarget()
    const local = createMemoryStorage()
    const session = createMemoryStorage()
    const onChange = vi.fn()

    subscribeToShopStorage(target, onChange, () => local)

    target.dispatchEvent(storageEvent(SHOP_STORAGE_KEY, session))
    expect(onChange).not.toHaveBeenCalled()

    target.dispatchEvent(storageEvent(SHOP_STORAGE_KEY, local))
    target.dispatchEvent(storageEvent(SHOP_STORAGE_KEY))
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('does nothing without an event source', () => {
    const unsubscribe = subscribeToShopStorage(undefined, vi.fn())

    expect(() => unsubscribe()).not.toThrow()
  })

  it('listens on the browser window when there is one', () => {
    expect(getBrowserWindow()).toBeUndefined()

    const fakeWindow = new EventTarget()
    vi.stubGlobal('window', fakeWindow)

    expect(getBrowserWindow()).toBe(fakeWindow)
  })
})

describe('cross-tab sync', () => {
  it('refuses a second cancellation of the same sale and writes nothing (spec s.8)', () => {
    const { storage, openTab, announce } = browser()
    const tab1 = openTab()
    const sale = sellOne(tab1)
    const tab2 = openTab()
    const tabs = [tab1, tab2]

    expect(tab1.getState().cancelSale({ saleId: sale.id, reason: 'Wrong item' }).ok).toBe(true)
    announce(tab1, tabs)

    const before = storage.dump()[SHOP_STORAGE_KEY]
    const second = tab2.getState().cancelSale({ saleId: sale.id, reason: 'Overwritten?' })

    expect(second).toEqual({ ok: false, message: SALE_ALREADY_CANCELLED_MESSAGE })
    expect(storage.dump()[SHOP_STORAGE_KEY]).toBe(before)

    const stored = saved(storage).state.sales.find((candidate: { id: string }) => {
      return candidate.id === sale.id
    })

    expect(stored.cancellation.reason).toBe('Wrong item')
    expect(tab2.getState().sales.find((candidate) => candidate.id === sale.id)?.status).toBe(
      'cancelled',
    )
  })

  it('keeps a cancellation and its reversal when a stale tab then records a sale', () => {
    const { storage, openTab, announce } = browser()
    const tab1 = openTab()
    const sale = sellOne(tab1)
    const tab3 = openTab()
    const tabs = [tab1, tab3]

    const cancelled = tab1.getState().cancelSale({ saleId: sale.id, reason: 'Customer left' })

    expect(cancelled.ok).toBe(true)
    announce(tab1, tabs)

    const later = sellOne(tab3, CEMENT)
    const state = saved(storage).state

    expect(state.sales.map((candidate: { id: string }) => candidate.id)).toEqual(
      expect.arrayContaining([sale.id, later.id]),
    )
    expect(state.sales.find((candidate: { id: string }) => candidate.id === sale.id).status).toBe(
      'cancelled',
    )
    expect(
      state.movements.filter(
        (movement: { type: string; reference: string }) =>
          movement.type === 'sale_reversal' && movement.reference === sale.saleNumber,
      ),
    ).toHaveLength(1)
    // The returned unit is still on the shelf in the stale tab's write.
    const pvc = state.products.find((product: { id: string }) => product.id === PVC)

    expect(pvc.stock).toBe(tab1.getState().products.find((p) => p.id === PVC)?.stock)
  })

  it('keeps each tab its own cart, but takes held sales and records from storage', () => {
    const { openTab, announce } = browser()
    const tab1 = openTab()
    const tab2 = openTab()
    const tabs = [tab1, tab2]

    expect(tab2.getState().addToCart(CEMENT, 2).ok).toBe(true)
    announce(tab2, tabs)

    // Tab 1 holds a sale and completes another; tab 2's cashier keeps their cart.
    tab1.getState().addToCart(PVC, 1)
    expect(tab1.getState().holdCart({ label: 'Truck' }).ok).toBe(true)
    announce(tab1, tabs)
    const sale = sellOne(tab1)
    announce(tab1, tabs)

    expect(tab1.getState().cart).toEqual([])
    expect(tab2.getState().cart).toEqual([{ productId: CEMENT, quantity: 2 }])
    expect(tab2.getState().heldSales.map((held) => held.label)).toEqual(['Truck'])
    expect(tab2.getState().sales.some((candidate) => candidate.id === sale.id)).toBe(true)
  })

  it("drops a cart line whose product is gone from the other tab's data", () => {
    const { storage, openTab, announce } = browser()
    const tab1 = openTab()
    const tab2 = openTab()

    // A product nobody has moved stock for, so it can leave the list cleanly.
    const extra = tab1.getState().addProduct({
      name: 'Test Hinge',
      category: 'Hardware',
      unit: 'pc',
      price: 5000,
      reorderLevel: 1,
      openingStock: 4,
      isActive: true,
    })

    if (!extra.ok) {
      throw new Error(extra.message)
    }

    announce(tab1, [tab1, tab2])
    expect(tab2.getState().addToCart(extra.product.id, 1).ok).toBe(true)
    expect(tab2.getState().addToCart(PVC, 1).ok).toBe(true)

    const state = saved(storage).state
    storage.setItem(
      SHOP_STORAGE_KEY,
      JSON.stringify({
        version: SHOP_STORAGE_VERSION,
        state: {
          ...state,
          products: state.products.filter((product: { id: string }) => {
            return product.id !== extra.product.id
          }),
          movements: state.movements.filter((movement: { productId: string }) => {
            return movement.productId !== extra.product.id
          }),
        },
      }),
    )
    announce(null, [tab1, tab2])

    expect(tab2.getState().cart).toEqual([{ productId: PVC, quantity: 1 }])
    expect(tab2.getState().products.some((product) => product.id === extra.product.id)).toBe(false)
  })

  it('runs data saved by an older version through the migrations', () => {
    const { storage, openTab, announce } = browser()
    const tab = openTab()
    const seed = buildSeedData(CLOCK)
    const { invoices: _invoices, ...v2 } = seed
    void _invoices

    storage.setItem(
      SHOP_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        state: {
          ...v2,
          sales: v2.sales.map((sale) => {
            const { cancellation: _cancellation, ...legacy } = sale
            void _cancellation

            return legacy
          }),
        },
      }),
    )
    announce(null, [tab])

    expect(tab.getState().dataRecovery).toBeNull()
    expect(tab.getState().invoices).toEqual([])
    expect(tab.getState().sales.every((sale) => sale.cancellation === null)).toBe(true)
    expect(saved(storage).version).toBe(SHOP_STORAGE_VERSION)
  })

  it('keeps its data when the saved copy is removed, and reports unreadable data', () => {
    const { storage, openTab, announce } = browser()
    const tab = openTab()
    sellOne(tab)
    const sales = tab.getState().sales

    storage.removeItem(SHOP_STORAGE_KEY)
    announce(null, [tab])

    expect(tab.getState().sales).toBe(sales)
    expect(tab.getState().dataRecovery).toBeNull()

    storage.setItem(SHOP_STORAGE_KEY, JSON.stringify({ version: 3, state: { sales: 'nope' } }))
    announce(null, [tab])

    expect(tab.getState().sales).toEqual(sales)
    expect(tab.getState().dataRecovery?.outcome).toBe('reset')
    expect(tab.getState().dataRecovery?.backupKey).not.toBeNull()
  })

  it('does not listen when sync is turned off', () => {
    const storage = createMemoryStorage()
    const tab1 = createShopStore({ storage: () => storage, now: () => CLOCK })
    const tab2 = createShopStore({
      storage: () => storage,
      now: () => CLOCK,
      storageEvents: () => undefined,
    })
    const sale = sellOne(tab1)

    expect(tab2.getState().sales.some((candidate) => candidate.id === sale.id)).toBe(false)
  })
})
