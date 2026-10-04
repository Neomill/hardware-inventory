import { describe, expect, it } from 'vitest'

import { SEED_CUSTOMERS } from '@/data/mock/customers'
import { SEED_PRODUCTS } from '@/data/mock/catalog'
import { buildSeedHistory } from '@/data/mock/seedSales'
import { buildLedgerStatement, computeOutstandingByCustomer } from '@/domain/ledger'

const now = new Date(2025, 4, 21, 18, 0)
const history = buildSeedHistory(SEED_PRODUCTS, SEED_CUSTOMERS, 0.12, now)

describe('seed history', () => {
  it('has supplier receipts with INV-NNNNN references', () => {
    const receipts = history.movements.filter((movement) => movement.type === 'stock_in')

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
})
