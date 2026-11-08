import { describe, expect, it } from 'vitest'

import {
  appliedToSale,
  buildLegacyCancellation,
  buildSaleReversalMovements,
  CANCEL_REASON_MAX,
  cancelledUnitCount,
  checkCancellable,
  describeCounterMoney,
  isLegacyCancellation,
  isSaleCancelled,
  LEGACY_CANCELLATION_REASON,
  validateCancelReason,
} from '@/domain/saleCancellation'
import { RECONCILED_BY } from '@/domain/inventory'
import { testLine, testPayment, testSale } from '@/test/fixtures'

const CUSTOMER = 'CUS-001'

function creditSale(id: string, total: number, occurredAt: string) {
  return testSale({ id, occurredAt, total, paymentMethod: 'credit', customerId: CUSTOMER })
}

const older = creditSale('SALE-A', 100000, '2025-05-20T09:00:00')
const later = creditSale('SALE-S', 50000, '2025-05-21T09:00:00')
const both = [older, later]

describe('validateCancelReason (U1)', () => {
  it('accepts a reason with spaces around it', () => {
    expect(validateCancelReason('  wrong item ')).toEqual({ ok: true, message: null })
  })

  it('refuses blank and whitespace-only reasons', () => {
    expect(validateCancelReason('').message).toBe('Give a reason for cancelling this sale.')
    expect(validateCancelReason('   ').ok).toBe(false)
  })

  it('accepts exactly the limit and refuses one more', () => {
    expect(validateCancelReason('x'.repeat(CANCEL_REASON_MAX)).ok).toBe(true)
    expect(validateCancelReason('x'.repeat(CANCEL_REASON_MAX + 1)).message).toBe(
      'Keep the reason under 120 characters.',
    )
  })
})

describe('appliedToSale', () => {
  it('is 0 for a cash sale (U2)', () => {
    const cash = testSale({ occurredAt: '2025-05-21T09:00:00', customerId: CUSTOMER })

    expect(appliedToSale(cash, [cash], [testPayment(CUSTOMER, 500, '2025-05-21T10:00:00')])).toBe(0)
  })

  it('is 0 for a credit sale with no payments (U3)', () => {
    expect(appliedToSale(later, both, [])).toBe(0)
  })

  it('applies a payment to the oldest charge first (U4)', () => {
    const payments = [testPayment(CUSTOMER, 30000, '2025-05-21T12:00:00')]

    expect(appliedToSale(later, both, payments)).toBe(0)
    expect(appliedToSale(older, both, payments)).toBe(30000)
  })

  it('spills an overpayment of the older charge onto this one (U5)', () => {
    const payments = [testPayment(CUSTOMER, 120000, '2025-05-21T12:00:00')]

    expect(appliedToSale(older, both, payments)).toBe(100000)
    expect(appliedToSale(later, both, payments)).toBe(20000)
  })

  it('counts a payment made before the sale too (allocation ignores payment time)', () => {
    const payments = [testPayment(CUSTOMER, 110000, '2025-05-19T12:00:00')]

    expect(appliedToSale(later, both, payments)).toBe(10000)
  })

  it('is 0 for a cancelled sale, and for a sale missing from the list', () => {
    const cancelled = { ...later, status: 'cancelled' as const }
    const payments = [testPayment(CUSTOMER, 150000, '2025-05-21T12:00:00')]

    expect(appliedToSale(cancelled, [older, cancelled], payments)).toBe(0)
    expect(appliedToSale(later, [older], payments)).toBe(0)
  })

  it('ignores other customers payments', () => {
    expect(
      appliedToSale(later, both, [testPayment('CUS-999', 150000, '2025-05-21T12:00:00')]),
    ).toBe(0)
  })
})

describe('checkCancellable', () => {
  it('refuses an already cancelled sale (U6)', () => {
    const cancelled = { ...later, status: 'cancelled' as const }

    expect(checkCancellable(cancelled, [cancelled], [])).toEqual({
      ok: false,
      kind: 'already_cancelled',
      message: 'This sale is already cancelled.',
    })
  })

  it('refuses when a payment was applied, naming the customer and amount (U7)', () => {
    const check = checkCancellable(later, both, [
      testPayment(CUSTOMER, 120000, '2025-05-21T12:00:00'),
    ])

    expect(check.ok).toBe(false)
    expect(!check.ok && check.kind).toBe('payments_applied')
    expect(!check.ok && check.message).toBe(
      "You can't cancel this sale. Customer CUS-001 has already paid PHP 200.00 toward it " +
        '(payments go to the oldest balance first). Leave the sale as it is and tell the owner. ' +
        'Refunds are not recorded in this version.',
    )
  })

  it('uses the formatter it is given', () => {
    const check = checkCancellable(
      later,
      both,
      [testPayment(CUSTOMER, 120000, '2025-05-21T12:00:00')],
      (amount) => `P${amount}`,
    )

    expect(!check.ok && check.message).toContain('has already paid P20000 toward it')
  })

  it('allows a sale whose customer payments all went to an older charge', () => {
    expect(
      checkCancellable(later, both, [testPayment(CUSTOMER, 30000, '2025-05-21T12:00:00')]),
    ).toEqual({ ok: true })
  })

  it('allows a partial sale with only its down payment', () => {
    const partial = testSale({
      occurredAt: '2025-05-21T09:00:00',
      total: 60000,
      paymentMethod: 'partial',
      amountPaid: 30000,
      customerId: CUSTOMER,
    })

    expect(checkCancellable(partial, [partial], [])).toEqual({ ok: true })
  })
})

describe('buildSaleReversalMovements (U8)', () => {
  const sale = testSale({
    id: 'SALE-9',
    occurredAt: '2025-05-21T09:00:00',
    lines: [testLine('CEM-001', 26000, 2), testLine('PVC-050', 2800, 3)],
  })
  const cancellation = {
    cancelledAt: '2025-05-22T16:15:00.000Z',
    cancelledBy: 'Juan Dela Cruz',
    reason: 'Wrong item',
  }

  it('writes one positive sale_reversal per line, dated at the cancellation', () => {
    const movements = buildSaleReversalMovements(sale, cancellation)

    expect(movements).toEqual([
      {
        id: 'MOV-REV-SALE-9-CEM-001',
        productId: 'CEM-001',
        type: 'sale_reversal',
        quantityDelta: 2,
        reference: sale.saleNumber,
        description: 'Sale cancelled: Wrong item',
        reason: 'Wrong item',
        note: null,
        recordedBy: 'Juan Dela Cruz',
        occurredAt: '2025-05-22T16:15:00.000Z',
      },
      expect.objectContaining({ id: 'MOV-REV-SALE-9-PVC-050', quantityDelta: 3 }),
    ])
  })

  it('merges a product repeated across lines so ids stay unique', () => {
    const repeated = { ...sale, lines: [testLine('A', 100, 1), testLine('A', 100, 4)] }

    expect(buildSaleReversalMovements(repeated, cancellation)).toEqual([
      expect.objectContaining({ productId: 'A', quantityDelta: 5 }),
    ])
  })

  it('counts the units returned', () => {
    expect(cancelledUnitCount(sale)).toBe(5)
  })
})

describe('describeCounterMoney (U9)', () => {
  const tail =
    'The app does not record refunds; any money returned to the customer is handled outside the app.'

  it('cash: what was kept after change', () => {
    const cash = {
      ...testSale({ occurredAt: '2025-05-21T09:00:00', total: 63100 }),
      amountPaid: 100000,
      changeGiven: 36900,
    }

    expect(describeCounterMoney(cash)).toBe(`PHP 631.00 was taken at the counter. ${tail}`)
  })

  it('partial: the down payment', () => {
    const partial = testSale({
      occurredAt: '2025-05-21T09:00:00',
      total: 120000,
      paymentMethod: 'partial',
      amountPaid: 30000,
      customerId: CUSTOMER,
    })

    expect(describeCounterMoney(partial)).toBe(
      `A down payment of PHP 300.00 was taken at the counter. ${tail}`,
    )
  })

  it('credit, and a zero cash sale: nothing taken', () => {
    expect(describeCounterMoney(later)).toBeNull()
    expect(
      describeCounterMoney(testSale({ occurredAt: '2025-05-21T09:00:00', total: 0 })),
    ).toBeNull()
    expect(
      describeCounterMoney(
        testSale({
          occurredAt: '2025-05-21T09:00:00',
          paymentMethod: 'partial',
          amountPaid: 0,
          customerId: CUSTOMER,
        }),
      ),
    ).toBeNull()
  })

  it('uses the formatter it is given', () => {
    const cash = testSale({ occurredAt: '2025-05-21T09:00:00', total: 5000 })

    expect(describeCounterMoney(cash, (amount) => `P${amount}`)).toMatch(/^P5000 was taken/)
  })
})

describe('isSaleCancelled', () => {
  it('reads the status', () => {
    expect(isSaleCancelled({ status: 'cancelled' })).toBe(true)
    expect(isSaleCancelled({ status: 'completed' })).toBe(false)
  })
})

describe('legacy cancellations', () => {
  const at = '2025-05-20T03:00:00.000Z'

  it('builds the placeholder dated at the given time, by the system', () => {
    expect(buildLegacyCancellation(at)).toEqual({
      cancelledAt: at,
      cancelledBy: RECONCILED_BY,
      reason: LEGACY_CANCELLATION_REASON,
    })
    expect(isLegacyCancellation(buildLegacyCancellation(at))).toBe(true)
  })

  it('needs both the placeholder reason and the system as author', () => {
    // A cashier who typed the same words did record a reason.
    expect(
      isLegacyCancellation({
        cancelledAt: at,
        cancelledBy: 'Juan Dela Cruz',
        reason: LEGACY_CANCELLATION_REASON,
      }),
    ).toBe(false)
    expect(
      isLegacyCancellation({ cancelledAt: at, cancelledBy: RECONCILED_BY, reason: 'Wrong item' }),
    ).toBe(false)
    expect(
      isLegacyCancellation({
        cancelledAt: at,
        cancelledBy: 'Ana',
        reason: 'Customer changed mind',
      }),
    ).toBe(false)
  })

  it('is false when there is no cancellation', () => {
    expect(isLegacyCancellation(null)).toBe(false)
    expect(isLegacyCancellation(undefined)).toBe(false)
  })
})
