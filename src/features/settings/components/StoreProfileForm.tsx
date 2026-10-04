import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { TextInput } from '@/components/common/TextInput'
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
          <FormField label="Store name" error={errors.storeName?.message} className="md:col-span-2">
            {(field) => (
              <TextInput {...field} autoComplete="organization" {...register('storeName')} />
            )}
          </FormField>
          <FormField label="Address" optional error={errors.address?.message}>
            {(field) => (
              <TextInput
                {...field}
                placeholder="Street, barangay, city"
                autoComplete="street-address"
                {...register('address')}
              />
            )}
          </FormField>
          <FormField label="Phone" optional error={errors.phone?.message}>
            {(field) => (
              <TextInput
                {...field}
                type="tel"
                inputMode="tel"
                placeholder="0912 345 6789"
                autoComplete="tel"
                {...register('phone')}
              />
            )}
          </FormField>
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <header>
          <h2 className="text-base font-semibold text-navy-900">VAT</h2>
          <p className="mt-1 text-sm text-muted">
            Shelf prices already include VAT. The rate only splits out the VAT shown on receipts and
            reports; it is never added on top of a total.
          </p>
        </header>

        <FormField
          label="VAT rate"
          className="max-w-xs"
          error={errors.vatPercent?.message}
          hint="Applies to new sales only. Past sales keep the rate they were made with."
        >
          {(field) => (
            <TextInput {...field} inputMode="decimal" suffix="%" {...register('vatPercent')} />
          )}
        </FormField>
      </section>

      {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          onClick={() => {
            reset(toSettingsFormValues(settings, taxRate))
            setFeedback(null)
          }}
          disabled={!isDirty}
        >
          Discard changes
        </Button>
        {/* type="submit" so Enter in any field saves. */}
        <Button
          type="submit"
          variant="primary"
          icon={Save}
          disabled={!isDirty}
          pending={isSubmitting}
          className="px-5"
        >
          Save settings
        </Button>
      </div>
    </form>
  )
}
