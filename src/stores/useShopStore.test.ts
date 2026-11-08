import { beforeEach, describe, expect, it } from 'vitest'

import { SEED_CUSTOMERS } from '@/data/mock/customers'
import { SEED_PRODUCTS } from '@/data/mock/catalog'
import { toDayKey } from '@/domain/dates'
import { stockFromMovements } from '@/domain/inventory'
import { computeOutstanding } from '@/domain/ledger'
import { nextProductSku } from '@/domain/product'
import { formatSaleNumber } from '@/domain/sale'
import {
  CANCEL_REASON_MAX,
  SALE_ALREADY_CANCELLED_MESSAGE,
  SALE_NOT_FOUND_MESSAGE,
} from '@/domain/saleCancellation'
import { createMemoryStorage, SHOP_STORAGE_KEY } from '@/stores/shopPersistence'
import { testLine, testMovement, testSale } from '@/test/fixtures'
import { createShopStore, DEFAULT_STORE_SETTINGS, useShopStore } from '@/stores/useShopStore'

const PVC = 'PVC-050'
const SOLD_OUT = 'SFG-002'
const CUSTOMER = 'CUS-001'

const seededSales = useShopStore.getState().sales
const seededMovements = useShopStore.getState().movements
const seededPayments = useShopStore.getState().payments
const seededInvoices = useShopStore.getState().invoices

function reset() {
  useShopStore.setState({
    products: SEED_PRODUCTS.map((product) => ({ ...product })),
    sales: seededSales,
    movements: seededMovements,
    customers: SEED_CUSTOMERS,
    payments: seededPayments,
    invoices: seededInvoices,
    taxRate: 0.12,
    settings: DEFAULT_STORE_SETTINGS,
    cart: [],
    heldSales: [],
  })
}

function outstandingOf(customerId: string): number {
  const { sales, payments } = useShopStore.getState()

  return computeOutstanding(sales, payments, customerId)
}

function stockOf(productId: string): number {
  return useShopStore.getState().products.find((p) => p.id === productId)?.stock ?? -1
}

describe('cart', () => {
  beforeEach(reset)

  it('refuses a product that is out of stock', () => {
    const result = useShopStore.getState().addToCart(SOLD_OUT, 1)

    expect(result.ok).toBe(false)
    expect(result.message).toContain('out of stock')
    expect(useShopStore.getState().cart).toHaveLength(0)
  })

  it('refuses more than what is on hand, counting what is already in the cart', () => {
    const store = useShopStore.getState()

    expect(store.addToCart(PVC, 100).ok).toBe(true)
    // 150 on hand, 100 already in the cart.
    expect(store.addToCart(PVC, 60).ok).toBe(false)
    expect(store.addToCart(PVC, 50).ok).toBe(true)
    expect(useShopStore.getState().cart[0].quantity).toBe(150)
  })

  it('merges repeat adds of the same product into one line', () => {
    const store = useShopStore.getState()
    store.addToCart(PVC, 2)
    store.addToCart(PVC, 3)

    expect(useShopStore.getState().cart).toHaveLength(1)
    expect(useShopStore.getState().cart[0].quantity).toBe(5)
  })

  it('refuses negative, fractional and non-number adds and changes nothing', () => {
    const store = useShopStore.getState()

    for (const quantity of [-1, 0, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = store.addToCart(PVC, quantity)

      expect(result.ok).toBe(false)
      expect(result.message).toContain('whole number')
    }

    expect(useShopStore.getState().cart).toEqual([])

    // A negative add cannot shrink a line already in the cart either.
    store.addToCart(PVC, 5)

    expect(useShopStore.getState().addToCart(PVC, -3).ok).toBe(false)
    expect(useShopStore.getState().cart).toEqual([{ productId: PVC, quantity: 5 }])
  })

  it('refuses a fractional or negative quantity change, keeping the line', () => {
    useShopStore.getState().addToCart(PVC, 2)

    for (const quantity of [2.5, -1, Number.NaN]) {
      expect(useShopStore.getState().setCartQuantity(PVC, quantity).ok).toBe(false)
    }

    expect(useShopStore.getState().cart).toEqual([{ productId: PVC, quantity: 2 }])
    expect(useShopStore.getState().setCartQuantity(PVC, 7).ok).toBe(true)
    expect(useShopStore.getState().cart).toEqual([{ productId: PVC, quantity: 7 }])
  })

  it('removes a line when its quantity reaches zero', () => {
    useShopStore.getState().addToCart(PVC, 2)
    useShopStore.getState().setCartQuantity(PVC, 0)

    expect(useShopStore.getState().cart).toHaveLength(0)
  })
})

describe('held sales', () => {
  beforeEach(reset)

  const CEMENT = 'CEM-001'

  function hold(lines: [string, number][], label?: string) {
    for (const [productId, quantity] of lines) {
      expect(useShopStore.getState().addToCart(productId, quantity).ok).toBe(true)
    }

    const result = useShopStore.getState().holdCart(label === undefined ? undefined : { label })

    if (!result.ok) {
      throw new Error(result.message)
    }

    return result.heldSale
  }

  function setProduct(productId: string, patch: Partial<{ stock: number; isActive: boolean }>) {
    useShopStore.setState({
      products: useShopStore
        .getState()
        .products.map((product) => (product.id === productId ? { ...product, ...patch } : product)),
    })
  }

  it('holds the cart with its label, and moves no stock (S1)', () => {
    const { products, movements } = useShopStore.getState()
    const held = hold(
      [
        [PVC, 2],
        [CEMENT, 1],
      ],
      '  Pedro ',
    )

    const state = useShopStore.getState()

    expect(state.heldSales).toEqual([held])
    expect(held.label).toBe('Pedro')
    expect(held.heldBy).toBe('Juan Dela Cruz')
    expect(held.id).toMatch(/^HOLD-\d+(-\d+)?$/)
    expect(held.lines).toEqual([
      { productId: PVC, quantity: 2, productName: 'PVC Pipe 1/2"', unitPrice: 2800 },
      { productId: CEMENT, quantity: 1, productName: 'Cement (Holcim)', unitPrice: 26000 },
    ])
    expect(state.cart).toEqual([])
    expect(state.products).toBe(products)
    expect(state.movements).toBe(movements)
  })

  it('refuses an empty cart and a label over 40 characters', () => {
    expect(useShopStore.getState().holdCart()).toEqual({
      ok: false,
      message: 'There is nothing to hold yet.',
    })

    useShopStore.getState().addToCart(PVC, 1)

    expect(useShopStore.getState().holdCart({ label: 'x'.repeat(41) }).ok).toBe(false)
    expect(useShopStore.getState().cart).toHaveLength(1)
    expect(useShopStore.getState().heldSales).toEqual([])
  })

  it('refuses a hold at the limit and writes nothing (S2)', () => {
    for (let count = 0; count < 10; count += 1) {
      hold([[PVC, 1]])
    }

    const ids = useShopStore.getState().heldSales.map((held) => held.id)

    expect(new Set(ids).size).toBe(10)

    useShopStore.getState().addToCart(PVC, 1)
    const result = useShopStore.getState().holdCart()

    expect(result).toEqual({
      ok: false,
      message: 'You already have 10 held sales. Resume or discard one first.',
    })
    expect(useShopStore.getState().heldSales).toHaveLength(10)
    expect(useShopStore.getState().cart).toEqual([{ productId: PVC, quantity: 1 }])
  })

  it('resumes any held sale, not only the newest (S3)', () => {
    const first = hold([[PVC, 2]], 'A')
    const second = hold([[CEMENT, 1]], 'B')

    const result = useShopStore.getState().resumeHeldSale(first.id)

    expect(result).toEqual({ ok: true, adjustments: [] })
    expect(useShopStore.getState().cart).toEqual([{ productId: PVC, quantity: 2 }])
    expect(useShopStore.getState().heldSales).toEqual([second])
  })

  it('reduces a line to the stock left after another sale (S4)', () => {
    const held = hold([[PVC, 5]])
    const onHand = stockOf(PVC)

    useShopStore.getState().addToCart(PVC, onHand - 2)
    expect(
      useShopStore
        .getState()
        .recordSale({ paymentMethod: 'cash', amountPaid: 100_000_000, customerId: null }).ok,
    ).toBe(true)

    const result = useShopStore.getState().resumeHeldSale(held.id)

    expect(result).toEqual({
      ok: true,
      adjustments: [
        {
          kind: 'reduced',
          productId: PVC,
          productName: 'PVC Pipe 1/2"',
          from: 5,
          to: 2,
          unit: 'pcs',
        },
      ],
    })
    expect(useShopStore.getState().cart).toEqual([{ productId: PVC, quantity: 2 }])
  })

  it('drops a line whose product sold out, and one deactivated (S5)', () => {
    const held = hold([
      [PVC, 1],
      [CEMENT, 1],
      ['NAI-200', 1],
    ])

    setProduct(CEMENT, { stock: 0 })
    setProduct('NAI-200', { isActive: false })

    const result = useShopStore.getState().resumeHeldSale(held.id)

    expect(result.ok && result.adjustments.map((adjustment) => adjustment.kind)).toEqual([
      'removed_out_of_stock',
      'removed_inactive',
    ])
    expect(useShopStore.getState().cart).toEqual([{ productId: PVC, quantity: 1 }])
  })

  it('refuses a held sale with nothing sellable and keeps it (S6)', () => {
    const held = hold([[CEMENT, 1]])

    setProduct(CEMENT, { stock: 0 })

    expect(useShopStore.getState().resumeHeldSale(held.id)).toEqual({
      ok: false,
      message: 'None of the items in this held sale can be sold now.',
    })
    expect(useShopStore.getState().heldSales).toEqual([held])
    expect(useShopStore.getState().cart).toEqual([])
  })

  it('refuses to resume over a sale in progress, or an unknown id (S7)', () => {
    const held = hold([[PVC, 1]])

    useShopStore.getState().addToCart(CEMENT, 1)

    expect(useShopStore.getState().resumeHeldSale(held.id)).toEqual({
      ok: false,
      message: 'Finish or hold the current sale first.',
    })
    expect(useShopStore.getState().resumeHeldSale('HOLD-nope')).toEqual({
      ok: false,
      message: 'That held sale is no longer here.',
    })
    expect(useShopStore.getState().cart).toEqual([{ productId: CEMENT, quantity: 1 }])
    expect(useShopStore.getState().heldSales).toEqual([held])
  })

  it('swaps the current cart for a held sale in one step, even at the limit (S8)', () => {
    const target = hold([[PVC, 3]])

    for (let count = 1; count < 10; count += 1) {
      hold([['NAI-200', 1]])
    }

    useShopStore.getState().addToCart(CEMENT, 2)

    const result = useShopStore.getState().swapWithHeldSale(target.id, { label: 'Maria' })

    expect(result).toEqual({ ok: true, adjustments: [] })

    const state = useShopStore.getState()

    expect(state.cart).toEqual([{ productId: PVC, quantity: 3 }])
    expect(state.heldSales).toHaveLength(10)
    expect(state.heldSales.some((held) => held.id === target.id)).toBe(false)

    const parked = state.heldSales[state.heldSales.length - 1]

    expect(parked.label).toBe('Maria')
    expect(parked.lines).toEqual([
      { productId: CEMENT, quantity: 2, productName: 'Cement (Holcim)', unitPrice: 26000 },
    ])
  })

  it('changes nothing when the swap target has nothing sellable (S9)', () => {
    const target = hold([[CEMENT, 1]])

    setProduct(CEMENT, { stock: 0 })
    useShopStore.getState().addToCart(PVC, 2)

    const result = useShopStore.getState().swapWithHeldSale(target.id)

    expect(result.ok).toBe(false)
    expect(useShopStore.getState().cart).toEqual([{ productId: PVC, quantity: 2 }])
    expect(useShopStore.getState().heldSales).toEqual([target])
  })

  it('refuses a swap with an empty cart, an unknown id or an over-long label', () => {
    const target = hold([[PVC, 1]])

    expect(useShopStore.getState().swapWithHeldSale(target.id).ok).toBe(false)
    expect(useShopStore.getState().swapWithHeldSale('HOLD-nope').ok).toBe(false)

    useShopStore.getState().addToCart(CEMENT, 1)

    expect(useShopStore.getState().swapWithHeldSale(target.id, { label: 'x'.repeat(41) }).ok).toBe(
      false,
    )
    expect(useShopStore.getState().heldSales).toEqual([target])
    expect(useShopStore.getState().cart).toEqual([{ productId: CEMENT, quantity: 1 }])
  })

  it('discards a held sale without touching stock or records (S10, S11)', () => {
    const held = hold([[PVC, 2]])
    const { products, movements, sales } = useShopStore.getState()

    expect(useShopStore.getState().discardHeldSale(held.id).ok).toBe(true)

    const state = useShopStore.getState()

    expect(state.heldSales).toEqual([])
    expect(state.products).toBe(products)
    expect(state.movements).toBe(movements)
    expect(state.sales).toBe(sales)
    expect(useShopStore.getState().discardHeldSale('nope')).toEqual({
      ok: false,
      message: 'That held sale is no longer here.',
    })
  })

  it('is cleared by a reset to the demo data (S13)', () => {
    const store = createShopStore({ storage: () => createMemoryStorage() })

    store.getState().addToCart(PVC, 1)
    store.getState().holdCart()

    expect(store.getState().heldSales).toHaveLength(1)

    store.getState().resetToSeedData()

    expect(store.getState().heldSales).toEqual([])
  })
})

describe('recordSale', () => {
  beforeEach(reset)

  it('records a cash sale, reduces stock and logs the movement', () => {
    const before = stockOf(PVC)
    const salesBefore = useShopStore.getState().sales.length

    useShopStore.getState().addToCart(PVC, 10)
    // 10 x PHP 28.00 = PHP 280.00; PHP 500.00 tendered.
    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 50000, customerId: null })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.sale.total).toBe(28000)
    expect(result.sale.changeGiven).toBe(22000)
    expect(result.sale.balanceDue).toBe(0)
    expect(result.sale.customerName).toBe('Walk-in Customer')
    expect(result.sale.saleNumber).toMatch(/^#\d{8}-\d{4}$/)

    expect(stockOf(PVC)).toBe(before - 10)
    expect(useShopStore.getState().sales).toHaveLength(salesBefore + 1)
    expect(useShopStore.getState().cart).toHaveLength(0)

    const movement = useShopStore
      .getState()
      .movements.find((entry) => entry.reference === result.sale.saleNumber)

    expect(movement?.quantityDelta).toBe(-10)
    expect(movement?.type).toBe('sale')
  })

  it('records the VAT rate in force, without adding it to the total', () => {
    useShopStore.getState().addToCart(PVC, 10)
    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 28000, customerId: null })

    expect(result.ok && result.sale.taxRate).toBe(0.12)
    expect(result.ok && result.sale.total).toBe(28000)
  })

  it('writes nothing when credit has no customer', () => {
    const before = stockOf(PVC)
    const salesBefore = useShopStore.getState().sales.length

    useShopStore.getState().addToCart(PVC, 10)
    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'credit', amountPaid: 0, customerId: null })

    expect(result.ok).toBe(false)
    expect(stockOf(PVC)).toBe(before)
    expect(useShopStore.getState().sales).toHaveLength(salesBefore)
    // The cart survives, so the cashier can pick a customer and try again.
    expect(useShopStore.getState().cart).toHaveLength(1)
  })

  it('carries the unpaid remainder of a partial payment', () => {
    useShopStore.getState().addToCart(PVC, 10)
    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'partial', amountPaid: 10000, customerId: CUSTOMER })

    expect(result.ok).toBe(true)
    expect(result.ok && result.sale.balanceDue).toBe(18000)
    expect(result.ok && result.sale.changeGiven).toBe(0)
    expect(result.ok && result.sale.customerName).toBe('Juan Dela Cruz')
  })

  it('puts the whole total on the ledger for a credit sale', () => {
    useShopStore.getState().addToCart(PVC, 10)
    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'credit', amountPaid: 0, customerId: CUSTOMER })

    expect(result.ok && result.sale.balanceDue).toBe(28000)
    expect(result.ok && result.sale.amountPaid).toBe(0)
  })

  it('refuses cash below the total and changes nothing', () => {
    const before = stockOf(PVC)

    useShopStore.getState().addToCart(PVC, 10)
    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 27999, customerId: null })

    expect(result.ok).toBe(false)
    expect(stockOf(PVC)).toBe(before)
  })

  it('refuses an empty cart', () => {
    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 0, customerId: null })

    expect(result.ok).toBe(false)
  })

  it('rechecks stock at confirm time, not only when the item was added', () => {
    useShopStore.getState().addToCart(PVC, 100)

    // Stock drops after the item was already in the cart.
    useShopStore.setState({
      products: useShopStore
        .getState()
        .products.map((product) => (product.id === PVC ? { ...product, stock: 4 } : product)),
    })

    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 500000, customerId: null })

    expect(result.ok).toBe(false)
    expect(stockOf(PVC)).toBe(4)
  })

  it('never lets stock go negative across repeated sales, even past the cart check', () => {
    const onHand = stockOf(PVC)
    let recorded = 0

    for (let attempt = 0; attempt < 20; attempt += 1) {
      // Put the line straight into the cart, as a restored or stale cart would,
      // so only recordSale's own recheck stands between it and negative stock.
      useShopStore.setState({ cart: [{ productId: PVC, quantity: 10 }] })

      const result = useShopStore.getState().recordSale({
        paymentMethod: 'cash',
        amountPaid: 1_000_000,
        customerId: null,
      })

      if (result.ok) {
        recorded += 1
      } else {
        expect(result.message).toContain('left in stock')
      }

      expect(stockOf(PVC)).toBeGreaterThanOrEqual(0)
    }

    expect(recorded).toBe(Math.floor(onHand / 10))
    expect(stockOf(PVC)).toBe(onHand - recorded * 10)
  })

  it('refuses an inactive product in the cart and writes nothing (S12)', () => {
    useShopStore.getState().addToCart(PVC, 2)
    useShopStore.setState({
      products: useShopStore
        .getState()
        .products.map((product) =>
          product.id === PVC ? { ...product, isActive: false } : product,
        ),
    })

    const { sales, movements, products } = useShopStore.getState()
    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 1_000_000, customerId: null })

    expect(result).toEqual({
      ok: false,
      message: 'PVC Pipe 1/2" is no longer for sale. Remove it to continue.',
    })
    expect(useShopStore.getState().sales).toBe(sales)
    expect(useShopStore.getState().movements).toBe(movements)
    expect(useShopStore.getState().products).toBe(products)
    expect(useShopStore.getState().cart).toHaveLength(1)
  })

  it('refuses invalid amounts and changes nothing', () => {
    const cases = [
      { paymentMethod: 'cash' as const, amountPaid: Number.NaN, customerId: null },
      { paymentMethod: 'cash' as const, amountPaid: 28000.5, customerId: null },
      { paymentMethod: 'credit' as const, amountPaid: -100, customerId: CUSTOMER },
      { paymentMethod: 'credit' as const, amountPaid: 100, customerId: CUSTOMER },
      { paymentMethod: 'partial' as const, amountPaid: -100, customerId: CUSTOMER },
    ]

    for (const input of cases) {
      const before = stockOf(PVC)
      const salesBefore = useShopStore.getState().sales.length
      const owingBefore = outstandingOf(CUSTOMER)

      useShopStore.setState({ cart: [{ productId: PVC, quantity: 10 }] })

      expect(useShopStore.getState().recordSale(input).ok).toBe(false)
      expect(stockOf(PVC)).toBe(before)
      expect(useShopStore.getState().sales).toHaveLength(salesBefore)
      expect(outstandingOf(CUSTOMER)).toBe(owingBefore)
      expect(useShopStore.getState().cart).toHaveLength(1)
    }
  })

  it('refuses a cart line that is not a whole positive quantity', () => {
    const before = stockOf(PVC)

    for (const quantity of [2.5, -3, 0, Number.NaN]) {
      useShopStore.setState({ cart: [{ productId: PVC, quantity }] })

      const result = useShopStore
        .getState()
        .recordSale({ paymentMethod: 'cash', amountPaid: 1_000_000, customerId: null })

      expect(result.ok).toBe(false)
      expect(stockOf(PVC)).toBe(before)
    }
  })

  it('merges repeated lines for one product, so stock taken matches the movements', () => {
    const before = stockOf(PVC)

    useShopStore.setState({
      cart: [
        { productId: PVC, quantity: 3 },
        { productId: 'CEM-001', quantity: 1 },
        { productId: PVC, quantity: 4 },
      ],
    })

    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 1_000_000, customerId: null })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.sale.lines.map((line) => [line.productId, line.quantity])).toEqual([
      [PVC, 7],
      ['CEM-001', 1],
    ])
    expect(result.sale.total).toBe(7 * 2800 + 26000)

    const movements = useShopStore
      .getState()
      .movements.filter((movement) => movement.reference === result.sale.saleNumber)

    expect(movements).toHaveLength(2)
    expect(new Set(movements.map((movement) => movement.id)).size).toBe(2)
    expect(stockOf(PVC)).toBe(before - 7)
    expect(
      movements
        .filter((movement) => movement.productId === PVC)
        .reduce((sum, movement) => sum + movement.quantityDelta, 0),
    ).toBe(-7)
  })

  it('refuses repeated lines that together exceed stock', () => {
    const onHand = stockOf(PVC)

    useShopStore.setState({
      cart: [
        { productId: PVC, quantity: onHand },
        { productId: PVC, quantity: 1 },
      ],
    })

    const result = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 100_000_000, customerId: null })

    expect(result.ok).toBe(false)
    expect(stockOf(PVC)).toBe(onHand)
  })
})

describe('sale numbering', () => {
  function storeAt(start: Date) {
    let clock = start
    const store = createShopStore({ storage: () => createMemoryStorage(), now: () => clock })

    return {
      store,
      setClock: (next: Date) => {
        clock = next
      },
      sell: () => {
        store.getState().addToCart(PVC, 1)

        return store
          .getState()
          .recordSale({ paymentMethod: 'cash', amountPaid: 1_000_000, customerId: null })
      },
    }
  }

  it('continues from the seeded sales of the same day', () => {
    const start = new Date(2025, 4, 21, 18, 0)
    const { store, sell } = storeAt(start)
    const seededToday = store
      .getState()
      .sales.filter((sale) => toDayKey(sale.occurredAt) === toDayKey(start)).length

    expect(seededToday).toBeGreaterThan(0)

    const first = sell()
    const second = sell()

    expect(first.ok && first.sale.saleNumber).toBe(formatSaleNumber(start, seededToday + 1))
    expect(second.ok && second.sale.saleNumber).toBe(formatSaleNumber(start, seededToday + 2))
    // Two sales in the same millisecond still get their own ids.
    expect(first.ok && second.ok && first.sale.id !== second.sale.id).toBe(true)
  })

  it('restarts at 0001 the next day', () => {
    const { setClock, sell } = storeAt(new Date(2025, 4, 21, 18, 0))

    sell()

    const tomorrow = new Date(2025, 4, 22, 8, 5)
    setClock(tomorrow)

    const next = sell()

    expect(next.ok && next.sale.saleNumber).toBe('#20250522-0001')
    expect(next.ok && next.sale.occurredAt).toBe(tomorrow.toISOString())
  })
})

describe('adjustStock', () => {
  beforeEach(reset)

  it('applies a signed correction with its reason', () => {
    const before = stockOf(PVC)
    const result = useShopStore
      .getState()
      .adjustStock({ productId: PVC, quantityDelta: -3, reason: '  Cracked in storage ' })

    expect(result.ok).toBe(true)
    expect(stockOf(PVC)).toBe(before - 3)
    expect(result.ok && result.movement).toMatchObject({
      type: 'adjustment',
      quantityDelta: -3,
      reason: 'Cracked in storage',
    })
    expect(result.ok && result.movement.reference).toMatch(/^ADJ-\d{5}$/)
  })

  it('numbers adjustments after the seeded ones', () => {
    const seeded = useShopStore
      .getState()
      .movements.filter((movement) => movement.type === 'adjustment').length

    const result = useShopStore
      .getState()
      .adjustStock({ productId: PVC, quantityDelta: 1, reason: 'Recount' })

    expect(result.ok && result.movement.reference).toBe(
      `ADJ-${String(seeded + 1).padStart(5, '0')}`,
    )
  })

  it('takes stock to exactly zero but never below', () => {
    const onHand = stockOf(PVC)
    const store = useShopStore.getState()

    expect(
      store.adjustStock({ productId: PVC, quantityDelta: -(onHand + 1), reason: 'Lost' }).ok,
    ).toBe(false)
    expect(stockOf(PVC)).toBe(onHand)

    expect(store.adjustStock({ productId: PVC, quantityDelta: -onHand, reason: 'Lost' }).ok).toBe(
      true,
    )
    expect(stockOf(PVC)).toBe(0)
  })

  it('requires a reason and a whole, non-zero change', () => {
    const store = useShopStore.getState()
    const movementsBefore = store.movements.length

    expect(store.adjustStock({ productId: PVC, quantityDelta: -1, reason: ' ' }).ok).toBe(false)
    expect(store.adjustStock({ productId: PVC, quantityDelta: 0, reason: 'Recount' }).ok).toBe(
      false,
    )
    expect(store.adjustStock({ productId: PVC, quantityDelta: 1.5, reason: 'Recount' }).ok).toBe(
      false,
    )
    expect(useShopStore.getState().movements).toHaveLength(movementsBefore)
  })
})

describe('recordPayment', () => {
  beforeEach(reset)

  it('reduces the outstanding balance and stamps who recorded it', () => {
    const before = outstandingOf(CUSTOMER)

    expect(before).toBeGreaterThan(0)

    const result = useShopStore
      .getState()
      .recordPayment({ customerId: CUSTOMER, amount: 10000, note: ' GCash ' })

    expect(result.ok).toBe(true)
    expect(outstandingOf(CUSTOMER)).toBe(before - 10000)
    expect(result.ok && result.payment).toMatchObject({
      customerId: CUSTOMER,
      customerName: 'Juan Dela Cruz',
      amount: 10000,
      note: 'GCash',
      recordedBy: 'Juan Dela Cruz',
    })
    expect(result.ok && result.payment.id).toMatch(/^PAY-\d{5}$/)
  })

  it('settles a balance to exactly zero over several payments', () => {
    let owing = outstandingOf(CUSTOMER)
    const instalment = Math.floor(owing / 3) + 1

    while (owing > 0) {
      const result = useShopStore
        .getState()
        .recordPayment({ customerId: CUSTOMER, amount: Math.min(instalment, owing) })

      expect(result.ok).toBe(true)
      owing = outstandingOf(CUSTOMER)
    }

    expect(owing).toBe(0)
    expect(useShopStore.getState().recordPayment({ customerId: CUSTOMER, amount: 1 }).ok).toBe(
      false,
    )
  })

  it('refuses an overpayment, even by one centavo', () => {
    const owing = outstandingOf(CUSTOMER)
    const paymentsBefore = useShopStore.getState().payments.length

    const result = useShopStore
      .getState()
      .recordPayment({ customerId: CUSTOMER, amount: owing + 1 })

    expect(result.ok).toBe(false)
    expect(useShopStore.getState().payments).toHaveLength(paymentsBefore)
    expect(outstandingOf(CUSTOMER)).toBe(owing)
  })

  it('accepts exactly the outstanding amount', () => {
    const owing = outstandingOf(CUSTOMER)

    expect(useShopStore.getState().recordPayment({ customerId: CUSTOMER, amount: owing }).ok).toBe(
      true,
    )
    expect(outstandingOf(CUSTOMER)).toBe(0)
  })

  it('refuses zero, negative and fractional-centavo amounts', () => {
    for (const amount of [0, -100, 99.5]) {
      expect(useShopStore.getState().recordPayment({ customerId: CUSTOMER, amount }).ok).toBe(false)
    }
  })

  it('refuses an unknown customer and a customer who owes nothing', () => {
    expect(useShopStore.getState().recordPayment({ customerId: 'CUS-999', amount: 100 }).ok).toBe(
      false,
    )
    // Rosa Mendoza has never bought on credit.
    expect(useShopStore.getState().recordPayment({ customerId: 'CUS-008', amount: 100 }).ok).toBe(
      false,
    )
  })

  it('never edits the sales it pays down', () => {
    const before = useShopStore.getState().sales

    useShopStore.getState().recordPayment({ customerId: CUSTOMER, amount: 100 })

    expect(useShopStore.getState().sales).toBe(before)
  })
})

describe('addCustomer', () => {
  beforeEach(reset)

  it('adds a customer with the next id', () => {
    const result = useShopStore
      .getState()
      .addCustomer({ name: '  Liza   Cruz ', phone: ' 0917 555 0199 ' })

    expect(result.ok).toBe(true)
    expect(result.ok && result.customer).toEqual({
      id: 'CUS-009',
      name: 'Liza Cruz',
      phone: '0917 555 0199',
    })
    expect(useShopStore.getState().customers).toHaveLength(SEED_CUSTOMERS.length + 1)
  })

  it('leaves out a blank phone', () => {
    const result = useShopStore.getState().addCustomer({ name: 'Liza Cruz', phone: '  ' })

    expect(result.ok && 'phone' in result.customer).toBe(false)
  })

  it('refuses a blank or duplicate name', () => {
    expect(useShopStore.getState().addCustomer({ name: '' }).ok).toBe(false)
    expect(useShopStore.getState().addCustomer({ name: 'pedro santos' }).ok).toBe(false)
    expect(useShopStore.getState().customers).toHaveLength(SEED_CUSTOMERS.length)
  })

  it('makes the new customer available for credit sales', () => {
    const result = useShopStore.getState().addCustomer({ name: 'Liza Cruz' })

    if (!result.ok) {
      throw new Error(result.message)
    }

    useShopStore.getState().addToCart(PVC, 1)
    const sale = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'credit', amountPaid: 0, customerId: result.customer.id })

    expect(sale.ok && sale.sale.customerName).toBe('Liza Cruz')
    expect(outstandingOf(result.customer.id)).toBe(2800)
  })
})

describe('updateSettings', () => {
  beforeEach(reset)

  it('updates store details, trimmed, keeping fields not mentioned', () => {
    const result = useShopStore.getState().updateSettings({ address: ' Rizal St., Olongapo ' })

    expect(result.ok).toBe(true)
    expect(useShopStore.getState().settings).toEqual({
      ...DEFAULT_STORE_SETTINGS,
      address: 'Rizal St., Olongapo',
    })
  })

  it('stamps a new VAT rate on new sales only', () => {
    useShopStore.getState().addToCart(PVC, 10)
    const before = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 28000, customerId: null })

    expect(useShopStore.getState().updateSettings({ taxRate: 0.1 }).ok).toBe(true)
    expect(useShopStore.getState().taxRate).toBe(0.1)

    useShopStore.getState().addToCart(PVC, 10)
    const after = useShopStore
      .getState()
      .recordSale({ paymentMethod: 'cash', amountPaid: 28000, customerId: null })

    expect(after.ok && after.sale.taxRate).toBe(0.1)
    // The total never changes with the rate: VAT is inclusive (D1).
    expect(after.ok && after.sale.total).toBe(28000)

    const earlier = useShopStore
      .getState()
      .sales.find((sale) => before.ok && sale.id === before.sale.id)

    expect(earlier?.taxRate).toBe(0.12)
    expect(seededSales.every((sale) => sale.taxRate === 0.12)).toBe(true)
  })

  it('refuses an invalid rate or a blank store name and changes nothing', () => {
    const store = useShopStore.getState()

    expect(store.updateSettings({ taxRate: -0.05 }).ok).toBe(false)
    expect(store.updateSettings({ taxRate: 0.12345 }).ok).toBe(false)
    expect(store.updateSettings({ storeName: ' ', address: 'Somewhere' }).ok).toBe(false)

    expect(useShopStore.getState().taxRate).toBe(0.12)
    expect(useShopStore.getState().settings).toEqual(DEFAULT_STORE_SETTINGS)
  })

  it('stores the rate without float noise', () => {
    useShopStore.getState().updateSettings({ taxRate: 0.1 + 0.02 })

    expect(useShopStore.getState().taxRate).toBe(0.12)
  })
})

describe('cart edge cases', () => {
  beforeEach(reset)

  it('refuses an unknown or inactive product and changes nothing', () => {
    useShopStore.setState({
      products: useShopStore
        .getState()
        .products.map((product) =>
          product.id === PVC ? { ...product, isActive: false } : product,
        ),
    })

    const unknown = useShopStore.getState().addToCart('NOPE-001', 1)
    const inactive = useShopStore.getState().addToCart(PVC, 1)

    expect(unknown).toEqual({ ok: false, message: 'That product no longer exists.' })
    expect(inactive.ok).toBe(false)
    expect(inactive.message).toContain('not available for sale')
    expect(useShopStore.getState().cart).toEqual([])
  })

  it('refuses a quantity change above stock, keeping the line', () => {
    useShopStore.getState().addToCart(PVC, 2)

    const result = useShopStore.getState().setCartQuantity(PVC, stockOf(PVC) + 1)

    expect(result.ok).toBe(false)
    expect(result.message).toContain('left in stock')
    expect(useShopStore.getState().cart).toEqual([{ productId: PVC, quantity: 2 }])
  })

  it('removes one line, or clears the whole cart', () => {
    useShopStore.getState().addToCart(PVC, 2)
    useShopStore.getState().addToCart('CEM-001', 1)

    useShopStore.getState().removeFromCart(PVC)
    expect(useShopStore.getState().cart).toEqual([{ productId: 'CEM-001', quantity: 1 }])

    useShopStore.getState().clearCart()
    expect(useShopStore.getState().cart).toEqual([])
  })

  it('refuses a sale whose cart names a product that is gone', () => {
    useShopStore.setState({ cart: [{ productId: 'NOPE-001', quantity: 1 }] })
    const before = useShopStore.getState()

    const result = before.recordSale({ paymentMethod: 'cash', amountPaid: 100, customerId: null })

    expect(result).toEqual({ ok: false, message: 'A product in this sale no longer exists.' })
    expect(useShopStore.getState().sales).toBe(before.sales)
  })

  it('refuses to adjust an unknown product', () => {
    const result = useShopStore
      .getState()
      .adjustStock({ productId: 'NOPE-001', quantityDelta: -1, reason: 'Damaged' })

    expect(result).toEqual({ ok: false, message: 'That product no longer exists.' })
  })
})

// ---------------------------------------------------------------------------
// Phase 4: cancelSale, addProduct, updateProduct, receiveInvoice (specs/04)
// ---------------------------------------------------------------------------

const CLOCK = new Date(2025, 4, 21, 18, 0)

function phase4Store(storage = createMemoryStorage()) {
  let clock = CLOCK
  const store = createShopStore({ storage: () => storage, now: () => clock })

  return {
    store,
    storage,
    setClock: (next: Date) => {
      clock = next
    },
  }
}

type Phase4Store = ReturnType<typeof phase4Store>['store']

function stockIn(store: Phase4Store, productId: string): number {
  return store.getState().products.find((product) => product.id === productId)?.stock ?? -1
}

/** The records an action may write: a refused call must leave every one untouched. */
function recordsOf(store: Phase4Store) {
  const { products, sales, movements, payments, invoices, customers } = store.getState()

  return { products, sales, movements, payments, invoices, customers }
}

function expectStockMatchesMovements(store: Phase4Store) {
  const { products, movements } = store.getState()

  for (const product of products) {
    expect(stockFromMovements(movements, product.id), product.id).toBe(product.stock)
  }
}

type SalePayment = {
  paymentMethod: 'cash' | 'partial' | 'credit'
  amountPaid: number
  customerId: string | null
}

const CASH: SalePayment = { paymentMethod: 'cash', amountPaid: 10_000_000, customerId: null }
const CREDIT: SalePayment = { paymentMethod: 'credit', amountPaid: 0, customerId: CUSTOMER }

function sell(store: Phase4Store, lines: [string, number][], payment: SalePayment = CASH) {
  for (const [productId, quantity] of lines) {
    expect(store.getState().addToCart(productId, quantity).ok).toBe(true)
  }

  const result = store.getState().recordSale(payment)

  if (!result.ok) {
    throw new Error(result.message)
  }

  return result.sale
}

describe('cancelSale', () => {
  it('cancels a cash sale, stamps it and returns the stock through reversals (S1, S8)', () => {
    const { store, setClock } = phase4Store()
    const pvcBefore = stockIn(store, PVC)
    const cementBefore = stockIn(store, 'CEM-001')
    const sale = sell(store, [
      [PVC, 3],
      ['CEM-001', 2],
    ])
    const salesCount = store.getState().sales.length
    const cancelledAt = new Date(2025, 4, 21, 18, 30)
    setClock(cancelledAt)

    const result = store.getState().cancelSale({ saleId: sale.id, reason: '  Wrong item  ' })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.sale).toEqual({
      ...sale,
      status: 'cancelled',
      cancellation: {
        cancelledAt: cancelledAt.toISOString(),
        cancelledBy: sale.recordedBy,
        reason: 'Wrong item',
      },
    })
    expect(result.movements.map((movement) => [movement.type, movement.quantityDelta])).toEqual([
      ['sale_reversal', 3],
      ['sale_reversal', 2],
    ])
    expect(result.movements[0].id).toBe(`MOV-REV-${sale.id}-${PVC}`)

    const state = store.getState()
    // Still in history; nothing deleted.
    expect(state.sales).toHaveLength(salesCount)
    expect(state.sales.find((candidate) => candidate.id === sale.id)).toEqual(result.sale)
    expect(state.movements.slice(-2)).toEqual(result.movements)
    expect(stockIn(store, PVC)).toBe(pvcBefore)
    expect(stockIn(store, 'CEM-001')).toBe(cementBefore)
    expectStockMatchesMovements(store)
  })

  it('refuses a blank or over-long reason and writes nothing (S2)', () => {
    const { store } = phase4Store()
    const sale = sell(store, [[PVC, 1]])
    const before = recordsOf(store)

    for (const reason of ['', '   ', 'x'.repeat(CANCEL_REASON_MAX + 1)]) {
      expect(store.getState().cancelSale({ saleId: sale.id, reason }).ok).toBe(false)
    }

    expect(recordsOf(store)).toEqual(before)
    expect(store.getState().sales).toBe(before.sales)
  })

  it('accepts a reason of exactly the maximum length', () => {
    const { store } = phase4Store()
    const sale = sell(store, [[PVC, 1]])
    const reason = 'x'.repeat(CANCEL_REASON_MAX)

    expect(store.getState().cancelSale({ saleId: sale.id, reason }).ok).toBe(true)
  })

  it('refuses a second cancel, even with a blank reason, keeping one set of reversals (S3)', () => {
    const { store } = phase4Store()
    const sale = sell(store, [[PVC, 4]])

    expect(store.getState().cancelSale({ saleId: sale.id, reason: 'Wrong item' }).ok).toBe(true)

    const before = recordsOf(store)
    const refused = { ok: false, message: SALE_ALREADY_CANCELLED_MESSAGE }

    expect(store.getState().cancelSale({ saleId: sale.id, reason: 'Again' })).toEqual(refused)
    // "Already cancelled" wins over the reason check, so the screen says the useful thing.
    expect(store.getState().cancelSale({ saleId: sale.id, reason: '' })).toEqual(refused)
    expect(recordsOf(store)).toEqual(before)
    expect(
      store.getState().movements.filter((movement) => movement.type === 'sale_reversal'),
    ).toHaveLength(1)
    expectStockMatchesMovements(store)
  })

  it('refuses a credit sale a customer payment was applied to, and writes nothing (S4)', () => {
    const { store } = phase4Store()
    // A clean ledger, so the payment can only be applied to this sale.
    store.setState({ sales: [], payments: [] })
    const sale = sell(store, [[PVC, 2]], CREDIT)

    expect(store.getState().recordPayment({ customerId: CUSTOMER, amount: 100 }).ok).toBe(true)

    const before = recordsOf(store)
    const result = store.getState().cancelSale({ saleId: sale.id, reason: 'Wrong item' })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toContain('has already paid')
    expect(recordsOf(store)).toEqual(before)
  })

  it('cancels an unpaid credit sale and takes it off the balance (S5)', () => {
    const { store } = phase4Store()
    const owed = () =>
      computeOutstanding(store.getState().sales, store.getState().payments, CUSTOMER)
    const owedBefore = owed()
    const sale = sell(store, [[PVC, 2]], CREDIT)

    expect(owed()).toBe(owedBefore + sale.balanceDue)
    expect(store.getState().cancelSale({ saleId: sale.id, reason: 'Changed mind' }).ok).toBe(true)
    expect(owed()).toBe(owedBefore)
  })

  it('cancels a partial sale whose only money is the down payment at the counter', () => {
    const { store } = phase4Store()
    store.setState({ sales: [], payments: [] })
    const sale = sell(store, [[PVC, 2]], { ...CREDIT, paymentMethod: 'partial', amountPaid: 1000 })

    expect(store.getState().cancelSale({ saleId: sale.id, reason: 'Wrong item' }).ok).toBe(true)
    expect(computeOutstanding(store.getState().sales, store.getState().payments, CUSTOMER)).toBe(0)
  })

  it('returns stock to a product deactivated since the sale (S6)', () => {
    const { store } = phase4Store()
    const before = stockIn(store, PVC)
    const sale = sell(store, [[PVC, 5]])

    expect(store.getState().updateProduct(PVC, { isActive: false }).ok).toBe(true)
    expect(store.getState().cancelSale({ saleId: sale.id, reason: 'Wrong item' }).ok).toBe(true)
    expect(stockIn(store, PVC)).toBe(before)
    expect(store.getState().products.find((product) => product.id === PVC)?.isActive).toBe(false)
  })

  it('refuses an unknown sale id (S7)', () => {
    const { store } = phase4Store()
    const before = recordsOf(store)

    expect(store.getState().cancelSale({ saleId: 'SALE-NOPE', reason: 'Wrong item' })).toEqual({
      ok: false,
      message: SALE_NOT_FOUND_MESSAGE,
    })
    expect(recordsOf(store)).toEqual(before)
  })

  it('refuses a sale whose product is no longer in the list, and writes nothing', () => {
    const { store } = phase4Store()
    const orphan = testSale({
      id: 'SALE-ORPHAN',
      occurredAt: CLOCK.toISOString(),
      lines: [testLine(PVC, 2800, 1), testLine('GONE-001', 500, 2, 'Old Hinge')],
    })
    store.setState({ sales: [...store.getState().sales, orphan] })
    const before = recordsOf(store)

    const result = store.getState().cancelSale({ saleId: orphan.id, reason: 'Wrong item' })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toContain('Old Hinge')
    expect(recordsOf(store)).toEqual(before)
  })

  it('survives a reload with the same sale and movements (M4)', () => {
    const { store, storage } = phase4Store()
    const sale = sell(store, [[PVC, 2]])

    expect(store.getState().cancelSale({ saleId: sale.id, reason: 'Wrong item' }).ok).toBe(true)

    const reloaded = phase4Store(storage).store

    expect(reloaded.getState().dataRecovery).toBeNull()
    expect(reloaded.getState().sales).toEqual(store.getState().sales)
    expect(reloaded.getState().movements).toEqual(store.getState().movements)
    expect(stockIn(reloaded, PVC)).toBe(stockIn(store, PVC))
  })
})

describe('addProduct', () => {
  const valid = {
    name: '  Hose   Clamp 1" ',
    category: 'plumbing',
    unit: 'PCS',
    price: 1500,
    reorderLevel: 5,
    openingStock: 25,
    isActive: true,
  }

  it('adds the product with a generated SKU and its opening movement (S1)', () => {
    const { store } = phase4Store()
    const sku = nextProductSku('Plumbing', store.getState().products) ?? 'PLU-?'
    const productCount = store.getState().products.length

    const result = store.getState().addProduct(valid)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.product).toEqual({
      id: sku,
      sku,
      name: 'Hose Clamp 1"',
      category: 'Plumbing',
      unit: 'pcs',
      price: 1500,
      stock: 25,
      reorderLevel: 5,
      isActive: true,
    })
    expect(result.movement).toMatchObject({
      id: `MOV-OPEN-${sku}`,
      productId: sku,
      type: 'stock_in',
      quantityDelta: 25,
      occurredAt: CLOCK.toISOString(),
    })

    const state = store.getState()
    expect(state.products).toHaveLength(productCount + 1)
    expect(state.products.at(-1)).toEqual(result.product)
    expect(state.movements.at(-1)).toEqual(result.movement)
    expect(stockFromMovements(state.movements, sku)).toBe(25)
    expectStockMatchesMovements(store)
  })

  it('writes the opening movement even at zero stock (S2)', () => {
    const { store } = phase4Store()

    const result = store.getState().addProduct({ ...valid, openingStock: 0 })

    expect(result.ok).toBe(true)
    expect(result.ok && result.movement.quantityDelta).toBe(0)
    expect(result.ok && result.product.stock).toBe(0)
  })

  it('numbers products in one category one after another', () => {
    const { store } = phase4Store()

    const first = store.getState().addProduct({ ...valid, category: 'Garden', name: 'Rake' })
    const second = store.getState().addProduct({ ...valid, category: 'garden', name: 'Hoe' })

    expect(first.ok && first.product.sku).toBe('GAR-001')
    expect(second.ok && second.product.sku).toBe('GAR-002')
    expect(second.ok && second.product.category).toBe('Garden')
  })

  it('refuses every invalid input and writes nothing (S3)', () => {
    const { store } = phase4Store()
    const before = recordsOf(store)
    const existingName = store.getState().products[0].name.toUpperCase()

    const invalid = [
      { ...valid, name: '   ' },
      { ...valid, name: existingName },
      { ...valid, name: 'x'.repeat(81) },
      { ...valid, category: '' },
      { ...valid, category: '123' },
      { ...valid, unit: ' ' },
      { ...valid, price: 0 },
      { ...valid, price: -100 },
      { ...valid, price: 10.5 },
      { ...valid, reorderLevel: -1 },
      { ...valid, openingStock: 2.5 },
      { ...valid, openingStock: -1 },
      { ...valid, isActive: 'yes' as unknown as boolean },
    ]

    for (const input of invalid) {
      const result = store.getState().addProduct(input)

      expect(result.ok, JSON.stringify(input)).toBe(false)
      expect(!result.ok && result.message).toBeTruthy()
    }

    expect(recordsOf(store)).toEqual(before)
  })

  it('refuses when the opening movement id is already taken, and writes nothing', () => {
    const { store } = phase4Store()
    const sku = nextProductSku('Plumbing', store.getState().products) ?? 'PLU-?'
    const stray = testMovement({
      id: `MOV-OPEN-${sku}`,
      occurredAt: CLOCK.toISOString(),
      productId: sku,
    })
    store.setState({ movements: [...store.getState().movements, stray] })
    const before = recordsOf(store)

    expect(store.getState().addProduct(valid)).toEqual({
      ok: false,
      message: 'This product cannot be added.',
    })
    expect(recordsOf(store)).toEqual(before)
  })

  it('can be sold straight away (S4)', () => {
    const { store } = phase4Store()
    const added = store.getState().addProduct(valid)

    if (!added.ok) throw new Error(added.message)

    const sale = sell(store, [[added.product.id, 3]])

    expect(sale.lines[0]).toMatchObject({ productId: added.product.id, unitPrice: 1500 })
    expect(stockIn(store, added.product.id)).toBe(22)
    expectStockMatchesMovements(store)
  })
})

describe('updateProduct', () => {
  function pvc(store: Phase4Store) {
    const product = store.getState().products.find((candidate) => candidate.id === PVC)

    if (!product) throw new Error('PVC missing from the seed')

    return product
  }

  it('changes only the editable fields; past sales keep their copies (S5)', () => {
    const { store } = phase4Store()
    const sale = sell(store, [[PVC, 1]])
    const original = pvc(store)

    const result = store.getState().updateProduct(PVC, {
      name: '  PVC Pipe  Half Inch ',
      category: 'plumbing',
      price: 3100,
      reorderLevel: 0,
      isActive: false,
    })

    expect(result).toEqual({ ok: true, message: 'Product saved.' })
    expect(pvc(store)).toEqual({
      ...original,
      name: 'PVC Pipe Half Inch',
      category: 'Plumbing',
      price: 3100,
      reorderLevel: 0,
      isActive: false,
    })

    const kept = store.getState().sales.find((candidate) => candidate.id === sale.id)

    expect(kept?.lines[0]).toEqual(sale.lines[0])
    expect(kept?.lines[0].unitPrice).toBe(original.price)
  })

  it('ignores SKU, unit and stock even if sent', () => {
    const { store } = phase4Store()
    const original = pvc(store)
    const sneaky = { price: 3000, sku: 'X-1', unit: 'box', stock: 999 }

    expect(store.getState().updateProduct(PVC, sneaky).ok).toBe(true)
    expect(pvc(store)).toEqual({ ...original, price: 3000 })
  })

  it('lets a product keep its own name in another case', () => {
    const { store } = phase4Store()

    expect(store.getState().updateProduct(PVC, { name: pvc(store).name.toLowerCase() }).ok).toBe(
      true,
    )
  })

  it('treats no changes as a save that changes nothing', () => {
    const { store } = phase4Store()
    const before = pvc(store)

    expect(store.getState().updateProduct(PVC, {}).ok).toBe(true)
    expect(pvc(store)).toEqual(before)
  })

  it('refuses an unknown product and invalid changes, writing nothing', () => {
    const { store } = phase4Store()
    const before = recordsOf(store)
    const otherName = store.getState().products.find((product) => product.id !== PVC)?.name ?? ''

    expect(store.getState().updateProduct('NOPE-001', { price: 100 })).toEqual({
      ok: false,
      message: 'That product no longer exists.',
    })

    const invalid = [
      { name: '' },
      { name: otherName.toUpperCase() },
      { category: '!!' },
      { price: 0 },
      { price: 99.5 },
      { reorderLevel: -1 },
      { reorderLevel: 1.5 },
      { isActive: 'no' as unknown as boolean },
    ]

    for (const changes of invalid) {
      const result = store.getState().updateProduct(PVC, changes)

      expect(result.ok, JSON.stringify(changes)).toBe(false)
      expect(result.message).toBeTruthy()
    }

    expect(recordsOf(store)).toEqual(before)
  })
})

describe('receiveInvoice', () => {
  const valid = {
    invoiceNumber: ' inv-20001 ',
    supplier: '  Ram   Hardware ',
    invoiceDate: '2025-05-20',
    total: 500_000,
    lines: [
      { productId: PVC, quantity: 10 },
      { productId: 'CEM-001', quantity: 5 },
    ],
    note: '  Two boxes damaged on arrival ',
  }

  it('records the invoice and one stock_in per line, raising stock (S1)', () => {
    const { store } = phase4Store()
    const pvcBefore = stockIn(store, PVC)
    const cementBefore = stockIn(store, 'CEM-001')
    const invoiceCount = store.getState().invoices.length

    const result = store.getState().receiveInvoice(valid)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.invoice).toMatchObject({
      invoiceNumber: 'INV-20001',
      supplier: 'Ram Hardware',
      invoiceDate: '2025-05-20',
      total: 500_000,
      note: 'Two boxes damaged on arrival',
      recordedAt: CLOCK.toISOString(),
    })
    expect(result.invoice.lines.map((line) => [line.productId, line.quantity])).toEqual([
      [PVC, 10],
      ['CEM-001', 5],
    ])
    expect(
      result.movements.map((movement) => [movement.type, movement.reference, movement.productId]),
    ).toEqual([
      ['stock_in', 'INV-20001', PVC],
      ['stock_in', 'INV-20001', 'CEM-001'],
    ])

    const state = store.getState()
    expect(state.invoices).toHaveLength(invoiceCount + 1)
    expect(state.invoices.at(-1)).toEqual(result.invoice)
    expect(state.movements.slice(-2)).toEqual(result.movements)
    expect(stockIn(store, PVC)).toBe(pvcBefore + 10)
    expect(stockIn(store, 'CEM-001')).toBe(cementBefore + 5)
    expectStockMatchesMovements(store)
  })

  it('merges a product listed twice into one line (S4)', () => {
    const { store } = phase4Store()
    const before = stockIn(store, PVC)

    const result = store.getState().receiveInvoice({
      ...valid,
      lines: [
        { productId: PVC, quantity: 4 },
        { productId: PVC, quantity: 6 },
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.invoice.lines).toHaveLength(1)
    expect(result.invoice.lines[0].quantity).toBe(10)
    expect(result.movements).toHaveLength(1)
    expect(stockIn(store, PVC)).toBe(before + 10)
    expectStockMatchesMovements(store)
  })

  it('accepts an invoice dated today and leaves a blank note out', () => {
    const { store } = phase4Store()

    const result = store
      .getState()
      .receiveInvoice({ ...valid, invoiceDate: toDayKey(CLOCK), note: '   ' })

    expect(result.ok).toBe(true)
    expect(result.ok && result.invoice.note).toBeNull()
  })

  it('refuses a number already used, on an invoice or an older receipt (S2)', () => {
    const { store } = phase4Store()

    expect(store.getState().receiveInvoice(valid).ok).toBe(true)

    const before = recordsOf(store)
    const seeded = store
      .getState()
      .movements.find(
        (movement) => /^INV-\d{5}$/.test(movement.reference) && movement.reference !== 'INV-20001',
      )

    expect(store.getState().receiveInvoice({ ...valid, invoiceNumber: 'INV-20001' })).toEqual({
      ok: false,
      message: 'INV-20001 is already recorded.',
    })
    expect(seeded).toBeDefined()
    expect(
      store.getState().receiveInvoice({ ...valid, invoiceNumber: ` ${seeded?.reference ?? ''} ` })
        .ok,
    ).toBe(false)
    expect(recordsOf(store)).toEqual(before)
  })

  it('refuses the whole invoice when anything is wrong, with no partial save (S3)', () => {
    const { store } = phase4Store()
    const before = recordsOf(store)

    const invalid = [
      { ...valid, invoiceNumber: '10021' },
      { ...valid, supplier: '   ' },
      { ...valid, supplier: 'x'.repeat(81) },
      { ...valid, invoiceDate: '' },
      { ...valid, invoiceDate: '2025-02-30' },
      { ...valid, invoiceDate: '2025-05-22' },
      { ...valid, total: 0 },
      { ...valid, total: 100.5 },
      { ...valid, lines: [] },
      { ...valid, lines: [...valid.lines, { productId: 'GONE-001', quantity: 1 }] },
      { ...valid, lines: [{ productId: PVC, quantity: 0 }] },
      { ...valid, lines: [{ productId: PVC, quantity: -3 }] },
      { ...valid, lines: [{ productId: PVC, quantity: 1.5 }] },
      {
        ...valid,
        lines: [
          { productId: PVC, quantity: Number.MAX_SAFE_INTEGER },
          { productId: PVC, quantity: 1 },
        ],
      },
      { ...valid, note: 'x'.repeat(201) },
    ]

    for (const input of invalid) {
      const result = store.getState().receiveInvoice(input)

      expect(result.ok, JSON.stringify(input).slice(0, 120)).toBe(false)
      expect(!result.ok && result.message).toBeTruthy()
    }

    expect(recordsOf(store)).toEqual(before)
  })

  it('survives a reload, and a reset brings back the seed invoices (S5)', () => {
    const { store, storage } = phase4Store()
    const seededInvoices = store.getState().invoices

    expect(store.getState().receiveInvoice(valid).ok).toBe(true)
    expect(JSON.parse(storage.dump()[SHOP_STORAGE_KEY]).state.invoices).toHaveLength(
      seededInvoices.length + 1,
    )

    const reloaded = phase4Store(storage).store

    expect(reloaded.getState().dataRecovery).toBeNull()
    expect(reloaded.getState().invoices).toEqual(store.getState().invoices)

    reloaded.getState().resetToSeedData()

    expect(reloaded.getState().invoices).toEqual(seededInvoices)
  })
})
