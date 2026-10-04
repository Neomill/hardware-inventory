import { describe, expect, it } from 'vitest'

import type { CustomerPayment } from '@/domain/types'
import { describePaymentRecorded } from '@/features/customers/lib/notices'

const payment: CustomerPayment = {
  id: 'PAY-00007',
  customerId: 'CUS-002',
  customerName: 'Pedro Santos',
  amount: 50000,
  note: null,
  recordedBy: 'Tester',
  occurredAt: '2025-05-21T10:00:00',
}

describe('describePaymentRecorded', () => {
  it('states the remaining balance after a part payment', () => {
    const message = describePaymentRecorded(payment, 25050)

    expect(message).toContain('Pedro Santos')
    expect(message).toContain('PAY-00007')
    expect(message).toMatch(/Remaining balance .*250\.50/)
  })

  it('says the account is settled when nothing is left', () => {
    expect(describePaymentRecorded(payment, 0)).toMatch(/fully settled/)
  })
})
