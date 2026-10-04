import { MovementTypePill, QuantityDeltaPill } from '@/components/common/StatusPills'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import type { Product, StockMovement } from '@/domain/types'
import { displayReference } from '@/features/inventory/lib/movementQuery'
import { formatDateTimeShort } from '@/lib/format'

function buildColumns(productsById: Map<string, Product>): SummaryColumn<StockMovement>[] {
  return [
    {
      id: 'time',
      header: 'Date & Time',
      cell: (movement) => formatDateTimeShort(new Date(movement.occurredAt)),
      cellClassName: 'text-muted',
    },
    {
      id: 'type',
      header: 'Type',
      cell: (movement) => <MovementTypePill type={movement.type} />,
    },
    {
      id: 'product',
      header: 'Product',
      cell: (movement) => {
        const product = productsById.get(movement.productId)

        return (
          <span className="flex flex-col">
            <span className="font-medium">{product?.name ?? movement.productId}</span>
            <span className="text-xs text-muted">{product?.sku ?? 'Removed product'}</span>
          </span>
        )
      },
    },
    {
      id: 'description',
      header: 'Description',
      cell: (movement) => (
        <span className="flex max-w-xs flex-col whitespace-normal">
          <span>{movement.description}</span>
          {movement.note ? <span className="text-xs text-muted">Note: {movement.note}</span> : null}
        </span>
      ),
    },
    {
      id: 'reference',
      header: 'Reference',
      cell: (movement) => displayReference(movement.reference),
      cellClassName: 'text-muted',
    },
    {
      id: 'quantity',
      header: 'Qty',
      cell: (movement) => (
        <QuantityDeltaPill
          delta={movement.quantityDelta}
          unit={productsById.get(movement.productId)?.unit}
        />
      ),
    },
    {
      id: 'recordedBy',
      header: 'Recorded By',
      cell: (movement) => movement.recordedBy,
    },
  ]
}

type MovementTableProps = {
  rows: StockMovement[]
  productsById: Map<string, Product>
  emptyMessage: string
}

export function MovementTable({ rows, productsById, emptyMessage }: MovementTableProps) {
  return (
    <SummaryTable
      columns={buildColumns(productsById)}
      rows={rows}
      rowKey={(movement) => movement.id}
      minWidthClassName="min-w-[62rem]"
      hoverable
      emptyMessage={emptyMessage}
    />
  )
}
