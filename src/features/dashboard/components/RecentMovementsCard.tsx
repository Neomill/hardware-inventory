import { SectionCard } from '@/components/common/SectionCard'
import { StatusPill, type PillTone } from '@/components/common/StatusPill'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import type { InventoryMovement, MovementType } from '@/features/dashboard/types'
import { formatDateTimeShort, formatNumber } from '@/lib/format'

const TYPE_LABELS: Record<MovementType, string> = {
  stock_in: 'Stock In',
  sale: 'Sale',
}

const TYPE_TONES: Record<MovementType, PillTone> = {
  stock_in: 'success',
  sale: 'danger',
}

/** "+150 pcs" / "-5 pcs" -- the sign is the point, so it is always shown. */
function formatDelta(quantityDelta: number, unit: string): string {
  const sign = quantityDelta > 0 ? '+' : '-'
  return `${sign}${formatNumber(Math.abs(quantityDelta))} ${unit}`
}

const COLUMNS: SummaryColumn<InventoryMovement>[] = [
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
        {formatDelta(movement.quantityDelta, movement.unit)}
      </StatusPill>
    ),
  },
  {
    id: 'user',
    header: 'Recorded By',
    cell: (movement) => movement.userName,
  },
]

type RecentMovementsCardProps = {
  movements: InventoryMovement[]
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
