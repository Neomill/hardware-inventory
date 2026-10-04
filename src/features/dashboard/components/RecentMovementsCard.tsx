import { SectionCard } from '@/components/common/SectionCard'
import { MovementTypePill, QuantityDeltaPill } from '@/components/common/StatusPills'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import type { StockMovement } from '@/domain/types'
import { formatDateTimeShort } from '@/lib/format'

const COLUMNS: SummaryColumn<StockMovement>[] = [
  {
    id: 'time',
    header: 'Time',
    cell: (movement) => formatDateTimeShort(new Date(movement.occurredAt)),
    cellClassName: 'text-muted',
  },
  {
    id: 'type',
    header: 'Type',
    cell: (movement) => <MovementTypePill type={movement.type} />,
  },
  {
    id: 'description',
    header: 'Description',
    cell: (movement) => movement.description,
    // Wraps so the six columns fit a portrait tablet without scrolling.
    cellClassName: 'min-w-[9rem] whitespace-normal',
  },
  {
    id: 'reference',
    header: 'Reference',
    cell: (movement) => movement.reference,
    cellClassName: 'text-muted',
  },
  {
    id: 'quantity',
    header: 'Qty',
    cell: (movement) => <QuantityDeltaPill delta={movement.quantityDelta} />,
  },
  {
    id: 'recordedBy',
    header: 'Recorded By',
    cell: (movement) => movement.recordedBy,
  },
]

type RecentMovementsCardProps = {
  movements: StockMovement[]
}

export function RecentMovementsCard({ movements }: RecentMovementsCardProps) {
  return (
    <SectionCard
      title="Recent Stock Movements"
      className="min-w-0"
      action={<ViewAllLink to={ROUTES.stockMovements} />}
    >
      <SummaryTable
        columns={COLUMNS}
        rows={movements}
        rowKey={(movement) => movement.id}
        emptyMessage="No stock movements recorded yet."
      />
    </SectionCard>
  )
}
