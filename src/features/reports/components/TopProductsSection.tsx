import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/common/SectionCard'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import { ReportSection } from '@/features/reports/components/ReportSection'
import { SegmentedControl } from '@/features/reports/components/SegmentedControl'
import type { ResolvedRange, TopProductsMetric } from '@/features/reports/lib/reportRange'
import { TOP_PRODUCTS_LIMIT, type TopProductRow } from '@/features/reports/lib/reportViewModel'
import { formatCurrency, formatNumber } from '@/lib/format'

const METRIC_OPTIONS: { value: TopProductsMetric; label: string }[] = [
  { value: 'quantity', label: 'By quantity' },
  { value: 'revenue', label: 'By revenue' },
]

type TopProductsSectionProps = {
  rows: TopProductRow[]
  metric: TopProductsMetric
  onMetricChange: (metric: TopProductsMetric) => void
  range: ResolvedRange
}

/** A thin magnitude bar behind the share figure; the number is always printed. */
function ShareBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-navy-500" style={{ width: `${percent}%` }} />
      </span>
      <span className="w-10 text-right tabular-nums text-muted">{percent}%</span>
    </div>
  )
}

export function TopProductsSection({
  rows,
  metric,
  onMetricChange,
  range,
}: TopProductsSectionProps) {
  const columns: SummaryColumn<TopProductRow>[] = [
    {
      id: 'rank',
      header: '#',
      cell: (row) => row.rank,
      cellClassName: 'w-8 text-muted tabular-nums',
    },
    {
      id: 'product',
      header: 'Product',
      cell: (row) => (
        <div className="min-w-0">
          <Link
            to={ROUTES.productDetail(row.productId)}
            className="font-medium text-navy-900 hover:text-brand-600 hover:underline"
          >
            {row.productName}
          </Link>
          <p className="text-xs text-muted">{row.sku}</p>
        </div>
      ),
      cellClassName: 'whitespace-normal',
    },
    {
      id: 'quantity',
      header: 'Qty Sold',
      cell: (row) => (
        <span className={metric === 'quantity' ? 'font-semibold' : undefined}>
          {formatNumber(row.quantity)} <span className="text-muted">{row.unit}</span>
        </span>
      ),
      cellClassName: 'tabular-nums',
    },
    {
      id: 'revenue',
      header: 'Revenue',
      cell: (row) => (
        <span className={metric === 'revenue' ? 'font-semibold' : undefined}>
          {formatCurrency(row.revenue)}
        </span>
      ),
      cellClassName: 'tabular-nums',
    },
    {
      id: 'sales',
      header: 'Sales',
      cell: (row) => formatNumber(row.saleCount),
      cellClassName: 'tabular-nums',
    },
    {
      id: 'share',
      header: metric === 'revenue' ? 'Share of revenue' : 'Share of units',
      cell: (row) => <ShareBar percent={row.percent} />,
    },
  ]

  return (
    <ReportSection
      id="top-products"
      title="Top Selling Products"
      description={`The ${TOP_PRODUCTS_LIMIT} best sellers for ${range.phrase}. Revenue is before sale-level discounts, VAT included.`}
      action={
        <SegmentedControl
          label="Rank products"
          value={metric}
          options={METRIC_OPTIONS}
          onChange={onMetricChange}
        />
      }
    >
      <SectionCard title={metric === 'revenue' ? 'Ranked by Revenue' : 'Ranked by Quantity'}>
        <SummaryTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.productId}
          minWidthClassName="min-w-[44rem]"
          hoverable
          emptyMessage="Nothing was sold in this period."
        />
        {rows.length > 0 ? (
          <p className="mt-3 text-xs text-muted">
            Shares are of the {rows.length} products listed.
          </p>
        ) : null}
      </SectionCard>
    </ReportSection>
  )
}
