import { useId, useRef } from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { formatItemCount } from '@/features/sales/lib/salesMetrics'

type ClearCartDialogProps = {
  /** Items in the cart, every line counted, so the cashier sees what will go. */
  itemCount: number
  /** Keep Items, Escape, the close button or the backdrop. */
  onClose: () => void
  onConfirm: () => void
}

/**
 * Confirm emptying the cart. The safe choice, Keep Items, has focus, so an
 * accidental Enter does not throw a sale away.
 */
export function ClearCartDialog({ itemCount, onClose, onConfirm }: ClearCartDialogProps) {
  const keepRef = useRef<HTMLButtonElement>(null)
  const messageId = useId()

  return (
    <Dialog
      title="Clear this sale?"
      onClose={onClose}
      initialFocusRef={keepRef}
      describedBy={messageId}
    >
      <div className="flex flex-col gap-4">
        <p id={messageId} className="text-sm text-navy-800">
          The {formatItemCount(itemCount)} in the cart will be removed. Nothing is recorded and
          stock is not affected. To keep them for later, use Hold Sale instead.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button ref={keepRef} onClick={onClose} className="flex-1">
            Keep Items
          </Button>
          <Button icon={Trash2} variant="destructive" onClick={onConfirm} className="flex-1">
            Clear Cart
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
