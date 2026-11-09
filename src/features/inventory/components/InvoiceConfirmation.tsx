import { CheckCircle2, ClipboardList, FileText, PackagePlus } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { ROUTES } from '@/app/routes'
import type { SupplierInvoice } from '@/domain/types'
import { describeSavedLines } from '@/features/inventory/lib/invoiceForm'
import { formatInvoiceDate } from '@/features/inventory/lib/invoiceQuery'
import { formatQuantityDelta } from '@/features/inventory/lib/movementQuery'
import { formatCurrency, formatNumber } from '@/lib/format'

type InvoiceConfirmationProps = {
  invoice: SupplierInvoice
  /** Stock on hand right after the save, by product id. */
  stockAfter: Map<string, number>
  onReceiveAnother: () => void
}

/** Shown after a delivery is saved: the invoice and every product's new stock. */
export function InvoiceConfirmation({
  invoice,
  stockAfter,
  onReceiveAnother,
}: InvoiceConfirmationProps) {
  const details: { label: string; value: string }[] = [
    { label: 'Invoice number', value: invoice.invoiceNumber },
    { label: 'Supplier', value: invoice.supplier },
    { label: 'Invoice date', value: formatInvoiceDate(invoice.invoiceDate) },
    { label: 'Invoice total', value: formatCurrency(invoice.total) },
    { label: 'Received by', value: invoice.receivedBy },
  ]

  return (
    <section className="card mx-auto flex w-full max-w-2xl flex-col items-center gap-5 p-5 text-center sm:p-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-9 w-9" aria-hidden />
      </span>

      <div role="status">
        <h2 className="text-2xl font-bold text-navy-900">Stock Received</h2>
        <p className="mt-1 text-sm text-muted">
          {invoice.invoiceNumber} from {invoice.supplier}: {describeSavedLines(invoice)} added to
          inventory.
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

      <ul
        aria-label="Products received"
        className="w-full divide-y divide-slate-100 rounded-xl border border-slate-200 text-left text-sm"
      >
        {invoice.lines.map((line) => {
          const onHand = stockAfter.get(line.productId)

          return (
            <li key={line.productId} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-medium text-navy-900">{line.productName}</span>
                <span className="block text-sm text-muted">{line.sku}</span>
              </span>
              <dl className="flex shrink-0 gap-4 text-right">
                <div>
                  <dt className="text-sm text-muted">Received</dt>
                  <dd className="font-semibold tabular-nums text-emerald-700">
                    {formatQuantityDelta(line.quantity)} {line.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">In stock now</dt>
                  <dd className="font-semibold tabular-nums text-navy-900">
                    {onHand === undefined ? '—' : `${formatNumber(onHand)} ${line.unit}`}
                  </dd>
                </div>
              </dl>
            </li>
          )
        })}
      </ul>

      <div className="grid w-full gap-3 sm:grid-cols-3">
        <Button icon={PackagePlus} variant="primary" onClick={onReceiveAnother} className="sm:h-14">
          Receive another delivery
        </Button>
        <Button
          icon={FileText}
          to={ROUTES.invoiceDetail(invoice.invoiceNumber)}
          className="sm:h-14"
        >
          View invoice
        </Button>
        <Button icon={ClipboardList} to={ROUTES.stockMovements} className="sm:h-14">
          Stock history
        </Button>
      </div>
    </section>
  )
}
