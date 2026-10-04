import { useState } from 'react'

import { ProductFilterBar } from '@/features/products/components/ProductFilterBar'
import { ProductListCard } from '@/features/products/components/ProductListCard'
import { ProductSummaryStrip } from '@/features/products/components/ProductSummaryStrip'
import { ProductToolbar } from '@/features/products/components/ProductToolbar'
import { useProductList } from '@/features/products/hooks/useProductList'
import { downloadCsv } from '@/features/products/lib/exportCsv'
import { deriveStockStatus, STOCK_STATUS_LABELS } from '@/domain/stock'
import { toPesos } from '@/domain/money'
import { useShopStore } from '@/stores/useShopStore'

const EXPORT_HEADER = ['Product', 'SKU', 'Category', 'Unit', 'Price', 'Stock', 'Status']

export function ProductsPage() {
  // Live catalogue: a sale at the counter shows up here immediately.
  const products = useShopStore((state) => state.products)
  const list = useProductList(products)
  // The design shows the filter row open; it stays collapsible for small screens.
  const [filtersVisible, setFiltersVisible] = useState(true)

  function handleExport() {
    const rows = list.matches.map((product) => [
      product.name,
      product.sku,
      product.category,
      product.unit,
      toPesos(product.price).toFixed(2),
      String(product.stock),
      STOCK_STATUS_LABELS[deriveStockStatus(product.stock, product.reorderLevel)],
    ])

    downloadCsv('products.csv', EXPORT_HEADER, rows)
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-4 p-5">
        <ProductToolbar
          search={list.filters.search}
          onSearchChange={(value) => list.updateFilter('search', value)}
          filtersVisible={filtersVisible}
          onToggleFilters={() => setFiltersVisible((visible) => !visible)}
          onExport={handleExport}
          exportDisabled={list.matchCount === 0}
        />

        {filtersVisible ? (
          <ProductFilterBar
            filters={list.filters}
            categories={list.categories}
            units={list.units}
            hasFilters={list.hasFilters}
            onChange={list.updateFilter}
            onClear={list.clearFilters}
          />
        ) : null}
      </section>

      <ProductSummaryStrip summary={list.summary} />

      <ProductListCard
        rows={list.rows}
        page={list.page}
        pageCount={list.pageCount}
        pageSize={list.pageSize}
        rangeLabel={list.rangeLabel}
        hasFilters={list.hasFilters}
        onPageChange={list.setPage}
        onPageSizeChange={list.changePageSize}
      />
    </div>
  )
}
