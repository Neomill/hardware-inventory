import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import type { Customer } from '@/domain/types'
import { SubmitButton } from '@/features/customers/components/SubmitButton'
import { FormField } from '@/features/customers/components/FormField'
import { inputClassName } from '@/features/customers/lib/inputStyles'
import {
  buildNewCustomerFormSchema,
  type NewCustomerFormValues,
} from '@/features/customers/lib/forms'
import { useShopStore } from '@/stores/useShopStore'

type AddCustomerDialogProps = {
  onClose: () => void
  onAdded: (customer: Customer) => void
}

export function AddCustomerDialog({ onClose, onAdded }: AddCustomerDialogProps) {
  const customers = useShopStore((state) => state.customers)
  const addCustomer = useShopStore((state) => state.addCustomer)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const schema = useMemo(() => buildNewCustomerFormSchema(customers), [customers])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewCustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '' },
    reValidateMode: 'onChange',
  })

  const submit = handleSubmit((values) => {
    // The store validates again; its message wins if anything changed meanwhile.
    const result = addCustomer({ name: values.name, phone: values.phone })

    if (!result.ok) {
      setSubmitError(result.message)

      return
    }

    onAdded(result.customer)
  })

  return (
    <Dialog title="Add Customer" onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <p className="text-sm text-muted">
          Add a regular who buys on credit. Their balance starts at zero.
        </p>

        <FormField label="Customer name" error={errors.name?.message}>
          {({ inputId, describedBy }) => (
            <input
              id={inputId}
              type="text"
              autoComplete="off"
              autoFocus
              placeholder="e.g. Juan Dela Cruz"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy}
              className={inputClassName(Boolean(errors.name))}
              {...register('name')}
            />
          )}
        </FormField>

        <FormField label="Phone number" hint="Optional" error={errors.phone?.message}>
          {({ inputId, describedBy }) => (
            <input
              id={inputId}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="0917 555 0101"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={describedBy}
              className={inputClassName(Boolean(errors.phone))}
              {...register('phone')}
            />
          )}
        </FormField>

        {submitError ? <Alert tone="error">{submitError}</Alert> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} className="sm:w-36">
            Cancel
          </Button>
          <SubmitButton icon={UserPlus} className="sm:w-48">
            Add Customer
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  )
}
