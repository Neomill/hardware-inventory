import { useMemo } from 'react'
import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { Pagination } from '@/components/common/Pagination'
import { SelectField, type SelectOption } from '@/components/common/SelectField'
import { MovementTable } from '@/features/inventory/components/MovementTable'
import { useMovementLog } from '@/features/inventory/hooks/useMovementLog'
import {
  ALL,
  DATE_PRESET_LABELS,
  DATE_PRESET_ORDER,
  MOVEMENT_TYPE_ORDER,
  formatQuantityDelta,
  type MovementLogFilters,
} from '@/features/inventory/lib/movementQuery'
import { MOVEMENT_TYPE_LABELS } from '@/domain/inventory'
import { formatNumber } from '@/lib/format'
import { useShopStore } from '@/stores/useShopStore'

const TYPE_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'All Types' },
  ...MOVEMENT_TYPE_ORDER.map((type) => ({ value: type, label: MOVEMENT_TYPE_LABELS[type] })),
]

const DATE_OPTIONS: SelectOption[] = DATE_PRESET_ORDER.map((preset) => ({
  value: preset,
  label: DATE_PRESET_LABELS[preset],
}))

type StockMovementsViewProps = {
  initialProductId: string | null
}

export function StockMovementsView({ initialProductId }: StockMovementsViewProps) {
  const movements = useShopStore((state) => state.movements)
  const products = useShopStore((state) => state.products)
  const log = useMovementLog(movements, initialProductId)

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const productOptions: SelectOption[] = useMemo(
    () => [
      { value: ALL, label: 'All Products' },
      ...[...products]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` })),
    ],
    [products],
  )

  const totals: { label: string; value: string }[] = [
    { label: 'Received', value: `+${formatNumber(log.totals.received)}` },
    { label: 'Sold', value: `-${formatNumber(log.totals.sold)}` },
    { label: 'Reversed', value: `+${formatNumber(log.totals.reversed)}` },
    { label: 'Adjusted', value: formatQuantityDelta(log.totals.adjusted) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-3 p-5 lg:flex-row lg:items-center">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <SelectField
            label="Type"
            value={log.filters.type}
            options={TYPE_OPTIONS}
            onChange={(value) => log.updateFilter('type', value as MovementLogFilters['type'])}
          />
          <SelectField
            label="Product"
            value={log.filters.productId}
            options={productOptions}
            onChange={(value) => log.updateFilter('productId', value)}
          />
          <SelectField
            label="Date"
            value={log.filters.datePreset}
            options={DATE_OPTIONS}
            onChange={(value) =>
              log.updateFilter('datePreset', value as MovementLogFilters['datePreset'])
            }
          />
        </div>
        <Button icon={RotateCcw} onClick={log.resetFilters} disabled={!log.isFiltered}>
          Reset Filters
        </Button>
      </section>

      <section className="card flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="card-title">Stock Movements</h2>
            {/* Units only add up within one product, so totals show only then. */}
            {log.filters.productId !== ALL && log.matchCount > 0 ? (
              <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {totals.map((total) => (
                  <div key={total.label} className="flex gap-1.5">
                    <dt className="text-muted">{total.label}</dt>
                    <dd className="font-semibold tabular-nums text-navy-900">{total.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">{log.rangeLabel}</span>
            <Pagination page={log.page} pageCount={log.pageCount} onChange={log.setPage} />
          </div>
        </header>

        <div className="px-5 pb-5 pt-4">
          <MovementTable
            rows={log.rows}
            productsById={productsById}
            emptyMessage={
              log.isFiltered
                ? 'No stock movements match these filters.'
                : 'No stock movements in the last 30 days.'
            }
          />
        </div>
      </section>
    </div>
  )
}
