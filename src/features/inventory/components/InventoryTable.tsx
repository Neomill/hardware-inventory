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

const ICON_LINK =
  'flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-navy-700 transition-colors hover:bg-navy-50'

const TEXT_ACTION =
  'inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50'

function buildColumns(onAdjust: (product: Product) => void): SummaryColumn<Product>[] {
  return [
    {
      id: 'product',
      header: 'Product',
      cell: (product) => (
        <span className="flex flex-col">
          <span className="font-medium">{product.name}</span>
          <span className="text-xs text-muted">
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
      header: 'On Hand',
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
      header: 'Reorder Level',
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
            <PackagePlus className="h-4 w-4" aria-hidden />
            Receive
          </Link>
          <button
            type="button"
            onClick={() => onAdjust(product)}
            aria-label={`Adjust stock for ${product.name}`}
            className={TEXT_ACTION}
          >
            <SlidersVertical className="h-4 w-4" aria-hidden />
            Adjust
          </button>
          <Link
            to={ROUTES.movementsFor(product.id)}
            aria-label={`Stock movements for ${product.name}`}
            title="Stock movements"
            className={ICON_LINK}
          >
            <History className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to={ROUTES.productDetail(product.id)}
            aria-label={`View ${product.name}`}
            title="Product details"
            className={ICON_LINK}
          >
            <Eye className="h-4 w-4" aria-hidden />
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
