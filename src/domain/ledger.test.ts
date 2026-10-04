import { describe, expect, it } from 'vitest'

import {
  buildLedgerStatement,
  chargedAmount,
  computeOutstanding,
  computeOutstandingByCustomer,
  computeTotalOutstanding,
  listCustomerBalances,
  listOpenCharges,
  validateCustomerPayment,
} from '@/domain/ledger'
import type { Customer } from '@/domain/types'
import { testPayment, testSale } from '@/test/fixtures'

const at = (day: number, hour = 9) => new Date(2025, 4, day, hour).toISOString()

const PEDRO = 'CUS-002'
const MARIA = 'CUS-003'

const CUSTOMERS: Customer[] = [
  { id: 'CUS-001', name: 'Juan Dela Cruz' },
  { id: PEDRO, name: 'Pedro Santos', phone: '0917 555 0102' },
  { id: MARIA, name: 'Maria Reyes' },
]

/** Pedro: two credit sales and one partial. Maria: one credit sale. Plus a walk-in. */
const SALES = [
  testSale({ id: 'S1', occurredAt: at(10), total: 33333, paymentMethod: 'credit', customerId: PEDRO }),
  testSale({ id: 'S2', occurredAt: at(12), total: 70001, paymentMethod: 'partial', amountPaid: 35001, customerId: PEDRO }),
  testSale({ id: 'S3', occurredAt: at(14), total: 12345, paymentMethod: 'credit', customerId: PEDRO }),
  testSale({ id: 'S4', occurredAt: at(11), total: 20000, paymentMethod: 'credit', customerId: MARIA }),
  testSale({ id: 'S5', occurredAt: at(11), total: 50000, paymentMethod: 'cash' }),
]

describe('chargedAmount', () => {
  it('is the balance left on a credit or partial sale', () => {
    expect(chargedAmount(SALES[0])).toBe(33333)
    expect(chargedAmount(SALES[1])).toBe(35000)
    expect(chargedAmount(SALES[4])).toBe(0)
  })

  it('is nothing for a cancelled sale', () => {
    const cancelled = testSale({
      occurredAt: at(10),
      total: 10000,
      paymentMethod: 'credit',
      customerId: PEDRO,
      status: 'cancelled',
    })

    expect(chargedAmount(cancelled)).toBe(0)
  })
})

describe('computeOutstanding', () => {
  it('sums what each sale left owing, minus payments', () => {
    const payments = [testPayment(PEDRO, 10000, at(15))]

    expect(computeOutstanding(SALES, [], PEDRO)).toBe(33333 + 35000 + 12345)
    expect(computeOutstanding(SALES, payments, PEDRO)).toBe(33333 + 35000 + 12345 - 10000)
    expect(computeOutstanding(SALES, payments, MARIA)).toBe(20000)
  })

  it('settles to exactly zero across three charges and four uneven payments', () => {
    // 80678 owed in odd centavos; paid back in four uneven instalments.
    const payments = [
      testPayment(PEDRO, 10001, at(15)),
      testPayment(PEDRO, 33333, at(16)),
      testPayment(PEDRO, 25000, at(17)),
      testPayment(PEDRO, 80678 - 10001 - 33333 - 25000, at(18)),
    ]

    expect(computeOutstanding(SALES, payments, PEDRO)).toBe(0)
  })

  it('ignores records after the cutoff', () => {
    const payments = [testPayment(PEDRO, 10000, at(15))]

    expect(computeOutstanding(SALES, payments, PEDRO, new Date(2025, 4, 11))).toBe(33333)
    expect(computeOutstanding(SALES, payments, PEDRO, new Date(2025, 4, 14, 12))).toBe(80678)
  })

  it('is zero for a customer with no history', () => {
    expect(computeOutstanding(SALES, [], 'CUS-001')).toBe(0)
  })
})

describe('computeOutstandingByCustomer / computeTotalOutstanding', () => {
  it('keys every customer with activity and ignores walk-ins', () => {
    const payments = [testPayment(MARIA, 20000, at(13))]
    const balances = computeOutstandingByCustomer(SALES, payments)

    expect(balances.get(PEDRO)).toBe(80678)
    expect(balances.get(MARIA)).toBe(0)
    expect(balances.size).toBe(2)
    expect(computeTotalOutstanding(SALES, payments)).toBe(80678)
  })

  it('matches the sum of per-customer outstanding', () => {
    const payments = [testPayment(PEDRO, 1, at(15)), testPayment(MARIA, 19999, at(15))]

    expect(computeTotalOutstanding(SALES, payments)).toBe(
      computeOutstanding(SALES, payments, PEDRO) + computeOutstanding(SALES, payments, MARIA),
    )
  })
})

describe('listOpenCharges', () => {
  it('settles the oldest charge first', () => {
    const open = listOpenCharges(SALES, [testPayment(PEDRO, 40000, at(15))], PEDRO)

    // 40000 clears S1 (33333) and puts 6667 against S2 (35000).
    expect(open.map((charge) => charge.saleId)).toEqual(['S2', 'S3'])
    expect(open[0]).toMatchObject({ charged: 35000, settled: 6667, remaining: 28333 })
    expect(open[1]).toMatchObject({ charged: 12345, settled: 0, remaining: 12345 })
  })

  it('always sums to the outstanding balance', () => {
    const payments = [testPayment(PEDRO, 12345, at(15)), testPayment(PEDRO, 9, at(16))]
    const remaining = listOpenCharges(SALES, payments, PEDRO).reduce(
      (sum, charge) => sum + charge.remaining,
      0,
    )

    expect(remaining).toBe(computeOutstanding(SALES, payments, PEDRO))
  })

  it('is empty once the account is settled', () => {
    expect(listOpenCharges(SALES, [testPayment(MARIA, 20000, at(13))], MARIA)).toEqual([])
  })
})

describe('buildLedgerStatement', () => {
  it('lists charges and payments in date order with a running balance', () => {
    const payments = [testPayment(PEDRO, 30000, at(11), 'PAY-00001'), testPayment(PEDRO, 5000, at(15), 'PAY-00002')]
    const statement = buildLedgerStatement(SALES, payments, PEDRO)

    expect(statement.map((entry) => [entry.type, entry.amount, entry.balance])).toEqual([
      ['charge', 33333, 33333],
      ['payment', -30000, 3333],
      ['charge', 35000, 38333],
      ['charge', 12345, 50678],
      ['payment', -5000, 45678],
    ])
    expect(statement[1].reference).toBe('PAY-00001')
    expect(statement[0].reference).toBe(SALES[0].saleNumber)
    expect(statement[statement.length - 1].balance).toBe(computeOutstanding(SALES, payments, PEDRO))
  })

  it('lists a charge before a payment made at the same moment', () => {
    const payments = [testPayment(MARIA, 20000, at(11))]
    const statement = buildLedgerStatement(SALES, payments, MARIA)

    expect(statement.map((entry) => entry.type)).toEqual(['charge', 'payment'])
    expect(statement.map((entry) => entry.balance)).toEqual([20000, 0])
  })

  it('includes the payment note', () => {
    const payment = { ...testPayment(MARIA, 100, at(12)), note: 'GCash' }

    expect(buildLedgerStatement(SALES, [payment], MARIA)[1].description).toContain('GCash')
  })

  it('is empty for a customer with no credit history', () => {
    expect(buildLedgerStatement(SALES, [], 'CUS-001')).toEqual([])
  })
})

describe('listCustomerBalances', () => {
  it('lists customers who owe, largest balance first', () => {
    const payments = [testPayment(PEDRO, 70000, at(15))]
    const rows = listCustomerBalances(CUSTOMERS, SALES, payments)

    expect(rows.map((row) => [row.customerId, row.outstanding])).toEqual([
      [MARIA, 20000],
      [PEDRO, 10678],
    ])
    expect(rows[1]).toMatchObject({
      customerName: 'Pedro Santos',
      phone: '0917 555 0102',
      totalCharged: 80678,
      totalPaid: 70000,
      openChargeCount: 1,
      oldestOpenChargeAt: at(14),
      lastActivityAt: at(15),
    })
  })

  it('includes settled and inactive customers on request', () => {
    const payments = [testPayment(MARIA, 20000, at(15))]
    const rows = listCustomerBalances(CUSTOMERS, SALES, payments, { includeSettled: true })

    expect(rows).toHaveLength(3)
    expect(rows.find((row) => row.customerId === MARIA)).toMatchObject({
      outstanding: 0,
      openChargeCount: 0,
      oldestOpenChargeAt: null,
    })
    expect(rows.find((row) => row.customerId === 'CUS-001')?.lastActivityAt).toBeNull()
  })
})

describe('validateCustomerPayment', () => {
  it('accepts any whole amount up to the balance', () => {
    expect(validateCustomerPayment({ amount: 1, outstanding: 80678 }).ok).toBe(true)
    expect(validateCustomerPayment({ amount: 80678, outstanding: 80678 }).ok).toBe(true)
  })

  it('refuses an overpayment, even by one centavo', () => {
    const result = validateCustomerPayment({ amount: 80679, outstanding: 80678 })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('more than')
  })

  it('refuses zero, negative and fractional-centavo amounts', () => {
    for (const amount of [0, -100, 10.5, Number.NaN]) {
      expect(validateCustomerPayment({ amount, outstanding: 80678 }).ok).toBe(false)
    }
  })

  it('refuses any payment when nothing is owed', () => {
    expect(validateCustomerPayment({ amount: 100, outstanding: 0 }).message).toContain(
      'no outstanding balance',
    )
  })
})
