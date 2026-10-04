import { describe, expect, it } from 'vitest'

import { SEED_CUSTOMERS } from '@/data/mock/customers'
import { SEED_PRODUCTS } from '@/data/mock/catalog'
import { buildSeedHistory } from '@/data/mock/seedSales'
import { byOccurredAt, toDayKey } from '@/domain/dates'
import {
  isOpeningStockMovement,
  OPENING_STOCK_REFERENCE,
  stockFromMovements,
  summarizeMovements,
} from '@/domain/inventory'
import { buildLedgerStatement, computeOutstandingByCustomer } from '@/domain/ledger'
import { applyRate } from '@/domain/money'
import { parseSaleSequence } from '@/domain/sale'

const now = new Date(2025, 4, 21, 18, 0)
const history = buildSeedHistory(SEED_PRODUCTS, SEED_CUSTOMERS, 0.12, now)

const yesterday = new Date(2025, 4, 20, 12, 0)

describe('seed history', () => {
  it('has supplier receipts with INV-NNNNN references', () => {
    const receipts = history.movements.filter(
      (movement) => movement.type === 'stock_in' && !isOpeningStockMovement(movement),
    )

    expect(receipts.length).toBeGreaterThanOrEqual(3)
    expect(receipts.every((movement) => /^INV-\d{5}$/.test(movement.reference))).toBe(true)
    expect(receipts.every((movement) => movement.quantityDelta > 0)).toBe(true)
  })

  it('has adjustments that each carry a reason', () => {
    const adjustments = history.movements.filter((movement) => movement.type === 'adjustment')

    expect(adjustments.length).toBeGreaterThanOrEqual(2)
    expect(adjustments.every((movement) => (movement.reason ?? '').length > 0)).toBe(true)
  })

  it('gives every movement a unique id', () => {
    const ids = history.movements.map((movement) => movement.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has payments from named customers that never overpay', () => {
    expect(history.payments.length).toBeGreaterThanOrEqual(3)

    for (const payment of history.payments) {
      expect(Number.isInteger(payment.amount)).toBe(true)
      expect(payment.amount).toBeGreaterThan(0)
      expect(SEED_CUSTOMERS.some((customer) => customer.id === payment.customerId)).toBe(true)

      // The running balance never dips below zero at any point.
      const statement = buildLedgerStatement(history.sales, history.payments, payment.customerId)

      expect(statement.every((entry) => entry.balance >= 0)).toBe(true)
    }
  })

  it('leaves several customers owing and settles at least one in full', () => {
    const balances = [...computeOutstandingByCustomer(history.sales, history.payments).values()]

    expect(balances.filter((balance) => balance > 0).length).toBeGreaterThanOrEqual(3)
    expect(balances).toContain(0)
  })

  it('computes partial payments with applyRate, in whole centavos', () => {
    const partials = history.sales.filter((sale) => sale.paymentMethod === 'partial')

    expect(partials.length).toBeGreaterThan(0)

    for (const sale of partials) {
      expect(Number.isSafeInteger(sale.amountPaid)).toBe(true)
      expect(sale.amountPaid + sale.balanceDue).toBe(sale.total)
      expect([0.4, 0.5, 0.6].map((share) => applyRate(sale.total, share))).toContain(
        sale.amountPaid,
      )
    }
  })
})

describe('seed stock and movements', () => {
  it('makes the movements of every product add up to its catalogue stock', () => {
    for (const product of SEED_PRODUCTS) {
      const own = history.movements.filter((movement) => movement.productId === product.id)

      expect(stockFromMovements(history.movements, product.id), product.id).toBe(product.stock)
      expect(summarizeMovements(own).net, product.id).toBe(product.stock)
    }
  })

  it('opens every product with one opening-stock movement, before its history', () => {
    const openings = history.movements.filter(isOpeningStockMovement)

    expect(openings.map((opening) => opening.productId).sort()).toEqual(
      SEED_PRODUCTS.map((product) => product.id).sort(),
    )

    for (const opening of openings) {
      expect(opening).toMatchObject({
        type: 'stock_in',
        reference: OPENING_STOCK_REFERENCE,
        description: 'Opening stock',
        reason: null,
      })
      expect(opening.quantityDelta).toBeGreaterThanOrEqual(0)

      const others = history.movements.filter(
        (movement) => movement.productId === opening.productId && movement !== opening,
      )
      const openedAt = new Date(opening.occurredAt).getTime()

      expect(others.every((movement) => new Date(movement.occurredAt).getTime() > openedAt)).toBe(
        true,
      )
    }
  })

  it('never takes a product below zero at any point in the history', () => {
    for (const product of SEED_PRODUCTS) {
      let onHand = 0

      const own = history.movements
        .filter((movement) => movement.productId === product.id)
        .sort(byOccurredAt)

      for (const movement of own) {
        onHand += movement.quantityDelta
        expect(onHand, `${product.id} at ${movement.occurredAt}`).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('seed dates', () => {
  function seedAt(clock: Date) {
    const seeded = buildSeedHistory(SEED_PRODUCTS, SEED_CUSTOMERS, 0.12, clock)

    return { seeded, all: [...seeded.sales, ...seeded.movements, ...seeded.payments] }
  }

  it.each([
    ['early morning', new Date(2025, 4, 21, 1, 0)],
    ['just after midnight', new Date(2025, 4, 21, 0, 0, 30)],
    ['mid-morning', new Date(2025, 4, 21, 10, 0)],
    ['late evening', new Date(2025, 4, 21, 23, 30)],
  ])('shows sales today and yesterday and nothing in the future (%s)', (_, clock) => {
    const { seeded, all } = seedAt(clock)

    expect(all.every((record) => new Date(record.occurredAt).getTime() <= clock.getTime())).toBe(
      true,
    )

    const days = seeded.sales.map((sale) => toDayKey(sale.occurredAt))

    expect(days.filter((day) => day === toDayKey(clock)).length).toBeGreaterThanOrEqual(5)
    expect(days.filter((day) => day === toDayKey(yesterday)).length).toBeGreaterThanOrEqual(3)
    expect(days.every((day) => day === toDayKey(clock) || day === toDayKey(yesterday))).toBe(true)

    // Seeded oldest first, and still in that order once fitted into the day.
    const times = seeded.sales.map((sale) => new Date(sale.occurredAt).getTime())

    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it('keeps the written times of day once the day is past them', () => {
    const { seeded } = seedAt(new Date(2025, 4, 21, 23, 30))
    const first = new Date(seeded.sales[0].occurredAt)
    const last = new Date(seeded.sales[seeded.sales.length - 1].occurredAt)

    expect([first.getDate(), first.getHours(), first.getMinutes()]).toEqual([20, 9, 15])
    expect([last.getDate(), last.getHours(), last.getMinutes()]).toEqual([21, 17, 10])
  })

  it('fits today into the hours that have passed at 01:00, leaving yesterday alone', () => {
    const clock = new Date(2025, 4, 21, 1, 0)
    const { seeded } = seedAt(clock)
    const today = seeded.sales.filter((sale) => toDayKey(sale.occurredAt) === toDayKey(clock))

    expect(today.length).toBeGreaterThan(0)

    for (const sale of today) {
      const at = new Date(sale.occurredAt).getTime()

      expect(at).toBeGreaterThanOrEqual(new Date(2025, 4, 21).getTime())
      expect(at).toBeLessThanOrEqual(clock.getTime())
    }

    expect(new Date(seeded.sales[0].occurredAt).getHours()).toBe(9)
  })

  it('numbers sales per day, restarting at 0001', () => {
    for (const clock of [new Date(2025, 4, 21, 1, 0), new Date(2025, 4, 21, 23, 30)]) {
      const { seeded } = seedAt(clock)

      for (const day of [toDayKey(yesterday), toDayKey(clock)]) {
        const sequences = seeded.sales
          .filter((sale) => toDayKey(sale.occurredAt) === day)
          .map((sale) => parseSaleSequence(sale.saleNumber))

        expect(sequences.length).toBeGreaterThan(0)
        expect(sequences).toEqual(sequences.map((_, index) => index + 1))
      }
    }
  })

  it('keeps stock consistent whatever the time of day', () => {
    const { seeded } = seedAt(new Date(2025, 4, 21, 1, 0))

    for (const product of SEED_PRODUCTS) {
      expect(stockFromMovements(seeded.movements, product.id)).toBe(product.stock)
    }
  })
})
