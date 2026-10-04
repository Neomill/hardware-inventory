import { beforeEach, describe, expect, it } from 'vitest'

import { SEED_CUSTOMERS } from '@/data/mock/customers'
import { SEED_PRODUCTS } from '@/data/mock/catalog'
import { computeOutstanding } from '@/domain/ledger'
import { DEFAULT_STORE_SETTINGS, useShopStore } from '@/stores/useShopStore'

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
    heldCarts: [],
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

  it('removes a line when its quantity reaches zero', () => {
    useShopStore.getState().addToCart(PVC, 2)
    useShopStore.getState().setCartQuantity(PVC, 0)

    expect(useShopStore.getState().cart).toHaveLength(0)
  })

  it('holds a cart and gives it back', () => {
    useShopStore.getState().addToCart(PVC, 4)

    expect(useShopStore.getState().holdCart().ok).toBe(true)
    expect(useShopStore.getState().cart).toHaveLength(0)
    expect(useShopStore.getState().heldCarts).toHaveLength(1)

    expect(useShopStore.getState().resumeHeldCart().ok).toBe(true)
    expect(useShopStore.getState().cart[0].quantity).toBe(4)
    expect(useShopStore.getState().heldCarts).toHaveLength(0)
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

  it('never lets stock go negative across repeated sales', () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      useShopStore.getState().addToCart(PVC, 10)
      useShopStore.getState().recordSale({
        paymentMethod: 'cash',
        amountPaid: 1_000_000,
        customerId: null,
      })
    }

    expect(stockOf(PVC)).toBeGreaterThanOrEqual(0)
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

    expect(store.adjustStock({ productId: PVC, quantityDelta: -(onHand + 1), reason: 'Lost' }).ok).toBe(
      false,
    )
    expect(stockOf(PVC)).toBe(onHand)

    expect(store.adjustStock({ productId: PVC, quantityDelta: -onHand, reason: 'Lost' }).ok).toBe(true)
    expect(stockOf(PVC)).toBe(0)
  })

  it('requires a reason and a whole, non-zero change', () => {
    const store = useShopStore.getState()
    const movementsBefore = store.movements.length

    expect(store.adjustStock({ productId: PVC, quantityDelta: -1, reason: ' ' }).ok).toBe(false)
    expect(store.adjustStock({ productId: PVC, quantityDelta: 0, reason: 'Recount' }).ok).toBe(false)
    expect(store.adjustStock({ productId: PVC, quantityDelta: 1.5, reason: 'Recount' }).ok).toBe(false)
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
      expect(useShopStore.getState().recordPayment({ customerId: CUSTOMER, amount }).ok).toBe(
        false,
      )
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
