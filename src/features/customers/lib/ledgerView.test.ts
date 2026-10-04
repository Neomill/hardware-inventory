import { describe, expect, it } from 'vitest'

import type { CustomerBalance } from '@/domain/ledger'
import type { CustomerPayment } from '@/domain/types'
import {
  daysBetween,
  describeAge,
  filterBalances,
  listPaymentHistory,
  summarizeBalances,
} from '@/features/customers/lib/ledgerView'

function balance(overrides: Partial<CustomerBalance> & { customerId: string }): CustomerBalance {
  return {
    customerName: `Customer ${overrides.customerId}`,
    totalCharged: 0,
    totalPaid: 0,
    outstanding: 0,
    openChargeCount: 0,
    oldestOpenChargeAt: null,
    lastActivityAt: null,
    ...overrides,
  }
}

function payment(id: string, customerId: string, occurredAt: string): CustomerPayment {
  return {
    id,
    customerId,
    customerName: customerId,
    amount: 1000,
    note: null,
    recordedBy: 'Tester',
    occurredAt,
  }
}

describe('summarizeBalances', () => {
  it('totals only customers who owe and finds the oldest open charge', () => {
    const summary = summarizeBalances([
      balance({ customerId: 'A', outstanding: 5000, oldestOpenChargeAt: '2025-05-20T10:00:00' }),
      balance({
        customerId: 'B',
        customerName: 'Pedro',
        outstanding: 2500,
        oldestOpenChargeAt: '2025-05-02T08:00:00',
      }),
      balance({ customerId: 'C', outstanding: 0 }),
    ])

    expect(summary.totalOutstanding).toBe(7500)
    expect(summary.customersWithBalance).toBe(2)
    expect(summary.oldestOpenCharge).toEqual({
      occurredAt: '2025-05-02T08:00:00',
      customerId: 'B',
      customerName: 'Pedro',
    })
  })

  it('reports nothing open when everyone is settled', () => {
    const summary = summarizeBalances([balance({ customerId: 'A' })])

    expect(summary).toEqual({ totalOutstanding: 0, customersWithBalance: 0, oldestOpenCharge: null })
  })
})

describe('filterBalances', () => {
  const rows = [
    balance({ customerId: 'A', customerName: 'Juan Dela Cruz', phone: '0917 555 0101' }),
    balance({ customerId: 'B', customerName: 'ABC Construction', phone: '0920 555 0106' }),
    balance({ customerId: 'C', customerName: 'Rosa Mendoza' }),
  ]

  it('returns every row for a blank query', () => {
    expect(filterBalances(rows, '   ')).toHaveLength(3)
  })

  it('matches name words in any order, ignoring case', () => {
    expect(filterBalances(rows, 'cruz juan').map((row) => row.customerId)).toEqual(['A'])
  })

  it('matches phone numbers by digits regardless of spacing', () => {
    expect(filterBalances(rows, '0920555').map((row) => row.customerId)).toEqual(['B'])
    expect(filterBalances(rows, '0917-555-0101').map((row) => row.customerId)).toEqual(['A'])
  })

  it('does not match on one or two stray digits', () => {
    expect(filterBalances(rows, '09')).toEqual([])
  })
})

describe('describeAge', () => {
  const now = new Date(2025, 4, 21, 9, 0)

  it('counts calendar days, not 24-hour periods', () => {
    expect(daysBetween(new Date(2025, 4, 20, 23, 30).toISOString(), now)).toBe(1)
    expect(describeAge(new Date(2025, 4, 21, 1, 0).toISOString(), now)).toBe('Today')
    expect(describeAge(new Date(2025, 4, 20, 8, 0).toISOString(), now)).toBe('Yesterday')
    expect(describeAge(new Date(2025, 4, 9, 8, 0).toISOString(), now)).toBe('12 days ago')
  })

  it('never reports a negative age', () => {
    expect(daysBetween(new Date(2025, 4, 25).toISOString(), now)).toBe(0)
  })
})

describe('listPaymentHistory', () => {
  it('keeps one customer and lists the newest payment first', () => {
    const history = listPaymentHistory(
      [
        payment('PAY-1', 'A', '2025-05-01T10:00:00'),
        payment('PAY-2', 'B', '2025-05-02T10:00:00'),
        payment('PAY-3', 'A', '2025-05-03T10:00:00'),
      ],
      'A',
    )

    expect(history.map((entry) => entry.id)).toEqual(['PAY-3', 'PAY-1'])
  })
})
