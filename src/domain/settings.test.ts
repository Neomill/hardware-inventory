import { describe, expect, it } from 'vitest'

import {
  normalizeTaxRate,
  parseTaxRatePercent,
  validateSettingsUpdate,
  validateTaxRate,
} from '@/domain/settings'

describe('validateTaxRate', () => {
  it('accepts the default, zero, and basis-point rates', () => {
    for (const rate of [0.12, 0, 0.125, 0.075, 0.5]) {
      expect(validateTaxRate(rate).ok).toBe(true)
    }
  })

  it('refuses negative, excessive and non-numeric rates', () => {
    for (const rate of [-0.01, 0.51, 12, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(validateTaxRate(rate).ok).toBe(false)
    }
  })

  it('refuses precision finer than a hundredth of a percent', () => {
    expect(validateTaxRate(0.12345).ok).toBe(false)
  })
})

describe('normalizeTaxRate', () => {
  it('removes float noise', () => {
    expect(normalizeTaxRate(0.1 + 0.02)).toBe(0.12)
    expect(normalizeTaxRate(0.075 * 1)).toBe(0.075)
  })
})

describe('parseTaxRatePercent', () => {
  it('reads a percentage as typed', () => {
    expect(parseTaxRatePercent('12')).toBe(0.12)
    expect(parseTaxRatePercent(' 12.5% ')).toBe(0.125)
    expect(parseTaxRatePercent('0')).toBe(0)
  })

  it('rejects anything that is not a number', () => {
    for (const raw of ['', 'abc', '-12', '12..5', '%']) {
      expect(parseTaxRatePercent(raw)).toBeNull()
    }
  })
})

describe('validateSettingsUpdate', () => {
  it('accepts a partial update', () => {
    expect(validateSettingsUpdate({ address: 'Rizal St.' }).ok).toBe(true)
    expect(validateSettingsUpdate({}).ok).toBe(true)
  })

  it('refuses an empty store name', () => {
    expect(validateSettingsUpdate({ storeName: '  ' }).ok).toBe(false)
  })

  it('refuses an invalid rate', () => {
    expect(validateSettingsUpdate({ storeName: 'Olaer', taxRate: -1 }).ok).toBe(false)
  })
})
