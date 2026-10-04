import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/common/SectionCard'
import { StatusPill } from '@/components/common/StatusPill'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import type { LedgerEntry } from '@/domain/ledger'
import { formatLedgerDate } from '@/features/customers/lib/ledgerView'
import { formatCurrency, formatTime } from '@/lib/format'

type LedgerStatementCardProps = {
  /** Oldest first, as the paper ledger reads. */
  entries: LedgerEntry[]
}

/** The customer's account line by line, with what they owed after each entry. */
export function LedgerStatementCard({ entries }: LedgerStatementCardProps) {
  const columns: SummaryColumn<LedgerEntry>[] = [
    {
      id: 'date',
      header: 'Date',
      cell: (entry) => (
        <span>
          {formatLedgerDate(entry.occurredAt)}
          <span className="ml-2 text-xs text-muted">{formatTime(new Date(entry.occurredAt))}</span>
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (entry) =>
        entry.type === 'charge' ? (
          <StatusPill tone="warning">Charge</StatusPill>
        ) : (
          <StatusPill tone="success">Payment</StatusPill>
        ),
    },
    {
      id: 'reference',
      header: 'Reference',
      cell: (entry) =>
        entry.saleId ? (
          <Link
            to={ROUTES.saleDetail(entry.saleId)}
            className="font-semibold text-navy-900 underline-offset-2 hover:text-brand-600 hover:underline"
          >
            {entry.reference}
          </Link>
        ) : (
          <span className="font-semibold text-navy-700">{entry.reference}</span>
        ),
    },
    {
      id: 'description',
      header: 'Description',
      cell: (entry) => entry.description,
      cellClassName: 'max-w-[18rem] truncate text-navy-700',
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (entry) =>
        entry.amount >= 0 ? (
          <span className="text-navy-900">+{formatCurrency(entry.amount)}</span>
        ) : (
          <span className="text-emerald-700">&minus;{formatCurrency(-entry.amount)}</span>
        ),
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'balance',
      header: 'Balance',
      cell: (entry) => formatCurrency(entry.balance),
      cellClassName: 'text-right font-bold tabular-nums pr-0',
    },
  ]

  return (
    <SectionCard
      title="Ledger Statement"
      action={<span className="text-xs text-muted">Oldest first</span>}
    >
      <SummaryTable
        columns={columns}
        rows={entries}
        rowKey={(entry) => entry.id}
        emptyMessage="No credit sales or payments yet."
        minWidthClassName="min-w-[48rem]"
      />
    </SectionCard>
  )
}
