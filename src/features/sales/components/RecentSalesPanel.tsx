import { useMemo, useState } from 'react'
import { ChevronRight, Eye, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SearchInput } from '@/components/common/SearchInput'
import { PaymentMethodPill } from '@/components/common/StatusPills'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import type { Centavos } from '@/domain/money'
import type { PaymentMethod, Sale } from '@/domain/types'
import { describeSettlement, newestFirst } from '@/features/sales/lib/salesMetrics'
import { cn } from '@/lib/utils'
import { formatCurrency, formatTime } from '@/lib/format'

const FILTERS: { value: 'all' | PaymentMethod; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'partial', label: 'Partial' },
  { value: 'credit', label: 'Credit' },
]

/** `remaining` is what is still unpaid on each sale now (remainingBySale). */
function buildColumns(remaining: Map<string, Centavos>): SummaryColumn<Sale>[] {
  return [
    {
      id: 'saleNumber',
      header: 'Sale No.',
      cell: (sale) => <span className="font-semibold">{sale.saleNumber}</span>,
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: (sale) => (
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <UserRound className="h-4 w-4" aria-hidden />
          </span>
          {sale.customerName}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (sale) => <PaymentMethodPill method={sale.paymentMethod} />,
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (sale) => formatCurrency(sale.total),
      cellClassName: 'font-semibold tabular-nums',
    },
    {
      id: 'time',
      header: 'Time',
      cell: (sale) => formatTime(new Date(sale.occurredAt)),
      cellClassName: 'text-muted',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (sale) => {
        const settlement = describeSettlement(sale, remaining.get(sale.id) ?? 0)

        return (
          <span className="block">
            <span
              className={cn(
                'block font-semibold',
                settlement.tone === 'success' && 'text-emerald-600',
                settlement.tone === 'warning' && 'text-amber-600',
                settlement.tone === 'danger' && 'text-rose-600',
              )}
            >
              {settlement.label}
            </span>
            {settlement.remaining > 0 ? (
              <span className="block text-xs text-muted">
                {formatCurrency(settlement.remaining)} left
              </span>
            ) : null}
          </span>
        )
      },
    },
    {
      id: 'action',
      header: 'Action',
      cell: (sale) => (
        <Link
          to={ROUTES.saleDetail(sale.id)}
          aria-label={`View details of sale ${sale.saleNumber}`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50"
        >
          <Eye className="h-4 w-4" aria-hidden />
          View Details
        </Link>
      ),
    },
  ]
}

type RecentSalesPanelProps = {
  sales: Sale[]
  /** What is still unpaid on each sale after customer payments, keyed by sale id. */
  remaining: Map<string, Centavos>
}

export function RecentSalesPanel({ sales, remaining }: RecentSalesPanelProps) {
  const columns = useMemo(() => buildColumns(remaining), [remaining])
  const [method, setMethod] = useState<'all' | PaymentMethod>('all')
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()

    return newestFirst(sales)
      .filter((sale) => method === 'all' || sale.paymentMethod === method)
      .filter((sale) => {
        if (term === '') {
          return true
        }

        return (
          sale.saleNumber.toLowerCase().includes(term) ||
          sale.customerName.toLowerCase().includes(term)
        )
      })
      .slice(0, 5)
  }, [sales, method, search])

  return (
    <section className="card flex min-w-0 flex-col">
      <header className="flex flex-col gap-4 px-5 pt-5">
        <h2 className="text-lg font-semibold text-navy-900">Recent Sales</h2>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setMethod(filter.value)}
                aria-pressed={method === filter.value}
                className={cn(
                  'h-10 rounded-lg px-4 text-sm font-semibold transition-colors',
                  method === filter.value
                    ? 'bg-navy-900 text-white'
                    : 'border border-slate-200 text-navy-700 hover:bg-navy-50',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search sales"
            placeholder="Search sale no. or customer..."
            className="flex-1"
          />
        </div>
      </header>

      <div className="px-5 pb-2 pt-4">
        <SummaryTable
          columns={columns}
          rows={rows}
          rowKey={(sale) => sale.id}
          minWidthClassName="min-w-[46rem]"
          hoverable
          emptyMessage="No sales match this filter."
        />
      </div>

      <Link
        to={ROUTES.reports}
        className="mx-5 mb-5 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-navy-700 transition-colors hover:bg-navy-50"
      >
        View sales reports
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  )
}
