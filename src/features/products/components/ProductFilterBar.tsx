import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { SelectField, type SelectOption } from '@/components/common/SelectField'
import { ALL } from '@/features/products/lib/productQuery'
import { STOCK_STATUS_LABELS } from '@/domain/stock'
import type { StockStatus } from '@/domain/types'
import type { ProductFilters } from '@/features/products/types'

const STOCK_STATUS_ORDER: StockStatus[] = ['in_stock', 'low_stock', 'out_of_stock']

function toOptions(values: string[], allLabel: string): SelectOption[] {
  return [
    { value: ALL, label: allLabel },
    ...values.map((value) => ({ value, label: value })),
  ]
}

type ProductFilterBarProps = {
  filters: ProductFilters
  categories: string[]
  units: string[]
  hasFilters: boolean
  onChange: (key: keyof ProductFilters, value: string) => void
  onClear: () => void
}

export function ProductFilterBar({
  filters,
  categories,
  units,
  hasFilters,
  onChange,
  onClear,
}: ProductFilterBarProps) {
  const stockStatusOptions: SelectOption[] = [
    { value: ALL, label: 'All' },
    ...STOCK_STATUS_ORDER.map((status) => ({
      value: status,
      label: STOCK_STATUS_LABELS[status],
    })),
  ]

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SelectField
          label="Category"
          value={filters.category}
          options={toOptions(categories, 'All Categories')}
          onChange={(value) => onChange('category', value)}
        />
        <SelectField
          label="Stock Status"
          value={filters.stockStatus}
          options={stockStatusOptions}
          onChange={(value) => onChange('stockStatus', value)}
        />
        <SelectField
          label="Unit"
          value={filters.unit}
          options={toOptions(units, 'All')}
          onChange={(value) => onChange('unit', value)}
        />
      </div>

      <Button icon={RotateCcw} onClick={onClear} disabled={!hasFilters}>
        Clear Filters
      </Button>
    </div>
  )
}
