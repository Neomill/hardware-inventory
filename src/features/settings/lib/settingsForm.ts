import { z } from 'zod'

import { parseTaxRatePercent, validateTaxRate, type SettingsUpdate } from '@/domain/settings'
import type { StoreSettings } from '@/domain/types'
import { formatTaxRatePercent } from '@/lib/format'

/**
 * The Settings form as the owner types it. The VAT rate is entered as a
 * percent ("12") and stored as a fraction (0.12). The store re-validates on
 * save, so these rules only give quicker, field-level feedback.
 */
export const settingsFormSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(1, 'Enter the store name.')
    .max(80, 'Keep the store name to 80 characters or fewer.'),
  address: z.string().trim().max(200, 'Keep the address to 200 characters or fewer.'),
  phone: z
    .string()
    .trim()
    .max(30, 'Keep the phone number to 30 characters or fewer.')
    .regex(/^[0-9+()\-\s]*$/, 'Use digits, spaces, +, - and brackets only.'),
  vatPercent: z
    .string()
    .trim()
    .min(1, 'Enter the VAT rate, for example 12.')
    .superRefine((value, context) => {
      const rate = parseTaxRatePercent(value)

      if (rate === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter the VAT rate as a number, for example 12.',
        })

        return
      }

      // parseTaxRatePercent rounds to basis points; say so rather than round silently.
      if (/\.\d{3,}/.test(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Use at most two decimal places for the VAT rate.',
        })

        return
      }

      const validation = validateTaxRate(rate)

      if (!validation.ok) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: validation.message ?? 'Enter a valid VAT rate.',
        })
      }
    }),
})

export type SettingsFormValues = z.infer<typeof settingsFormSchema>

/**
 * The rate as the owner types it: 0.12 to "12", 0.125 to "12.5". The field
 * shows "%" as a suffix, so the sign is left off the value.
 */
export function toVatPercentInput(rate: number): string {
  return formatTaxRatePercent(rate).replace(/%$/, '')
}

export function toSettingsFormValues(settings: StoreSettings, taxRate: number): SettingsFormValues {
  return {
    storeName: settings.storeName,
    address: settings.address,
    phone: settings.phone,
    vatPercent: toVatPercentInput(taxRate),
  }
}

/** Form values to the store's update. An unparseable rate is passed on as NaN for the store to refuse. */
export function toSettingsUpdate(values: SettingsFormValues): SettingsUpdate {
  return {
    storeName: values.storeName,
    address: values.address,
    phone: values.phone,
    taxRate: parseTaxRatePercent(values.vatPercent) ?? Number.NaN,
  }
}
