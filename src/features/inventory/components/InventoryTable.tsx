import { Eye, History, PackagePlus, SlidersVertical } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusPill } from '@/components/common/StatusPill'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ROUTES } from '@/app/routes'
import { STOCK_STATUS_TONES, STOCK_TEXT_STYLES } from '@/components/common/statusTones'
import { STOCK_STATUS_LABELS, deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'

const TEXT_ACTION =
  'inline-flex h-12 items-center gap-2 rounded-lg border border-slate-200 px-3 text-base font-semibold text-navy-800 transition-colors hover:bg-navy-50'

function buildColumns(onAdjust: (product: Product) => void): SummaryColumn<Product>[] {
  return [
    {
      id: 'product',
      header: 'Product',
      cell: (product) => (
        <span className="flex flex-col">
          <span className="font-medium">{product.name}</span>
          <span className="text-sm text-muted">
            {product.sku}
            {product.isActive ? null : ' · Inactive'}
          </span>
        </span>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: (product) => product.category,
      cellClassName: 'text-muted',
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
      id: 'unit',
      header: 'Unit',
      cell: (product) => product.unit,
      cellClassName: 'text-muted',
    },
    {
      id: 'reorder',
      header: 'Low-Stock Alert At',
      cell: (product) => formatNumber(product.reorderLevel),
      cellClassName: 'tabular-nums text-muted',
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
      cell: (product) => (
        <span className="flex items-center gap-2">
          <Link
            to={ROUTES.receiveStockFor(product.id)}
            aria-label={`Receive stock for ${product.name}`}
            className={TEXT_ACTION}
          >
            <PackagePlus className="h-5 w-5" aria-hidden />
            Receive
          </Link>
          <button
            type="button"
            onClick={() => onAdjust(product)}
            aria-label={`Correct stock for ${product.name}`}
            className={TEXT_ACTION}
          >
            <SlidersVertical className="h-5 w-5" aria-hidden />
            Correct Stock
          </button>
          <Link
            to={ROUTES.movementsFor(product.id)}
            aria-label={`Stock history for ${product.name}`}
            className={TEXT_ACTION}
          >
            <History className="h-5 w-5" aria-hidden />
            History
          </Link>
          <Link
            to={ROUTES.productDetail(product.id)}
            aria-label={`View ${product.name}`}
            className={TEXT_ACTION}
          >
            <Eye className="h-5 w-5" aria-hidden />
            View
          </Link>
        </span>
      ),
    },
  ]
}

type InventoryTableProps = {
  rows: Product[]
  hasFilters: boolean
  onAdjust: (product: Product) => void
}

export function InventoryTable({ rows, hasFilters, onAdjust }: InventoryTableProps) {
  return (
    <SummaryTable
      columns={buildColumns(onAdjust)}
      rows={rows}
      rowKey={(product) => product.id}
      minWidthClassName="min-w-[60rem]"
      hoverable
      emptyMessage={
        hasFilters
          ? 'No products match these filters. Try clearing them.'
          : 'No products in the catalogue yet.'
      }
    />
  )
}
