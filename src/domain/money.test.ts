import { describe, expect, it } from 'vitest'

import { applyRate, breakDownVat, fromPesos, parseAmountInput, toPesos } from '@/domain/money'

describe('centavo conversion', () => {
  it('round-trips amounts that break in floating point', () => {
    expect(fromPesos(706.72)).toBe(70672)
    expect(toPesos(70672)).toBe(706.72)
  })

  it('subtracts exactly, unlike float pesos', () => {
    // 1000 - 706.72 is 293.28000000000003 in floats.
    expect(fromPesos(1000) - fromPesos(706.72)).toBe(29328)
  })
})

describe('breakDownVat', () => {
  it('splits a total without losing or inventing a centavo', () => {
    for (const total of [63100, 70672, 1, 99, 100, 12345, 999999]) {
      const { net, vat } = breakDownVat(total, 0.12)

      expect(net + vat).toBe(total)
    }
  })

  it('reports the VAT already inside the price', () => {
    // PHP 631.00 inclusive of 12% is PHP 563.39 net plus PHP 67.61 VAT.
    expect(breakDownVat(63100, 0.12)).toEqual({ net: 56339, vat: 6761 })
  })

  it('never adds to the total', () => {
    const total = 63100

    expect(breakDownVat(total, 0.12).net).toBeLessThan(total)
  })
})

describe('applyRate', () => {
  it('returns whole centavos', () => {
    expect(applyRate(63100, 0.05)).toBe(3155)
    expect(Number.isInteger(applyRate(999, 0.075))).toBe(true)
  })
})

describe('parseAmountInput', () => {
  it('accepts what a cashier actually types', () => {
    expect(parseAmountInput('1000')).toBe(100000)
    expect(parseAmountInput('1,000')).toBe(100000)
    expect(parseAmountInput('706.72')).toBe(70672)
    expect(parseAmountInput('706.7')).toBe(70670)
    expect(parseAmountInput('0.05')).toBe(5)
  })

  it('rejects anything that is not an amount', () => {
    for (const raw of ['', '.', 'abc', '1.234', '-5', '1..2']) {
      expect(parseAmountInput(raw)).toBeNull()
    }
  })
})
