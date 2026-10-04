import { ChevronRight, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusPill } from '@/components/common/StatusPill'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import type { CustomerBalance } from '@/domain/ledger'
import { describeAge, formatLedgerDate } from '@/features/customers/lib/ledgerView'
import { formatCurrency, formatNumber } from '@/lib/format'

type CustomerBalanceTableProps = {
  rows: CustomerBalance[]
  now: Date
  emptyMessage: string
  onRecordPayment: (customerId: string) => void
}

export function CustomerBalanceTable({
  rows,
  now,
  emptyMessage,
  onRecordPayment,
}: CustomerBalanceTableProps) {
  const columns: SummaryColumn<CustomerBalance>[] = [
    {
      id: 'name',
      header: 'Customer',
      cell: (row) => (
        <Link
          to={ROUTES.customerDetail(row.customerId)}
          className="flex min-h-11 items-center font-semibold text-navy-900 hover:text-brand-600"
        >
          {row.customerName}
        </Link>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      cell: (row) => row.phone ?? <span className="text-muted">&mdash;</span>,
      cellClassName: 'tabular-nums text-navy-700',
    },
    {
      id: 'outstanding',
      header: 'Outstanding',
      cell: (row) =>
        row.outstanding > 0 ? (
          <span className="font-bold text-brand-700">{formatCurrency(row.outstanding)}</span>
        ) : (
          <StatusPill tone="success">Settled</StatusPill>
        ),
      cellClassName: 'tabular-nums',
    },
    {
      id: 'open',
      header: 'Open Charges',
      cell: (row) =>
        row.openChargeCount > 0 ? (
          <span>
            {formatNumber(row.openChargeCount)}
            {row.oldestOpenChargeAt ? (
              <span className="ml-2 text-xs text-muted">
                oldest {describeAge(row.oldestOpenChargeAt, now).toLowerCase()}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted">0</span>
        ),
    },
    {
      id: 'activity',
      header: 'Last Activity',
      cell: (row) =>
        row.lastActivityAt ? (
          formatLedgerDate(row.lastActivityAt)
        ) : (
          <span className="text-muted">No activity</span>
        ),
      cellClassName: 'text-navy-700',
    },
    {
      id: 'actions',
      header: '',
      cellClassName: 'pr-0 text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.outstanding > 0 ? (
            <button
              type="button"
              onClick={() => onRecordPayment(row.customerId)}
              aria-label={`Record payment from ${row.customerName}`}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-50"
            >
              <Wallet className="h-4 w-4" aria-hidden />
              Record Payment
            </button>
          ) : null}
          <Link
            to={ROUTES.customerDetail(row.customerId)}
            aria-label={`View ledger for ${row.customerName}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-navy-700 transition-colors hover:bg-navy-50"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      ),
    },
  ]

  return (
    <SummaryTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.customerId}
      emptyMessage={emptyMessage}
      minWidthClassName="min-w-[52rem]"
      hoverable
    />
  )
}
