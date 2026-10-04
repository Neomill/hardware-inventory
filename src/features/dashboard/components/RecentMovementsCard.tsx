import { SectionCard } from '@/components/common/SectionCard'
import { StatusPill, type PillTone } from '@/components/common/StatusPill'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import type { MovementType, StockMovement } from '@/domain/types'
import { formatDateTimeShort, formatNumber } from '@/lib/format'

const TYPE_LABELS: Record<MovementType, string> = {
  stock_in: 'Stock In',
  sale: 'Sale',
  sale_reversal: 'Reversal',
  adjustment: 'Adjustment',
}

const TYPE_TONES: Record<MovementType, PillTone> = {
  stock_in: 'success',
  sale: 'danger',
  sale_reversal: 'info',
  adjustment: 'warning',
}

/** "+150 pcs" / "-5 pcs" -- the sign is the point, so it is always shown. */
function formatDelta(quantityDelta: number): string {
  const sign = quantityDelta > 0 ? '+' : '-'

  return `${sign}${formatNumber(Math.abs(quantityDelta))}`
}

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
    cell: (movement) => (
      <StatusPill tone={TYPE_TONES[movement.type]}>{TYPE_LABELS[movement.type]}</StatusPill>
    ),
  },
  {
    id: 'description',
    header: 'Description',
    cell: (movement) => movement.description,
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
    cell: (movement) => (
      <StatusPill tone={movement.quantityDelta > 0 ? 'success' : 'danger'}>
        {formatDelta(movement.quantityDelta)}
      </StatusPill>
    ),
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
