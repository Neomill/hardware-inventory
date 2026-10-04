import { SectionCard } from '@/components/common/SectionCard'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import type { CustomerPayment } from '@/domain/types'
import { formatLedgerDate } from '@/features/customers/lib/ledgerView'
import { formatCurrency, formatTime } from '@/lib/format'

type PaymentHistoryCardProps = {
  /** Newest first. */
  payments: CustomerPayment[]
}

export function PaymentHistoryCard({ payments }: PaymentHistoryCardProps) {
  const columns: SummaryColumn<CustomerPayment>[] = [
    {
      id: 'date',
      header: 'Date',
      cell: (payment) => (
        <span>
          {formatLedgerDate(payment.occurredAt)}
          <span className="ml-2 text-xs text-muted">{formatTime(new Date(payment.occurredAt))}</span>
        </span>
      ),
    },
    {
      id: 'reference',
      header: 'Reference',
      cell: (payment) => payment.id,
      cellClassName: 'font-semibold text-navy-700',
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (payment) => formatCurrency(payment.amount),
      cellClassName: 'tabular-nums font-bold text-emerald-700',
    },
    {
      id: 'note',
      header: 'Note',
      cell: (payment) => payment.note ?? <span className="text-muted">&mdash;</span>,
      cellClassName: 'max-w-[16rem] truncate text-navy-700',
    },
    {
      id: 'recordedBy',
      header: 'Recorded By',
      cell: (payment) => payment.recordedBy,
      cellClassName: 'text-navy-700',
    },
  ]

  return (
    <SectionCard title="Payment History">
      <SummaryTable
        columns={columns}
        rows={payments}
        rowKey={(payment) => payment.id}
        emptyMessage="No payments recorded yet."
        minWidthClassName="min-w-[40rem]"
      />
    </SectionCard>
  )
}
