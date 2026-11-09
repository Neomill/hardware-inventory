import { describe, expect, it } from 'vitest'

import {
  CREDIT_PAYMENT_TEXT,
  readJustCompleted,
  receiptPaymentRows,
  saleRecordNote,
} from '@/features/sales/lib/receipt'
import { testLine, testSale } from '@/test/fixtures'

const NOW = '2026-11-09T09:00:00.000Z'

describe('receiptPaymentRows', () => {
  it('shows cash tendered and change for a cash sale', () => {
    const sale = { ...testSale({ occurredAt: NOW, total: 63100, amountPaid: 100000 }) }
    sale.changeGiven = 36900

    expect(receiptPaymentRows(sale)).toEqual([
      { label: 'Paid by Cash', amount: 100000 },
      { label: 'Change', amount: 36900 },
    ])
  })

  it('shows what was paid at the counter and the balance for a partial sale', () => {
    const sale = testSale({
      occurredAt: NOW,
      total: 50000,
      paymentMethod: 'partial',
      amountPaid: 20000,
      customerId: 'CUS-1',
    })

    expect(receiptPaymentRows(sale)).toEqual([
      { label: 'Paid at counter', amount: 20000 },
      { label: 'Balance at time of sale', amount: 30000 },
    ])
  })

  it('has no zero "paid" line for a credit sale and says it went on account', () => {
    const sale = testSale({
      occurredAt: NOW,
      total: 45000,
      paymentMethod: 'credit',
      customerId: 'CUS-1',
    })
    const rows = receiptPaymentRows(sale)

    expect(rows).toEqual([
      { label: 'Payment', text: CREDIT_PAYMENT_TEXT },
      { label: 'Balance at time of sale', amount: 45000 },
    ])
    expect(rows.some((row) => 'amount' in row && row.amount === 0)).toBe(false)
    expect(rows.some((row) => /^Paid/.test(row.label))).toBe(false)
  })
})

describe('saleRecordNote', () => {
  const cash = testSale({
    occurredAt: NOW,
    lines: [testLine('P-1', 1000, 1), testLine('P-2', 2000, 2)],
  })
  const credit = testSale({ occurredAt: NOW, paymentMethod: 'credit', customerId: 'CUS-1' })

  it('confirms the checkout straight after it', () => {
    expect(saleRecordNote(cash, true)).toBe(
      'Stock was reduced for 2 products and this sale is recorded in the sales history.',
    )
    expect(saleRecordNote(credit, true)).toBe(
      'Stock was reduced for 1 product and this sale is recorded in the sales history, with the unpaid balance added to Customer Credit.',
    )
  })

  it('uses neutral wording for a sale opened from the history', () => {
    expect(saleRecordNote(cash, false)).toBe('This sale reduced stock for 2 products.')
    expect(saleRecordNote(credit, false)).toBe(
      'This sale reduced stock for 1 product and added its unpaid balance to Customer Credit.',
    )
  })
})

describe('readJustCompleted', () => {
  it('is true only for the state checkout hands over', () => {
    expect(readJustCompleted({ completed: true })).toBe(true)
    expect(readJustCompleted({ completed: 'yes' })).toBe(false)
    expect(readJustCompleted(null)).toBe(false)
    expect(readJustCompleted(undefined)).toBe(false)
    expect(readJustCompleted('completed')).toBe(false)
  })
})
