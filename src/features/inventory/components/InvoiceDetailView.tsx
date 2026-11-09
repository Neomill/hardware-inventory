import { ArrowLeft, FileX } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/common/Button'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import { findInvoice } from '@/domain/supplierInvoice'
import type { SupplierInvoiceLine } from '@/domain/types'
import { describeSavedLines } from '@/features/inventory/lib/invoiceForm'
import { formatInvoiceDate, formatRecordedAt } from '@/features/inventory/lib/invoiceQuery'
import { formatCurrency, formatNumber } from '@/lib/format'
import { useShopStore } from '@/stores/useShopStore'

function LineProductLink({ line }: { line: SupplierInvoiceLine }) {
  return (
    <Link
      to={ROUTES.productDetail(line.productId)}
      className="font-semibold text-navy-900 underline-offset-2 hover:text-brand-600 hover:underline"
    >
      {line.productName}
    </Link>
  )
}

/** Names and SKUs are the copies stored on the invoice, so a later rename does not change it. */
const LINE_COLUMNS: SummaryColumn<SupplierInvoiceLine>[] = [
  {
    id: 'product',
    header: 'Product',
    cell: (line) => <LineProductLink line={line} />,
  },
  { id: 'sku', header: 'Product Code', cell: (line) => line.sku, cellClassName: 'text-muted' },
  {
    id: 'quantity',
    header: 'Quantity',
    cell: (line) => `${formatNumber(line.quantity)} ${line.unit}`,
    cellClassName: 'whitespace-nowrap font-semibold tabular-nums',
  },
]

type InvoiceDetailViewProps = {
  /** From the URL, already decoded by the router. */
  invoiceNumber: string
}

/** One supplier invoice as saved (spec 04 s.7.5). Read only. */
export function InvoiceDetailView({ invoiceNumber }: InvoiceDetailViewProps) {
  const invoices = useShopStore((state) => state.invoices)
  const invoice = findInvoice(invoices, invoiceNumber)

  if (!invoice) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <FileX className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-navy-900">Invoice not found</h2>
        <p className="max-w-md text-sm text-muted">
          It is not saved on this device. It may have been removed by a demo data reset.
        </p>
        <Button to={ROUTES.invoices}>Back to Invoices</Button>
      </div>
    )
  }

  const details: { label: string; value: string }[] = [
    { label: 'Supplier', value: invoice.supplier },
    { label: 'Invoice date', value: formatInvoiceDate(invoice.invoiceDate) },
    { label: 'Received by', value: invoice.receivedBy },
    { label: 'Recorded', value: formatRecordedAt(invoice.recordedAt) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button icon={ArrowLeft} variant="ghost" to={ROUTES.invoices} className="-ml-2">
          All invoices
        </Button>
      </div>

      <section className="card flex flex-col gap-5 p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Supplier invoice</p>
            <h2 className="text-2xl font-bold text-navy-900">{invoice.invoiceNumber}</h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Invoice total</p>
            <p className="text-2xl font-bold tabular-nums text-navy-900">
              {formatCurrency(invoice.total)}
            </p>
          </div>
        </header>

        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="flex flex-col gap-0.5">
              <dt className="text-muted">{detail.label}</dt>
              <dd className="font-medium text-navy-900">{detail.value}</dd>
            </div>
          ))}
          {invoice.note ? (
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <dt className="text-muted">Note</dt>
              <dd className="whitespace-pre-line font-medium text-navy-900">{invoice.note}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="card flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <h2 className="card-title">Products received</h2>
          <span className="text-sm text-muted">{describeSavedLines(invoice)}</span>
        </header>
        {/* Below 768px a card per product, so the quantity is never scrolled out of view. */}
        <ul
          aria-label="Products received"
          className="flex flex-col divide-y divide-slate-100 px-5 pb-5 pt-4 md:hidden"
        >
          {invoice.lines.map((line) => (
            <li key={line.productId} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <LineProductLink line={line} />
                <p className="text-sm text-muted">{line.sku}</p>
              </div>
              <p className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-navy-900">
                {formatNumber(line.quantity)} {line.unit}
              </p>
            </li>
          ))}
        </ul>
        <div className="hidden px-5 pb-5 pt-4 md:block">
          <SummaryTable
            columns={LINE_COLUMNS}
            rows={invoice.lines}
            rowKey={(line) => line.productId}
            emptyMessage="No products on this invoice."
          />
        </div>
      </section>
    </div>
  )
}
