import { useId, useRef, useState, type FormEvent } from 'react'
import { Ban } from 'lucide-react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { FormField } from '@/components/common/FormField'
import { inputClassName } from '@/components/common/inputStyles'
import { CANCEL_REASON_MAX } from '@/domain/saleCancellation'
import type { Sale } from '@/domain/types'
import {
  buildCancelPreview,
  cancelReasonError,
  isReasonTooLong,
  reasonCounter,
} from '@/features/sales/lib/cancelSale'
import { useShopStore } from '@/stores/useShopStore'
import { cn } from '@/lib/utils'

type CancelSaleDialogProps = {
  sale: Sale
  /** Keep Sale, Escape, the close button or the backdrop. */
  onClose: () => void
  /** The store accepted the cancellation. */
  onCancelled: (sale: Sale) => void
}

/**
 * Confirm cancelling a completed sale, with a required reason (spec 04 sale
 * cancellation s.7.2). The two buttons are "Cancel Sale" and "Keep Sale", so
 * "cancel" never means two things. A store refusal stays in the dialog and
 * keeps the typed reason.
 */
export function CancelSaleDialog({ sale, onClose, onCancelled }: CancelSaleDialogProps) {
  const cancelSale = useShopStore((state) => state.cancelSale)
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  const summaryId = useId()

  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [storeError, setStoreError] = useState<string | null>(null)

  // Built once per open: the figures describe the sale as it stands now.
  const [preview] = useState(() => buildCancelPreview(sale, new Date()))

  const tooLong = isReasonTooLong(reason)
  const reasonError = submitted || tooLong ? cancelReasonError(reason) : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)

    if (cancelReasonError(reason) !== null) {
      reasonRef.current?.focus()

      return
    }

    const result = cancelSale({ saleId: sale.id, reason })

    if (!result.ok) {
      setStoreError(result.message)

      return
    }

    onCancelled(result.sale)
  }

  return (
    <Dialog
      title={preview.title}
      onClose={onClose}
      initialFocusRef={reasonRef}
      describedBy={summaryId}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div id={summaryId} className="flex flex-col gap-3">
          <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-muted">Total</dt>
              <dd className="font-semibold text-navy-900 tabular-nums">{preview.total}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted">Customer</dt>
              <dd className="font-semibold text-navy-900 [overflow-wrap:anywhere]">
                {preview.customer}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted">Items</dt>
              <dd className="font-semibold text-navy-900">{preview.items}</dd>
            </div>
          </dl>

          <div>
            <p className="text-sm font-semibold text-navy-900">What will happen</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-navy-800">
              {preview.consequences.map((sentence) => (
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
          </div>
        </div>

        <FormField
          label="Reason"
          error={reasonError ?? undefined}
          hint={
            <span className={cn(tooLong ? 'font-semibold text-rose-700' : null)}>
              Why this sale should not stand. {reasonCounter(reason)} characters
            </span>
          }
        >
          {({ id, describedBy, invalid }) => (
            <textarea
              ref={reasonRef}
              id={id}
              rows={3}
              required
              aria-required="true"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              // Room to overtype so the counter and message can explain the limit.
              maxLength={CANCEL_REASON_MAX + 20}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                setStoreError(null)
              }}
              placeholder="For example: wrong item keyed in"
              className={inputClassName(invalid, 'h-auto py-3')}
            />
          )}
        </FormField>

        {storeError ? <Alert tone="error">{storeError}</Alert> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onClose} className="sm:flex-1">
            Keep Sale
          </Button>
          <Button type="submit" icon={Ban} variant="destructive" className="sm:flex-1">
            Cancel Sale
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
