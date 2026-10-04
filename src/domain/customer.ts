import type { Customer, ValidationResult } from '@/domain/types'

export const CUSTOMER_NAME_MAX_LENGTH = 80

/** Spaces, dashes, brackets and a leading + are allowed around 7 to 15 digits. */
const PHONE_CHARACTERS = /^\+?[\d\s()-]+$/

/** Collapses repeated spaces so "Pedro  Santos" and "Pedro Santos" are one name. */
export function normalizeCustomerName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function isValidPhone(raw: string): boolean {
  const cleaned = raw.trim()
  const digits = cleaned.replace(/\D/g, '')

  return PHONE_CHARACTERS.test(cleaned) && digits.length >= 7 && digits.length <= 15
}

/**
 * A new customer needs a name no other customer already has, ignoring case:
 * two "Pedro Santos" rows would split one person's balance across two ledgers.
 * Phone is optional.
 */
export function validateNewCustomer(
  input: { name: string; phone?: string },
  existing: Customer[],
): ValidationResult {
  const name = normalizeCustomerName(input.name)

  if (name === '') {
    return { ok: false, message: 'Enter the customer name.' }
  }

  if (name.length > CUSTOMER_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Keep the name under ${CUSTOMER_NAME_MAX_LENGTH} characters.`,
    }
  }

  const key = name.toLowerCase()

  if (existing.some((customer) => normalizeCustomerName(customer.name).toLowerCase() === key)) {
    return { ok: false, message: `${name} is already a customer.` }
  }

  const phone = input.phone?.trim() ?? ''

  if (phone !== '' && !isValidPhone(phone)) {
    return { ok: false, message: 'Enter a phone number such as 0917 555 0101.' }
  }

  return { ok: true, message: null }
}
