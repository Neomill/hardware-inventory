import { describe, expect, it } from 'vitest'

import { buildSeedData } from '@/stores/shopPersistence'
import { buildDataExport, exportFileName } from '@/features/settings/lib/exportData'
import {
  formatTaxRatePercent,
  settingsFormSchema,
  toSettingsFormValues,
  toSettingsUpdate,
} from '@/features/settings/lib/settingsForm'

const valid = { storeName: 'Olaer Store', address: 'Main St', phone: '+63 912 345 6789', vatPercent: '12' }

function errorFor(values: Partial<typeof valid>, field: keyof typeof valid) {
  const result = settingsFormSchema.safeParse({ ...valid, ...values })

  return result.success ? null : (result.error.flatten().fieldErrors[field]?.[0] ?? null)
}

describe('settings form', () => {
  it('accepts a complete profile', () => {
    expect(settingsFormSchema.safeParse(valid).success).toBe(true)
  })

  it('requires a store name', () => {
    expect(errorFor({ storeName: '   ' }, 'storeName')).toBe('Enter the store name.')
  })

  it('checks the VAT rate as a percent', () => {
    expect(errorFor({ vatPercent: 'twelve' }, 'vatPercent')).toContain('as a number')
    expect(errorFor({ vatPercent: '60' }, 'vatPercent')).toContain('0% to 50%')
    expect(errorFor({ vatPercent: '12.345' }, 'vatPercent')).toContain('two decimal places')
    expect(errorFor({ vatPercent: '12.5%' }, 'vatPercent')).toBeNull()
    expect(errorFor({ vatPercent: '0' }, 'vatPercent')).toBeNull()
  })

  it('rejects letters in the phone number', () => {
    expect(errorFor({ phone: 'call me' }, 'phone')).toContain('digits')
  })

  it('round-trips the rate between percent and fraction', () => {
    expect(formatTaxRatePercent(0.12)).toBe('12')
    expect(formatTaxRatePercent(0.125)).toBe('12.5')
    expect(formatTaxRatePercent(0.07)).toBe('7')
    expect(toSettingsFormValues({ storeName: 'A', address: '', phone: '' }, 0.12).vatPercent).toBe('12')
    expect(toSettingsUpdate({ ...valid, vatPercent: '12.5' }).taxRate).toBe(0.125)
  })
})

describe('data export', () => {
  it('wraps the saved data with its schema version', () => {
    const now = new Date('2025-05-21T10:00:00')
    const seed = buildSeedData(now)
    const exported = buildDataExport({ ...seed, extra: () => 1 } as typeof seed, now)

    expect(exported.app).toBe('olaer-store')
    expect(exported.schemaVersion).toBe(1)
    expect(exported.data.sales).toHaveLength(seed.sales.length)
    expect('extra' in exported.data).toBe(false)
    expect(exportFileName(now)).toBe('olaer-store-data-2025-05-21.json')
  })
})
