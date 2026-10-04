import { useState } from 'react'
import { PackagePlus, RotateCcw } from 'lucide-react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { SelectField, type SelectOption } from '@/components/common/SelectField'
import { ROUTES } from '@/app/routes'
import { AdjustStockDialog } from '@/features/inventory/components/AdjustStockDialog'
import { InventorySummaryStrip } from '@/features/inventory/components/InventorySummaryStrip'
import { InventoryTable } from '@/features/inventory/components/InventoryTable'
import { useInventoryList } from '@/features/inventory/hooks/useInventoryList'
import { ALL, type InventoryFilters } from '@/features/inventory/lib/inventoryQuery'
import { formatQuantityDelta } from '@/features/inventory/lib/movementQuery'
import { STOCK_STATUS_LABELS } from '@/domain/stock'
import type { Product, StockMovement, StockStatus } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { useShopStore } from '@/stores/useShopStore'

const STATUS_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'All' },
  ...(['in_stock', 'low_stock', 'out_of_stock'] as StockStatus[]).map((status) => ({
    value: status,
    label: STOCK_STATUS_LABELS[status],
  })),
]

export function CurrentInventoryView() {
  const products = useShopStore((state) => state.products)
  const list = useInventoryList(products)
  // Hold the id, not the product, so the dialog always reads live stock.
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const adjusting = products.find((product) => product.id === adjustingId) ?? null

  function handleAdjusted(product: Product, movement: StockMovement) {
    const newStock = product.stock + movement.quantityDelta

    setNotice(
      `${product.name}: ${formatQuantityDelta(movement.quantityDelta)} ${product.unit} (${movement.reason}). ` +
        `Now ${formatNumber(newStock)} ${product.unit} on hand.`,
    )
    setAdjustingId(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={list.filters.search}
            onChange={(value) => list.updateFilter('search', value)}
            label="Search inventory"
            placeholder="Search by product name or SKU..."
            className="flex-1"
          />
          <Button icon={PackagePlus} variant="primary" to={ROUTES.receiveStock}>
            Receive Stock
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <SelectField
              label="Stock Status"
              value={list.filters.stockStatus}
              options={STATUS_OPTIONS}
              onChange={(value) =>
                list.updateFilter('stockStatus', value as InventoryFilters['stockStatus'])
              }
            />
            <SelectField
              label="Category"
              value={list.filters.category}
              options={[
                { value: ALL, label: 'All Categories' },
                ...list.categories.map((category) => ({ value: category, label: category })),
              ]}
              onChange={(value) => list.updateFilter('category', value)}
            />
          </div>
          <Button icon={RotateCcw} onClick={list.clearFilters} disabled={!list.hasFilters}>
            Clear Filters
          </Button>
        </div>
      </section>

      <InventorySummaryStrip summary={list.summary} />

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <section className="card flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <h2 className="card-title">Current Inventory</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">{list.rangeLabel}</span>
            <Pagination page={list.page} pageCount={list.pageCount} onChange={list.setPage} />
          </div>
        </header>

        <div className="px-5 pb-5 pt-4">
          <InventoryTable
            rows={list.rows}
            hasFilters={list.hasFilters}
            onAdjust={(product) => {
              setNotice(null)
              setAdjustingId(product.id)
            }}
          />
        </div>
      </section>

      {adjusting ? (
        <AdjustStockDialog
          product={adjusting}
          onClose={() => setAdjustingId(null)}
          onAdjusted={(movement) => handleAdjusted(adjusting, movement)}
        />
      ) : null}
    </div>
  )
}
