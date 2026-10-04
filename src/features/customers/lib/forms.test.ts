import { describe, expect, it } from 'vitest'

import {
  buildNewCustomerFormSchema,
  buildPaymentFormSchema,
  previewPayment,
  toAmountInput,
} from '@/features/customers/lib/forms'

function amountError(outstanding: number, amount: string): string | undefined {
  const result = buildPaymentFormSchema(outstanding).safeParse({ amount, note: '' })

  return result.success ? undefined : result.error.flatten().fieldErrors.amount?.[0]
}

describe('buildPaymentFormSchema', () => {
  it('accepts an amount up to the full balance, commas and peso sign included', () => {
    expect(amountError(150000, '1,500')).toBeUndefined()
    expect(amountError(150000, '₱250.50')).toBeUndefined()
  })

  it('asks for an amount when the field is blank', () => {
    expect(amountError(150000, '')).toBe('Enter the amount received.')
  })

  it('rejects text that is not an amount', () => {
    expect(amountError(150000, '12.345')).toMatch(/Enter an amount such as/)
    expect(amountError(150000, 'abc')).toMatch(/Enter an amount such as/)
  })

  it('passes through the domain messages for zero and overpayment', () => {
    expect(amountError(150000, '0')).toBe('Enter an amount greater than zero.')
    expect(amountError(150000, '1500.01')).toBe('That is more than the customer owes.')
  })

  it('refuses any payment from a settled customer', () => {
    expect(amountError(0, '10')).toBe('This customer has no outstanding balance.')
  })

  it('limits the note length', () => {
    const result = buildPaymentFormSchema(1000).safeParse({ amount: '5', note: 'x'.repeat(121) })

    expect(result.success).toBe(false)
  })
})

describe('previewPayment', () => {
  it('shows the balance left after a valid amount', () => {
    expect(previewPayment('500', 150000)).toEqual({
      amount: 50000,
      remaining: 100000,
      settlesInFull: false,
    })
  })

  it('flags a payment that clears the account', () => {
    expect(previewPayment(toAmountInput(150050), 150050).settlesInFull).toBe(true)
  })

  it('leaves the balance unchanged for unusable input', () => {
    expect(previewPayment('', 1000)).toEqual({ amount: null, remaining: 1000, settlesInFull: false })
    expect(previewPayment('20', 1000).amount).toBeNull()
  })
})

describe('toAmountInput', () => {
  it('writes centavos as a two-decimal peso amount', () => {
    expect(toAmountInput(150050)).toBe('1500.50')
    expect(toAmountInput(7)).toBe('0.07')
  })
})

describe('buildNewCustomerFormSchema', () => {
  const existing = [{ id: 'CUS-001', name: 'Juan Dela Cruz' }]

  function errors(name: string, phone: string) {
    const result = buildNewCustomerFormSchema(existing).safeParse({ name, phone })

    return result.success ? {} : result.error.flatten().fieldErrors
  }

  it('accepts a new name with or without a phone', () => {
    expect(errors('Ana Lim', '')).toEqual({})
    expect(errors('Ana Lim', '0917 555 0199')).toEqual({})
  })

  it('reports a duplicate name against the name field', () => {
    expect(errors('  juan   dela cruz ', '').name?.[0]).toMatch(/is already a customer/)
  })

  it('reports name and phone problems together', () => {
    const fieldErrors = errors('', '12')

    expect(fieldErrors.name?.[0]).toBe('Enter the customer name.')
    expect(fieldErrors.phone?.[0]).toBe('Enter a phone number such as 0917 555 0101.')
  })
})
