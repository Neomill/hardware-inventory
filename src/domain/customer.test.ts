import { describe, expect, it } from 'vitest'

import {
  CUSTOMER_NAME_MAX_LENGTH,
  isValidPhone,
  normalizeCustomerName,
  validateNewCustomer,
} from '@/domain/customer'
import type { Customer } from '@/domain/types'

const EXISTING: Customer[] = [{ id: 'CUS-002', name: 'Pedro Santos' }]

describe('normalizeCustomerName', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeCustomerName('  Pedro   Santos ')).toBe('Pedro Santos')
  })
})

describe('isValidPhone', () => {
  it('accepts local and international formats', () => {
    for (const phone of ['0917 555 0101', '09175550101', '+63 917 555 0101', '(02) 8123-4567']) {
      expect(isValidPhone(phone)).toBe(true)
    }
  })

  it('rejects letters and too few or too many digits', () => {
    for (const phone of ['call me', '12345', '0917-555-01O1', '1234567890123456']) {
      expect(isValidPhone(phone)).toBe(false)
    }
  })
})

describe('validateNewCustomer', () => {
  it('accepts a new name, with or without a phone', () => {
    expect(validateNewCustomer({ name: 'Liza Cruz' }, EXISTING).ok).toBe(true)
    expect(validateNewCustomer({ name: 'Liza Cruz', phone: '' }, EXISTING).ok).toBe(true)
    expect(validateNewCustomer({ name: 'Liza Cruz', phone: '0917 555 0199' }, EXISTING).ok).toBe(
      true,
    )
  })

  it('requires a name', () => {
    expect(validateNewCustomer({ name: '   ' }, EXISTING).ok).toBe(false)
  })

  it('refuses a name over the limit', () => {
    expect(
      validateNewCustomer({ name: 'x'.repeat(CUSTOMER_NAME_MAX_LENGTH + 1) }, EXISTING).ok,
    ).toBe(false)
  })

  it('refuses a duplicate, ignoring case and spacing', () => {
    const result = validateNewCustomer({ name: ' pedro  SANTOS' }, EXISTING)

    expect(result.ok).toBe(false)
    expect(result.message).toContain('already a customer')
  })

  it('refuses a phone that is not a phone number', () => {
    expect(validateNewCustomer({ name: 'Liza Cruz', phone: 'none' }, EXISTING).ok).toBe(false)
  })
})
