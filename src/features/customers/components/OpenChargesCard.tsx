import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/common/SectionCard'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import type { OpenCharge } from '@/domain/ledger'
import { describeAge, formatLedgerDate } from '@/features/customers/lib/ledgerView'
import { formatCurrency } from '@/lib/format'

type OpenChargesCardProps = {
  charges: OpenCharge[]
  now: Date
}

/** Unpaid sales. Payments settle the oldest first, so the top row clears next. */
export function OpenChargesCard({ charges, now }: OpenChargesCardProps) {
  const columns: SummaryColumn<OpenCharge>[] = [
    {
      id: 'sale',
      header: 'Sale No.',
      cell: (charge) => (
        <Link
          to={ROUTES.saleDetail(charge.saleId)}
          className="font-semibold text-navy-900 underline-offset-2 hover:text-brand-600 hover:underline"
        >
          {charge.saleNumber}
        </Link>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      cell: (charge) => (
        <span>
          {formatLedgerDate(charge.occurredAt)}
          <span className="ml-2 text-xs text-muted">{describeAge(charge.occurredAt, now)}</span>
        </span>
      ),
    },
    {
      id: 'charged',
      header: 'Charged',
      cell: (charge) => formatCurrency(charge.charged),
      cellClassName: 'tabular-nums',
    },
    {
      id: 'settled',
      header: 'Paid So Far',
      cell: (charge) =>
        charge.settled > 0 ? (
          formatCurrency(charge.settled)
        ) : (
          <span className="text-muted">&mdash;</span>
        ),
      cellClassName: 'tabular-nums text-emerald-700',
    },
    {
      id: 'remaining',
      header: 'Remaining',
      cell: (charge) => formatCurrency(charge.remaining),
      cellClassName: 'tabular-nums font-bold text-brand-700',
    },
  ]

  return (
    <SectionCard
      title="Open Charges"
      action={<span className="text-xs text-muted">Payments clear the oldest first</span>}
    >
      <SummaryTable
        columns={columns}
        rows={charges}
        rowKey={(charge) => charge.saleId}
        emptyMessage="No unpaid sales. This account is settled."
        minWidthClassName="min-w-[40rem]"
      />
    </SectionCard>
  )
}
