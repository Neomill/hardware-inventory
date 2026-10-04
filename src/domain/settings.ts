import type { StoreSettings, ValidationResult } from '@/domain/types'

/** Rates are kept to basis-point precision: 0.125 is fine, 0.12345 is not. */
const RATE_SCALE = 10_000

export const MAX_TAX_RATE = 0.5

/** Rounds away float noise such as 0.07500000000000001. */
export function normalizeTaxRate(rate: number): number {
  return Math.round(rate * RATE_SCALE) / RATE_SCALE
}

export function validateTaxRate(rate: number): ValidationResult {
  if (!Number.isFinite(rate) || rate < 0 || rate > MAX_TAX_RATE) {
    return {
      ok: false,
      message: `Enter a VAT rate from 0% to ${MAX_TAX_RATE * 100}%.`,
    }
  }

  if (Math.abs(rate * RATE_SCALE - Math.round(rate * RATE_SCALE)) > 1e-6) {
    return { ok: false, message: 'Use at most two decimal places for the VAT rate.' }
  }

  return { ok: true, message: null }
}

/** "12" or "12.5%" as typed in Settings, to the stored rate 0.12 / 0.125. Null when not a number. */
export function parseTaxRatePercent(raw: string): number | null {
  const cleaned = raw.trim().replace(/%$/, '').trim()

  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return null
  }

  return normalizeTaxRate(Number(cleaned) / 100)
}

export type SettingsUpdate = Partial<StoreSettings> & {
  /** A fraction: 0.12 means 12%. Applies to sales recorded from now on. */
  taxRate?: number
}

export function validateSettingsUpdate(update: SettingsUpdate): ValidationResult {
  if (update.storeName !== undefined && update.storeName.trim() === '') {
    return { ok: false, message: 'The store name cannot be empty.' }
  }

  if (update.taxRate !== undefined) {
    return validateTaxRate(update.taxRate)
  }

  return { ok: true, message: null }
}
