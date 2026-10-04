import { SectionCard } from '@/components/common/SectionCard'
import { PaymentMethodPill } from '@/components/common/StatusPills'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import type { Sale } from '@/domain/types'
import { formatCurrency, formatTime } from '@/lib/format'

const COLUMNS: SummaryColumn<Sale>[] = [
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
    cellClassName: 'font-semibold tabular-nums',
  },
  {
    id: 'payment',
    header: 'Payment',
    cell: (sale) => <PaymentMethodPill method={sale.paymentMethod} />,
  },
]

type RecentSalesCardProps = {
  sales: Sale[]
}

export function RecentSalesCard({ sales }: RecentSalesCardProps) {
  return (
    <SectionCard
      title="Recent Sales"
      className="min-w-0"
      action={<ViewAllLink to={ROUTES.sales} />}
    >
      <SummaryTable
        columns={COLUMNS}
        rows={sales}
        rowKey={(sale) => sale.id}
        emptyMessage="No sales recorded yet today."
      />
    </SectionCard>
  )
}
