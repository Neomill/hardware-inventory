import { SectionCard } from '@/components/common/SectionCard'
import { StatusPill, type PillTone } from '@/components/common/StatusPill'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import type { PaymentMethod, RecentSale } from '@/features/dashboard/types'
import { formatCurrency, formatTime } from '@/lib/format'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  partial: 'Partial',
  credit: 'Credit',
}

const PAYMENT_TONES: Record<PaymentMethod, PillTone> = {
  cash: 'success',
  partial: 'info',
  credit: 'danger',
}

const COLUMNS: SummaryColumn<RecentSale>[] = [
  {
    id: 'time',
    header: 'Time',
    cell: (sale) => formatTime(new Date(sale.occurredAt)),
    cellClassName: 'text-muted',
  },
  {
    id: 'saleNumber',
    header: 'Sale No.',
    cell: (sale) => sale.saleNumber,
    cellClassName: 'font-medium',
  },
  {
    id: 'customer',
    header: 'Customer',
    cell: (sale) => sale.customerName,
  },
  {
    id: 'total',
    header: 'Total',
    cell: (sale) => formatCurrency(sale.total),
    cellClassName: 'font-semibold',
  },
  {
    id: 'payment',
    header: 'Payment',
    cell: (sale) => (
      <StatusPill tone={PAYMENT_TONES[sale.paymentMethod]}>
        {PAYMENT_LABELS[sale.paymentMethod]}
      </StatusPill>
    ),
  },
]

type RecentSalesCardProps = {
  sales: RecentSale[]
}

export function RecentSalesCard({ sales }: RecentSalesCardProps) {
  return (
    <SectionCard title="Recent Sales" action={<ViewAllLink to={ROUTES.sales} />}>
      <SummaryTable
        columns={COLUMNS}
        rows={sales}
        rowKey={(sale) => sale.id}
        emptyMessage="No sales recorded yet today."
      />
    </SectionCard>
  )
}
