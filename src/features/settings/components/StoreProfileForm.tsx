import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/common/Alert'
import { FormField } from '@/features/settings/components/FormField'
import {
  settingsFormSchema,
  toSettingsFormValues,
  toSettingsUpdate,
  type SettingsFormValues,
} from '@/features/settings/lib/settingsForm'
import { useShopStore } from '@/stores/useShopStore'

type Feedback = { tone: 'success' | 'error'; message: string } | null

/** Store profile and VAT rate. The store has the final say on every value. */
export function StoreProfileForm() {
  const settings = useShopStore((state) => state.settings)
  const taxRate = useShopStore((state) => state.taxRate)
  const updateSettings = useShopStore((state) => state.updateSettings)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: toSettingsFormValues(settings, taxRate),
  })

  // Saved values (or a reset to demo data) become the new starting point.
  useEffect(() => {
    reset(toSettingsFormValues(settings, taxRate))
  }, [settings, taxRate, reset])

  function onSubmit(values: SettingsFormValues) {
    const result = updateSettings(toSettingsUpdate(values))

    setFeedback(
      result.ok
        ? { tone: 'success', message: result.message ?? 'Settings saved.' }
        : { tone: 'error', message: result.message ?? 'These settings cannot be saved.' },
    )
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      onChange={() => setFeedback(null)}
      className="flex flex-col gap-5"
    >
      <section className="card flex flex-col gap-4 p-5">
        <header>
          <h2 className="text-base font-semibold text-navy-900">Store profile</h2>
          <p className="mt-1 text-sm text-muted">How the store is named and reached.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Store name"
            autoComplete="organization"
            error={errors.storeName?.message}
            className="md:col-span-2"
            {...register('storeName')}
          />
          <FormField
            label="Address"
            placeholder="Street, barangay, city"
            autoComplete="street-address"
            error={errors.address?.message}
            {...register('address')}
          />
          <FormField
            label="Phone"
            type="tel"
            inputMode="tel"
            placeholder="0912 345 6789"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <header>
          <h2 className="text-base font-semibold text-navy-900">VAT</h2>
          <p className="mt-1 text-sm text-muted">
            Shelf prices already include VAT. The rate only splits out the VAT shown on receipts
            and reports; it is never added on top of a total.
          </p>
        </header>

        <FormField
          label="VAT rate"
          inputMode="decimal"
          suffix="%"
          className="max-w-xs"
          error={errors.vatPercent?.message}
          hint="Applies to new sales only. Past sales keep the rate they were made with."
          {...register('vatPercent')}
        />
      </section>

      {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : null}

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            reset(toSettingsFormValues(settings, taxRate))
            setFeedback(null)
          }}
          disabled={!isDirty}
          className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard changes
        </button>
        {/* Native submit so Enter in any field saves; styled as the primary Button. */}
        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-5 w-5 shrink-0" aria-hidden />
          Save settings
        </button>
      </div>
    </form>
  )
}
