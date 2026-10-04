import { useState, type FormEvent } from 'react'
import { PauseCircle } from 'lucide-react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { FormField } from '@/components/common/FormField'
import { TextInput } from '@/components/common/TextInput'
import type { HeldSale } from '@/domain/types'
import { heldLabelError, holdAvailability, labelCounter } from '@/features/sales/lib/heldSales'
import { useShopStore } from '@/stores/useShopStore'
import { cn } from '@/lib/utils'

type HoldSaleDialogProps = {
  onClose: () => void
  onHeld: (heldSale: HeldSale) => void
}

/** Hold Sale with an optional label (spec 03 s.7.4). Enter submits. */
export function HoldSaleDialog({ onClose, onHeld }: HoldSaleDialogProps) {
  const cartLineCount = useShopStore((state) => state.cart.length)
  const heldCount = useShopStore((state) => state.heldSales.length)
  const holdCart = useShopStore((state) => state.holdCart)

  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const availability = holdAvailability(cartLineCount, heldCount)
  const labelError = heldLabelError(label)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!availability.canHold || labelError) {
      return
    }

    const result = holdCart({ label })

    if (!result.ok) {
      setError(result.message)

      return
    }

    onHeld(result.heldSale)
  }

  return (
    <Dialog title="Hold Sale" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-muted">
          The cart is set aside and emptied. Stock is not reserved; quantities are checked again
          when the sale is resumed.
        </p>

        <FormField
          label="Label"
          optional
          error={labelError ?? undefined}
          hint={
            <span className={cn(labelError ? 'font-semibold text-rose-700' : null)}>
              {labelCounter(label)} characters
            </span>
          }
        >
          {(field) => (
            <TextInput
              {...field}
              value={label}
              onChange={(event) => {
                setLabel(event.target.value)
                setError(null)
              }}
              placeholder="Customer name or note, optional"
              autoComplete="off"
            />
          )}
        </FormField>

        {!availability.canHold && availability.reason ? (
          <Alert tone="error">{availability.reason}</Alert>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={PauseCircle}
            disabled={!availability.canHold || labelError !== null}
            className="flex-1"
          >
            Hold Sale
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
