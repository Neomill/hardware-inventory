import { XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/common/SectionCard'
import { StatusPill } from '@/components/common/StatusPill'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import { CANCELLED_SALE_LABEL } from '@/domain/saleCancellation'
import type { ProductSaleRow } from '@/features/products/lib/productDetail'
import { formatCurrency, formatDateTimeShort, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

function buildColumns(unit: string): SummaryColumn<ProductSaleRow>[] {
  return [
    {
      id: 'saleNumber',
      header: 'Sale No.',
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-2">
          <Link
            to={ROUTES.saleDetail(row.saleId)}
            className="font-semibold text-navy-900 underline-offset-2 hover:text-brand-600 hover:underline"
          >
            {row.saleNumber}
          </Link>
          {row.cancelled ? (
            <StatusPill tone="neutral" icon={XCircle}>
              {CANCELLED_SALE_LABEL}
            </StatusPill>
          ) : null}
        </span>
      ),
    },
    {
      id: 'when',
      header: 'When',
      cell: (row) => formatDateTimeShort(new Date(row.occurredAt)),
      cellClassName: 'text-muted',
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: (row) => row.customerName,
      cellClassName: 'whitespace-normal',
    },
    {
      id: 'quantity',
      header: 'Qty',
      cell: (row) => `${formatNumber(row.quantity)} ${unit}`,
      cellClassName: 'tabular-nums',
    },
    {
      id: 'unitPrice',
      header: 'Unit Price',
      cell: (row) => formatCurrency(row.unitPrice),
      cellClassName: 'tabular-nums',
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (row) => (
        <span className={cn('font-semibold', row.cancelled && 'text-muted line-through')}>
          {formatCurrency(row.amount)}
        </span>
      ),
      cellClassName: 'tabular-nums',
    },
  ]
}

type ProductSalesCardProps = {
  unit: string
  rows: ProductSaleRow[]
}

/** Latest sales containing the product, any status, priced as sold (spec 04 s.5.4). */
export function ProductSalesCard({ unit, rows }: ProductSalesCardProps) {
  return (
    <SectionCard title="Recent Sales">
      <SummaryTable
        columns={buildColumns(unit)}
        rows={rows}
        rowKey={(row) => row.saleId}
        minWidthClassName="min-w-[44rem]"
        hoverable
        emptyMessage="Not sold yet."
      />
    </SectionCard>
  )
}
