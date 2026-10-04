import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Wallet } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { computeOutstanding } from '@/domain/ledger'
import { parseAmountInput } from '@/domain/money'
import type { CustomerPayment } from '@/domain/types'
import { FormField } from '@/features/customers/components/FormField'
import { inputClassName } from '@/features/customers/lib/inputStyles'
import { SubmitButton } from '@/features/customers/components/SubmitButton'
import {
  buildPaymentFormSchema,
  PAYMENT_NOTE_MAX_LENGTH,
  previewPayment,
  toAmountInput,
  type PaymentFormValues,
} from '@/features/customers/lib/forms'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useShopStore } from '@/stores/useShopStore'

type RecordPaymentDialogProps = {
  customerId: string
  onClose: () => void
  /** `remaining` is what the customer owes after this payment. */
  onRecorded: (payment: CustomerPayment, remaining: number) => void
}

/**
 * Takes money against a customer's balance. Payments are not tied to a sale;
 * the ledger applies them to the oldest charge first.
 */
export function RecordPaymentDialog({ customerId, onClose, onRecorded }: RecordPaymentDialogProps) {
  const customer = useShopStore((state) =>
    state.customers.find((candidate) => candidate.id === customerId),
  )
  const outstanding = useShopStore((state) =>
    computeOutstanding(state.sales, state.payments, customerId),
  )
  const recordPayment = useShopStore((state) => state.recordPayment)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const schema = useMemo(() => buildPaymentFormSchema(outstanding), [outstanding])
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', note: '' },
    reValidateMode: 'onChange',
  })

  const preview = previewPayment(watch('amount'), outstanding)

  const submit = handleSubmit((values) => {
    const amount = parseAmountInput(values.amount)

    if (amount === null) {
      return
    }

    const result = recordPayment({ customerId, amount, note: values.note })

    if (!result.ok) {
      setSubmitError(result.message)

      return
    }

    onRecorded(result.payment, outstanding - amount)
  })

  function payFullBalance() {
    setSubmitError(null)
    setValue('amount', toAmountInput(outstanding), {
      shouldValidate: isSubmitted,
      shouldDirty: true,
    })
  }

  const title = 'Record Payment'

  if (!customer) {
    return (
      <Dialog title={title} onClose={onClose}>
        <Alert tone="error">This customer is not in the current session.</Alert>
      </Dialog>
    )
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm text-brand-700">Payment from</p>
            <p className="truncate text-lg font-bold text-navy-900">{customer.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-brand-700">Outstanding balance</p>
            <p className="text-2xl font-bold tabular-nums text-brand-700">
              {formatCurrency(outstanding)}
            </p>
          </div>
        </div>

        {outstanding <= 0 ? (
          <Alert tone="info">This customer has no outstanding balance. Nothing to collect.</Alert>
        ) : (
          <>
            <FormField label="Amount received" error={errors.amount?.message}>
              {({ inputId, describedBy }) => (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <span className="relative flex flex-1 items-center">
                    <span className="pointer-events-none absolute left-4 text-lg text-muted">
                      &#8369;
                    </span>
                    <input
                      id={inputId}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      autoFocus
                      placeholder="0.00"
                      aria-invalid={errors.amount ? true : undefined}
                      aria-describedby={describedBy}
                      className={inputClassName(
                        Boolean(errors.amount),
                        'h-16 pl-10 text-right text-2xl font-bold tabular-nums',
                      )}
                      {...register('amount', { onChange: () => setSubmitError(null) })}
                    />
                  </span>
                  <Button onClick={payFullBalance} className="h-16 sm:w-44">
                    Pay full balance
                  </Button>
                </div>
              )}
            </FormField>

            <div
              className={cn(
                'flex items-center justify-between rounded-xl px-4 py-3',
                preview.settlesInFull ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-navy-900',
              )}
            >
              <span className="text-sm font-semibold">
                {preview.settlesInFull ? 'Balance cleared in full' : 'Balance after payment'}
              </span>
              <span className="text-lg font-bold tabular-nums">
                {formatCurrency(preview.remaining)}
              </span>
            </div>

            <FormField label="Note" hint="Optional" error={errors.note?.message}>
              {({ inputId, describedBy }) => (
                <input
                  id={inputId}
                  type="text"
                  autoComplete="off"
                  maxLength={PAYMENT_NOTE_MAX_LENGTH}
                  placeholder="e.g. Paid by GCash, collected by Ramon"
                  aria-describedby={describedBy}
                  className={inputClassName(Boolean(errors.note))}
                  {...register('note')}
                />
              )}
            </FormField>
          </>
        )}

        {submitError ? <Alert tone="error">{submitError}</Alert> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} className="sm:w-36">
            Cancel
          </Button>
          <SubmitButton icon={Wallet} disabled={outstanding <= 0} className="sm:w-56">
            {preview.amount === null
              ? 'Record Payment'
              : `Record ${formatCurrency(preview.amount)}`}
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  )
}
