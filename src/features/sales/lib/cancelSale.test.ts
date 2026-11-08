import { describe, expect, it } from 'vitest'

import {
  CANCEL_REASON_MAX,
  LEGACY_CANCELLATION_REASON,
  cancelledUnitCount,
} from '@/domain/saleCancellation'
import { RECONCILED_BY } from '@/domain/inventory'
import type { Sale } from '@/domain/types'
import {
  buildCancelPreview,
  cancelDialogTitle,
  cancelReasonError,
  describeCancelledSale,
  isReasonTooLong,
  productCountOf,
  reasonCounter,
} from '@/features/sales/lib/cancelSale'
import { testLine, testSale } from '@/test/fixtures'
import { formatCurrency, formatDateLabel, formatDateTimeShort } from '@/lib/format'

/** Local-time ISO string, so tests pass in any time zone. */
function at(day: number, hour = 12, minute = 0): string {
  return new Date(2026, 10, day, hour, minute).toISOString()
}

const NOW = new Date(2026, 10, 9, 18, 0)

const TWO_LINES = [testLine('P-1', 10000, 3), testLine('P-2', 5000, 2)]

function cancelledCopy(
  sale: Sale,
  reason: string,
  cancelledAt = at(9, 16, 15),
  cancelledBy = 'Juan Dela Cruz',
): Sale {
  return {
    ...sale,
    status: 'cancelled',
    cancellation: { cancelledAt, cancelledBy, reason },
  }
}

describe('cancel dialog wording', () => {
  it('titles the dialog with the sale number', () => {
    expect(cancelDialogTitle({ saleNumber: '#20261109-0007' })).toBe('Cancel sale #20261109-0007?')
  })

  it('counts characters against the limit and flags an over-long reason', () => {
    expect(reasonCounter('Wrong item')).toBe(`10/${CANCEL_REASON_MAX}`)
    expect(isReasonTooLong('x'.repeat(CANCEL_REASON_MAX))).toBe(false)
    expect(isReasonTooLong('x'.repeat(CANCEL_REASON_MAX + 1))).toBe(true)
  })

  it('refuses a blank or over-long reason with the spec messages', () => {
    expect(cancelReasonError('  Wrong item ')).toBeNull()
    expect(cancelReasonError('   ')).toBe('Give a reason for cancelling this sale.')
    expect(cancelReasonError('x'.repeat(CANCEL_REASON_MAX + 1))).toBe(
      'Keep the reason under 120 characters.',
    )
  })
})

describe('buildCancelPreview', () => {
  it('describes a cash sale from today: stock back, out of today, counter money', () => {
    const sale = testSale({ occurredAt: at(9, 10), lines: TWO_LINES })
    const preview = buildCancelPreview(sale, NOW)

    expect(preview.title).toBe(`Cancel sale ${sale.saleNumber}?`)
    expect(preview.total).toBe(formatCurrency(sale.total))
    expect(preview.customer).toBe('Walk-in Customer')
    expect(preview.items).toBe('5 items')
    expect(preview.consequences).toEqual([
      '5 items go back into stock.',
      'It is removed from today’s sales and reports.',
      `${formatCurrency(sale.total)} was taken at the counter. The app does not record refunds; any money returned to the customer is handled outside the app.`,
    ])
  })

  it('names the earlier day and the customer balance for a partial sale', () => {
    const sale = testSale({
      occurredAt: at(2, 10),
      lines: TWO_LINES,
      paymentMethod: 'partial',
      amountPaid: 10000,
      customerId: 'C-1',
    })
    const { consequences } = buildCancelPreview(sale, NOW)

    expect(consequences[1]).toBe(
      `It is removed from the sales and reports for ${formatDateLabel(new Date(sale.occurredAt))}.`,
    )
    expect(consequences[2]).toBe(
      `Customer C-1’s balance goes down by ${formatCurrency(sale.balanceDue)}.`,
    )
    expect(consequences[3]).toMatch(/^A down payment of .+ was taken at the counter\./)
  })

  it('says nothing about counter money for a credit sale, and uses the singular', () => {
    const sale = testSale({
      occurredAt: at(9, 10),
      lines: [testLine('P-1', 10000, 1)],
      paymentMethod: 'credit',
      customerId: 'C-2',
    })
    const { consequences, items } = buildCancelPreview(sale, NOW)

    expect(items).toBe('1 item')
    expect(consequences).toEqual([
      '1 item goes back into stock.',
      'It is removed from today’s sales and reports.',
      `Customer C-2’s balance goes down by ${formatCurrency(sale.total)}.`,
    ])
  })
})

describe('describeCancelledSale', () => {
  it('is null for a sale that stands', () => {
    expect(describeCancelledSale(testSale({ occurredAt: at(9) }))).toBeNull()
  })

  it('says who, when, why and what stock came back', () => {
    const cancelledAt = at(9, 16, 15)
    const sale = cancelledCopy(
      testSale({ occurredAt: at(9, 10), lines: TWO_LINES }),
      'Customer changed his mind',
      cancelledAt,
    )

    expect(describeCancelledSale(sale)).toEqual({
      headline: `Cancelled ${formatDateTimeShort(new Date(cancelledAt))} by Juan Dela Cruz.`,
      reason: 'Reason: Customer changed his mind.',
      stockReturned: 'Stock returned: 5 items across 2 products.',
    })
  })

  it('does not add a second full stop to a reason that has one', () => {
    const sale = cancelledCopy(testSale({ occurredAt: at(9) }), 'Keyed in twice.')

    expect(describeCancelledSale(sale)?.reason).toBe('Reason: Keyed in twice.')
  })

  it('does not claim stock came back for a sale cancelled before reasons were recorded', () => {
    const sale = cancelledCopy(
      testSale({ occurredAt: at(9) }),
      LEGACY_CANCELLATION_REASON,
      at(9, 16, 15),
      RECONCILED_BY,
    )

    expect(describeCancelledSale(sale)?.stockReturned).toBeNull()
  })

  it('still says stock came back when a cashier typed the legacy reason word for word', () => {
    const sale = cancelledCopy(
      testSale({ occurredAt: at(9), lines: TWO_LINES }),
      LEGACY_CANCELLATION_REASON,
    )

    expect(describeCancelledSale(sale)?.stockReturned).toBe(
      'Stock returned: 5 items across 2 products.',
    )
  })

  it('still reads Cancelled for an odd record with no cancellation details', () => {
    const sale: Sale = { ...testSale({ occurredAt: at(9) }), status: 'cancelled' }

    expect(describeCancelledSale(sale)).toEqual({
      headline: 'Cancelled.',
      reason: 'Reason: not recorded.',
      stockReturned: null,
    })
  })

  it('counts distinct products and units from the lines', () => {
    const sale = testSale({ occurredAt: at(9), lines: TWO_LINES })

    expect(productCountOf(sale)).toBe(2)
    expect(cancelledUnitCount(sale)).toBe(5)
  })
})
