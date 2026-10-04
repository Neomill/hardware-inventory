import { HandCoins, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/common/SectionCard'
import { StatCard } from '@/components/common/StatCard'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import type { CustomerBalance } from '@/domain/ledger'
import type { CustomerPayment } from '@/domain/types'
import { ReportSection } from '@/features/reports/components/ReportSection'
import { formatShortDate } from '@/features/reports/lib/reportFormat'
import type { ResolvedRange } from '@/features/reports/lib/reportRange'
import type { OutstandingCreditView } from '@/features/reports/lib/reportViewModel'
import { formatCurrency, formatDateTimeShort, formatNumber } from '@/lib/format'

type OutstandingCreditSectionProps = {
  credit: OutstandingCreditView
  range: ResolvedRange
}

function CustomerLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      to={ROUTES.customerDetail(id)}
      className="font-medium text-navy-900 hover:text-brand-600 hover:underline"
    >
      {name}
    </Link>
  )
}

const BALANCE_COLUMNS: SummaryColumn<CustomerBalance>[] = [
  {
    id: 'customer',
    header: 'Customer',
    cell: (row) => (
      <div>
        <CustomerLink id={row.customerId} name={row.customerName} />
        {row.phone ? <p className="text-xs text-muted">{row.phone}</p> : null}
      </div>
    ),
  },
  {
    id: 'outstanding',
    header: 'Outstanding',
    cell: (row) => formatCurrency(row.outstanding),
    cellClassName: 'font-semibold tabular-nums',
  },
  {
    id: 'charged',
    header: 'Charged',
    cell: (row) => formatCurrency(row.totalCharged),
    cellClassName: 'tabular-nums',
  },
  {
    id: 'paid',
    header: 'Paid',
    cell: (row) => formatCurrency(row.totalPaid),
    cellClassName: 'tabular-nums',
  },
  {
    id: 'open',
    header: 'Open Charges',
    cell: (row) => formatNumber(row.openChargeCount),
    cellClassName: 'tabular-nums',
  },
  {
    id: 'oldest',
    header: 'Owing Since',
    cell: (row) => (row.oldestOpenChargeAt ? formatShortDate(new Date(row.oldestOpenChargeAt)) : '--'),
    cellClassName: 'text-muted',
  },
]

const PAYMENT_COLUMNS: SummaryColumn<CustomerPayment>[] = [
  {
    id: 'when',
    header: 'Received',
    cell: (payment) => formatDateTimeShort(new Date(payment.occurredAt)),
    cellClassName: 'text-muted',
  },
  {
    id: 'reference',
    header: 'Reference',
    cell: (payment) => payment.id,
    cellClassName: 'font-mono text-xs',
  },
  {
    id: 'customer',
    header: 'Customer',
    cell: (payment) => <CustomerLink id={payment.customerId} name={payment.customerName} />,
  },
  {
    id: 'amount',
    header: 'Amount',
    cell: (payment) => formatCurrency(payment.amount),
    cellClassName: 'font-semibold tabular-nums',
  },
]

export function OutstandingCreditSection({ credit, range }: OutstandingCreditSectionProps) {
  return (
    <ReportSection
      id="outstanding-credit"
      title="Outstanding Credit"
      description={`What customers owe right now, whatever the period, and the credit payments received ${
        range.preset === 'today' || range.preset === 'yesterday' ? range.phrase : `in ${range.phrase}`
      }.`}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(credit.totalOutstanding)}
          icon={Wallet}
          tone="orange"
          iconShape="circle"
          footer={<span className="text-muted">as of now, all customers</span>}
        />
        <StatCard
          label="Customers Owing"
          value={formatNumber(credit.balances.length)}
          icon={Users}
          tone="indigo"
          iconShape="circle"
          footer={<span className="text-muted">with a balance above zero</span>}
          action={{ to: ROUTES.customers, label: 'View Customers' }}
        />
        <StatCard
          label="Credit Payments Received"
          value={formatCurrency(credit.paymentsReceived)}
          icon={HandCoins}
          tone="green"
          iconShape="circle"
          footer={
            <span className="text-muted">
              {formatNumber(credit.paymentsInRange.length)}{' '}
              {credit.paymentsInRange.length === 1 ? 'payment' : 'payments'} in this period
            </span>
          }
        />
      </div>

      <SectionCard title="Customer Balances">
        <SummaryTable
          columns={BALANCE_COLUMNS}
          rows={credit.balances}
          rowKey={(row) => row.customerId}
          minWidthClassName="min-w-[46rem]"
          hoverable
          emptyMessage="No customer owes anything."
        />
      </SectionCard>

      <SectionCard title={`Credit Payments Received (${range.label})`}>
        <SummaryTable
          columns={PAYMENT_COLUMNS}
          rows={credit.paymentsInRange}
          rowKey={(payment) => payment.id}
          minWidthClassName="min-w-[34rem]"
          hoverable
          emptyMessage="No credit payments were received in this period."
        />
      </SectionCard>
    </ReportSection>
  )
}
