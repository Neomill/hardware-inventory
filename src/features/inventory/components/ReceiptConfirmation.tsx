import { CheckCircle2, ClipboardList, PackagePlus, Warehouse } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { ROUTES } from '@/app/routes'
import { displayReference, formatQuantityDelta } from '@/features/inventory/lib/movementQuery'
import { movementsFor } from '@/features/inventory/lib/links'
import type { StockMovement } from '@/domain/types'
import { formatDateTimeShort, formatNumber } from '@/lib/format'

export type ReceivedStock = {
  movement: StockMovement
  productName: string
  unit: string
  newStock: number
}

type ReceiptConfirmationProps = {
  received: ReceivedStock
  onReceiveAnother: () => void
}

export function ReceiptConfirmation({ received, onReceiveAnother }: ReceiptConfirmationProps) {
  const { movement, productName, unit, newStock } = received

  const details: { label: string; value: string }[] = [
    { label: 'Product', value: productName },
    { label: 'Quantity received', value: `${formatQuantityDelta(movement.quantityDelta)} ${unit}` },
    { label: 'Stock on hand now', value: `${formatNumber(newStock)} ${unit}` },
    { label: 'Supplier invoice', value: displayReference(movement.reference) },
    { label: 'Details', value: movement.description },
    { label: 'Note', value: movement.note ?? '—' },
    { label: 'Recorded by', value: movement.recordedBy },
    { label: 'Recorded at', value: formatDateTimeShort(new Date(movement.occurredAt)) },
  ]

  return (
    <section className="card mx-auto flex w-full max-w-2xl flex-col items-center gap-5 p-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-9 w-9" aria-hidden />
      </span>

      <div role="status">
        <h2 className="text-2xl font-bold text-navy-900">Stock Received</h2>
        <p className="mt-1 text-sm text-muted">
          {formatNumber(movement.quantityDelta)} {unit} of {productName} added to inventory.
        </p>
      </div>

      <dl className="w-full divide-y divide-slate-100 rounded-xl border border-slate-200 text-left text-sm">
        {details.map((detail) => (
          <div key={detail.label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{detail.label}</dt>
            <dd className="text-right font-medium text-navy-900">{detail.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid w-full gap-3 sm:grid-cols-3">
        <Button icon={PackagePlus} variant="primary" onClick={onReceiveAnother} className="sm:h-14">
          Receive Another
        </Button>
        <Button icon={ClipboardList} to={movementsFor(movement.productId)} className="sm:h-14">
          View Movements
        </Button>
        <Button icon={Warehouse} to={ROUTES.inventory} className="sm:h-14">
          Inventory
        </Button>
      </div>
    </section>
  )
}
