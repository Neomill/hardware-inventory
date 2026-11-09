import { FileText, PackagePlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/common/Button'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import { invoiceUnitCount } from '@/domain/supplierInvoice'
import type { SupplierInvoice } from '@/domain/types'
import { useInvoiceList } from '@/features/inventory/hooks/useInvoiceList'
import { formatInvoiceDate } from '@/features/inventory/lib/invoiceQuery'
import { formatCurrency, formatNumber } from '@/lib/format'
import { useShopStore } from '@/stores/useShopStore'

const COLUMNS: SummaryColumn<SupplierInvoice>[] = [
  {
    id: 'number',
    header: 'Invoice No.',
    cell: (invoice) => (
      <Link
        to={ROUTES.invoiceDetail(invoice.invoiceNumber)}
        className="font-semibold text-navy-900 underline-offset-2 hover:text-brand-600 hover:underline"
      >
        {invoice.invoiceNumber}
      </Link>
    ),
  },
  { id: 'supplier', header: 'Supplier', cell: (invoice) => invoice.supplier },
  {
    id: 'date',
    header: 'Invoice Date',
    cell: (invoice) => formatInvoiceDate(invoice.invoiceDate),
    cellClassName: 'whitespace-nowrap text-muted',
  },
  {
    id: 'products',
    header: 'Products',
    cell: (invoice) => formatNumber(invoice.lines.length),
    cellClassName: 'tabular-nums',
  },
  {
    id: 'units',
    header: 'Units',
    cell: (invoice) => formatNumber(invoiceUnitCount(invoice)),
    cellClassName: 'tabular-nums',
  },
  {
    id: 'total',
    header: 'Total',
    cell: (invoice) => formatCurrency(invoice.total),
    cellClassName: 'whitespace-nowrap font-semibold tabular-nums',
  },
  { id: 'receivedBy', header: 'Received By', cell: (invoice) => invoice.receivedBy },
]

/** Below 768px the seven columns do not fit, so each invoice is a card instead of a row. */
function InvoiceCards({ invoices }: { invoices: SupplierInvoice[] }) {
  return (
    <ul aria-label="Supplier invoices" className="flex flex-col divide-y divide-slate-100">
      {invoices.map((invoice) => (
        <li key={invoice.invoiceNumber} className="flex flex-col gap-2 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={ROUTES.invoiceDetail(invoice.invoiceNumber)}
                className="font-semibold text-navy-900 underline-offset-2 hover:text-brand-600 hover:underline"
              >
                {invoice.invoiceNumber}
              </Link>
              <p className="truncate text-sm text-navy-900">{invoice.supplier}</p>
            </div>
            <p className="shrink-0 text-right font-semibold tabular-nums text-navy-900">
              {formatCurrency(invoice.total)}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="flex gap-1">
              <dt className="text-muted">Date</dt>
              <dd className="text-navy-900">{formatInvoiceDate(invoice.invoiceDate)}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-muted">Products</dt>
              <dd className="tabular-nums text-navy-900">{formatNumber(invoice.lines.length)}</dd>
            </div>
            <div className="flex min-w-0 gap-1">
              <dt className="text-muted">Received by</dt>
              <dd className="truncate text-navy-900">{invoice.receivedBy}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-muted">Units</dt>
              <dd className="tabular-nums text-navy-900">
                {formatNumber(invoiceUnitCount(invoice))}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  )
}

/** Every supplier invoice, newest first, searchable by number or supplier (spec 04 s.7.4). */
export function InvoicesView() {
  const invoices = useShopStore((state) => state.invoices)
  const list = useInvoiceList(invoices)

  if (invoices.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <FileText className="h-7 w-7" aria-hidden />
        </span>
        <p className="max-w-md text-sm text-muted">
          No supplier invoices yet. Record a delivery in{' '}
          <Link
            to={ROUTES.receiveStock}
            className="font-semibold text-navy-700 underline-offset-2 hover:underline"
          >
            Receive Stock
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-3 p-5 lg:flex-row lg:items-center">
        <SearchInput
          value={list.search}
          onChange={list.updateSearch}
          label="Search invoices"
          placeholder="Search by invoice number or supplier..."
          className="flex-1"
        />
        <Button icon={PackagePlus} variant="primary" to={ROUTES.receiveStock}>
          Receive Stock
        </Button>
      </section>

      <section className="card flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <h2 className="card-title">Supplier Invoices</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">{list.rangeLabel}</span>
            <Pagination page={list.page} pageCount={list.pageCount} onChange={list.setPage} />
          </div>
        </header>

        {list.rows.length === 0 ? (
          // One message for every width, so it is not announced twice.
          <p className="px-5 py-8 text-center text-sm text-muted">No invoices match your search.</p>
        ) : (
          <>
            <div className="px-5 pb-5 pt-4 md:hidden">
              <InvoiceCards invoices={list.rows} />
            </div>
            <div className="hidden px-5 pb-5 pt-4 md:block">
              <SummaryTable
                columns={COLUMNS}
                rows={list.rows}
                rowKey={(invoice) => invoice.invoiceNumber}
                minWidthClassName="min-w-[52rem]"
                hoverable
                emptyMessage="No invoices match your search."
              />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
