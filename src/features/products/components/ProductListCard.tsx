import { Pagination } from '@/components/common/Pagination'
import { SelectField } from '@/components/common/SelectField'
import { StatusPill } from '@/components/common/StatusPill'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ProductRowActions } from '@/features/products/components/ProductRowActions'
import { ProductThumbnail } from '@/features/products/components/ProductThumbnail'
import { PAGE_SIZE_OPTIONS } from '@/features/products/hooks/useProductList'
import { STOCK_STATUS_TONES, STOCK_TEXT_STYLES } from '@/components/common/statusTones'
import { STOCK_STATUS_LABELS, deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber } from '@/lib/format'

const COLUMNS: SummaryColumn<Product>[] = [
  {
    id: 'product',
    header: 'Product',
    cell: (product) => (
      <span className="flex items-center gap-3">
        <ProductThumbnail name={product.name} imageUrl={product.imageUrl} />
        <span className="font-medium">{product.name}</span>
      </span>
    ),
    // Long names wrap instead of pushing Actions out of the card at 1280px.
    cellClassName: 'min-w-[13rem] whitespace-normal',
  },
  {
    id: 'sku',
    header: 'SKU',
    cell: (product) => product.sku,
    cellClassName: 'text-muted',
  },
  {
    id: 'category',
    header: 'Category',
    cell: (product) => product.category,
  },
  {
    id: 'unit',
    header: 'Unit',
    cell: (product) => product.unit,
    cellClassName: 'text-muted',
  },
  {
    id: 'price',
    header: 'Price',
    cell: (product) => formatCurrency(product.price),
    cellClassName: 'font-semibold tabular-nums',
  },
  {
    id: 'stock',
    header: 'Stock',
    cell: (product) => (
      <span
        className={cn(
          'font-semibold tabular-nums',
          STOCK_TEXT_STYLES[deriveStockStatus(product.stock, product.reorderLevel)],
        )}
      >
        {formatNumber(product.stock)}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (product) => {
      const status = deriveStockStatus(product.stock, product.reorderLevel)

      return (
        <StatusPill tone={STOCK_STATUS_TONES[status]}>{STOCK_STATUS_LABELS[status]}</StatusPill>
      )
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: (product) => <ProductRowActions productId={product.id} productName={product.name} />,
  },
]

type ProductListCardProps = {
  rows: Product[]
  page: number
  pageCount: number
  pageSize: number
  rangeLabel: string
  hasFilters: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function ProductListCard({
  rows,
  page,
  pageCount,
  pageSize,
  rangeLabel,
  hasFilters,
  onPageChange,
  onPageSizeChange,
}: ProductListCardProps) {
  return (
    <section className="card flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <h2 className="card-title">Product List</h2>

        <div className="flex flex-wrap items-center gap-3">
          <SelectField
            label="Show"
            value={String(pageSize)}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            onChange={(value) => onPageSizeChange(Number(value))}
            className="w-24"
          />

          <span className="text-sm text-muted">{rangeLabel}</span>

          <Pagination page={page} pageCount={pageCount} onChange={onPageChange} />
        </div>
      </header>

      <div className="px-5 pb-5 pt-4">
        <SummaryTable
          columns={COLUMNS}
          rows={rows}
          rowKey={(product) => product.id}
          minWidthClassName="min-w-[52rem]"
          hoverable
          emptyMessage={
            hasFilters
              ? 'No products match these filters. Try clearing them.'
              : 'No products in the catalogue yet.'
          }
        />
      </div>
    </section>
  )
}
