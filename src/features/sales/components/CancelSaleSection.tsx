import { useId, useMemo, useState } from 'react'
import { Ban } from 'lucide-react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { checkCancellable } from '@/domain/saleCancellation'
import type { Sale } from '@/domain/types'
import { CancelSaleDialog } from '@/features/sales/components/CancelSaleDialog'
import { useShopStore } from '@/stores/useShopStore'
import { formatCurrency } from '@/lib/format'

type CancelSaleSectionProps = {
  sale: Sale
  onCancelled: (sale: Sale) => void
}

/**
 * The Cancel Sale button under the receipt actions (spec 04 sale cancellation
 * s.7.1). When the store would refuse -- a customer payment is already applied
 * to the sale -- the button is disabled and the reason is shown under it, rather
 * than failing after the tap. Rendered only for a sale that still stands.
 */
export function CancelSaleSection({ sale, onCancelled }: CancelSaleSectionProps) {
  const sales = useShopStore((state) => state.sales)
  const payments = useShopStore((state) => state.payments)
  const [isOpen, setOpen] = useState(false)
  const blockedId = useId()

  // Same check, same allocation, as the store's cancelSale.
  const check = useMemo(
    () => checkCancellable(sale, sales, payments, formatCurrency),
    [sale, sales, payments],
  )

  return (
    <div className="flex flex-col gap-3">
      <Button
        icon={Ban}
        onClick={() => setOpen(true)}
        disabled={!check.ok}
        aria-describedby={check.ok ? undefined : blockedId}
        className="h-12 border-rose-300 text-rose-700 hover:bg-rose-50 sm:self-center sm:px-10"
      >
        Cancel Sale
      </Button>

      {check.ok ? null : (
        <div id={blockedId}>
          <Alert tone="warning">{check.message}</Alert>
        </div>
      )}

      {isOpen ? (
        <CancelSaleDialog
          sale={sale}
          onClose={() => setOpen(false)}
          onCancelled={(cancelled) => {
            setOpen(false)
            onCancelled(cancelled)
          }}
        />
      ) : null}
    </div>
  )
}
