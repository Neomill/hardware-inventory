import { beforeEach, describe, expect, it } from 'vitest'

import { SEED_CUSTOMERS } from '@/data/mock/customers'
import { SEED_PRODUCTS } from '@/data/mock/catalog'
import { toDayKey } from '@/domain/dates'
import { computeOutstanding } from '@/domain/ledger'
import { formatSaleNumber } from '@/domain/sale'
import { createMemoryStorage } from '@/stores/shopPersistence'
import { createShopStore, DEFAULT_STORE_SETTINGS, useShopStore } from '@/stores/useShopStore'

const PVC = 'PVC-050'
const SOLD_OUT = 'SFG-002'
const CUSTOMER = 'CUS-001'

const seededSales = useShopStore.getState().sales
const seededMovements = useShopStore.getState().movements
const seededPayments = useShopStore.getState().payments

function reset() {
  useShopStore.setState({
    products: SEED_PRODUCTS.map((product) => ({ ...product })),
    sales: seededSales,
    movements: seededMovements,
    customers: SEED_CUSTOMERS,
    payments: seededPayments,
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

describe('receiveStock', () => {
  beforeEach(reset)

  it('adds stock and logs a stock_in movement with the supplier invoice', () => {
    const before = stockOf(PVC)
    const movementsBefore = useShopStore.getState().movements.length

    const result = useShopStore.getState().receiveStock({
      productId: PVC,
      quantity: 40,
      supplierInvoice: ' inv-10022 ',
      supplier: 'ABC Trading',
      note: 'Two boxes short, to follow',
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(stockOf(PVC)).toBe(before + 40)
    expect(useShopStore.getState().movements).toHaveLength(movementsBefore + 1)
    expect(result.movement).toMatchObject({
      productId: PVC,
      type: 'stock_in',
      quantityDelta: 40,
      reference: 'INV-10022',
      description: 'Received from ABC Trading',
      note: 'Two boxes short, to follow',
      reason: null,
      recordedBy: 'Juan Dela Cruz',
    })
  })

  it('accepts a delivery with no invoice and gives every movement its own id', () => {
    const first = useShopStore.getState().receiveStock({ productId: PVC, quantity: 1 })
    const second = useShopStore.getState().receiveStock({ productId: PVC, quantity: 1 })

    expect(first.ok && first.movement.reference).toBe('')
    expect(first.ok && first.movement.description).toBe('Stock received')
    expect(first.ok && second.ok && first.movement.id !== second.movement.id).toBe(true)
  })

  it('refuses fractional, zero and negative quantities and changes nothing', () => {
    const before = stockOf(PVC)
    const movementsBefore = useShopStore.getState().movements.length

    for (const quantity of [0, -5, 2.5]) {
      expect(useShopStore.getState().receiveStock({ productId: PVC, quantity }).ok).toBe(false)
    }

    expect(stockOf(PVC)).toBe(before)
    expect(useShopStore.getState().movements).toHaveLength(movementsBefore)
  })

  it('refuses a malformed invoice number', () => {
    const result = useShopStore
      .getState()
      .receiveStock({ productId: PVC, quantity: 5, supplierInvoice: 'INV-2025-0521' })

    expect(result.ok).toBe(false)
  })

  it('refuses an unknown product', () => {
    expect(useShopStore.getState().receiveStock({ productId: 'NOPE', quantity: 5 }).ok).toBe(false)
  })

  it('makes an out-of-stock product sellable again', () => {
    expect(useShopStore.getState().addToCart(SOLD_OUT, 1).ok).toBe(false)

    useShopStore.getState().receiveStock({ productId: SOLD_OUT, quantity: 3 })

    expect(useShopStore.getState().addToCart(SOLD_OUT, 1).ok).toBe(true)
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
