import { describe, expect, it } from 'vitest'

import { parseAmountInput } from '@/domain/money'
import {
  AMOUNT_FORMAT_MESSAGE,
  WALK_IN_BALANCE_MESSAGE,
  defaultAmountText,
  evaluateCheckout,
  readAmountInput,
} from '@/features/sales/lib/checkout'

const base = { total: 63100, lineCount: 2 }

describe('readAmountInput', () => {
  it('keeps empty, invalid and an amount apart', () => {
    expect(readAmountInput('')).toEqual({ kind: 'empty' })
    expect(readAmountInput('   ')).toEqual({ kind: 'empty' })
    expect(readAmountInput('abc')).toEqual({ kind: 'invalid' })
    expect(readAmountInput('-5')).toEqual({ kind: 'invalid' })
    expect(readAmountInput('1.234')).toEqual({ kind: 'invalid' })
    expect(readAmountInput('0')).toEqual({ kind: 'amount', amount: 0 })
    expect(readAmountInput('1,250.50')).toEqual({ kind: 'amount', amount: 125050 })
  })
})

describe('defaultAmountText', () => {
  it('starts cash at the exact total, in text that parses back to the same centavos', () => {
    expect(defaultAmountText('cash', 63100)).toBe('631.00')
    expect(parseAmountInput(defaultAmountText('cash', 100005))).toBe(100005)
    // A float-prone total: (total / 100).toFixed(2) is what this replaces.
    expect(parseAmountInput(defaultAmountText('cash', 1_000_000_001))).toBe(1_000_000_001)
  })

  it('starts partial blank', () => {
    expect(defaultAmountText('partial', 63100)).toBe('')
    expect(defaultAmountText('credit', 63100)).toBe('')
  })
})

describe('evaluateCheckout', () => {
  it('confirms exact cash from the default text', () => {
    const state = evaluateCheckout({
      ...base,
      method: 'cash',
      amountText: defaultAmountText('cash', base.total),
      customerId: null,
    })

    expect(state).toEqual({
      amountPaid: 63100,
      amountError: null,
      customerError: null,
      paymentMessage: null,
      canConfirm: true,
    })
  })

  it('reports unparseable cash under the field and never treats it as zero', () => {
    for (const amountText of ['abc', '-100', '12.345']) {
      const state = evaluateCheckout({ ...base, method: 'cash', amountText, customerId: null })

      expect(state.amountPaid).toBeNull()
      expect(state.amountError).toBe(AMOUNT_FORMAT_MESSAGE)
      expect(state.paymentMessage).toBeNull()
      expect(state.canConfirm).toBe(false)
    }
  })

  it('reports an invalid partial amount the same way', () => {
    const state = evaluateCheckout({
      ...base,
      method: 'partial',
      amountText: '1..0',
      customerId: 'C-1',
    })

    expect(state.amountError).toBe(AMOUNT_FORMAT_MESSAGE)
    expect(state.canConfirm).toBe(false)
  })

  it('says cash is short once, under Payment', () => {
    const state = evaluateCheckout({ ...base, method: 'cash', amountText: '500', customerId: null })

    expect(state.amountError).toBeNull()
    expect(state.paymentMessage).toBe('Cash received is less than the total due.')
    expect(state.canConfirm).toBe(false)
  })

  it('states the walk-in rule only under Customer', () => {
    const state = evaluateCheckout({ ...base, method: 'credit', amountText: '', customerId: null })

    expect(state.customerError).toBe(WALK_IN_BALANCE_MESSAGE)
    expect(state.paymentMessage).toBeNull()
    expect(state.canConfirm).toBe(false)
  })

  it('reports a walk-in partial and its missing amount each in its own place', () => {
    const state = evaluateCheckout({ ...base, method: 'partial', amountText: '', customerId: null })

    expect(state.customerError).toBe(WALK_IN_BALANCE_MESSAGE)
    expect(state.paymentMessage).toBe('Enter how much the customer is paying now.')
    expect(state.canConfirm).toBe(false)
  })

  it('confirms a credit sale for a named customer with no amount field', () => {
    const state = evaluateCheckout({
      ...base,
      method: 'credit',
      amountText: 'ignored',
      customerId: 'C-1',
    })

    expect(state).toMatchObject({ amountPaid: 0, amountError: null, canConfirm: true })
  })

  it('confirms a valid partial payment', () => {
    const state = evaluateCheckout({
      ...base,
      method: 'partial',
      amountText: '200',
      customerId: 'C-1',
    })

    expect(state).toMatchObject({ amountPaid: 20000, canConfirm: true, paymentMessage: null })
  })
})
