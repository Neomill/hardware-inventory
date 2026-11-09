import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/common/SectionCard'
import { MovementTypePill, QuantityDeltaPill } from '@/components/common/StatusPills'
import { SummaryTable, type SummaryColumn } from '@/components/common/SummaryTable'
import { ViewAllLink } from '@/components/common/ViewAllLink'
import { ROUTES } from '@/app/routes'
import type { Product, StockMovement } from '@/domain/types'
import { formatDateTimeShort } from '@/lib/format'

/** A movement with where its reference leads, worked out by the page (lib/productDetail). */
export type MovementRow = { movement: StockMovement; referenceTo: string | null }

const LINK_CLASS =
  'font-semibold text-navy-900 underline-offset-2 hover:text-brand-600 hover:underline'

function buildColumns(unit: string): SummaryColumn<MovementRow>[] {
  return [
    {
      id: 'when',
      header: 'When',
      cell: ({ movement }) => formatDateTimeShort(new Date(movement.occurredAt)),
      cellClassName: 'text-muted',
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ movement }) => <MovementTypePill type={movement.type} />,
    },
    {
      id: 'change',
      header: 'Change',
      cell: ({ movement }) => <QuantityDeltaPill delta={movement.quantityDelta} unit={unit} />,
    },
    {
      id: 'reference',
      header: 'Reference',
      cell: ({ movement, referenceTo }) => {
        const reference = movement.reference.trim()

        if (referenceTo) {
          return (
            <Link to={referenceTo} className={LINK_CLASS}>
              {reference}
            </Link>
          )
        }

        return <span className="text-muted">{reference === '' ? '—' : reference}</span>
      },
    },
    {
      id: 'details',
      header: 'Details',
      cell: ({ movement }) => (
        <span className="flex max-w-xs flex-col whitespace-normal">
          <span>{movement.description}</span>
          {movement.reason ? (
            <span className="text-sm text-muted">Reason: {movement.reason}</span>
          ) : null}
          {movement.note ? <span className="text-sm text-muted">Note: {movement.note}</span> : null}
        </span>
      ),
    },
    {
      id: 'recordedBy',
      header: 'Recorded By',
      cell: ({ movement }) => movement.recordedBy,
    },
  ]
}

type ProductMovementsCardProps = {
  product: Product
  rows: MovementRow[]
}

export function ProductMovementsCard({ product, rows }: ProductMovementsCardProps) {
  return (
    <SectionCard
      title="Stock History"
      action={<ViewAllLink to={ROUTES.movementsFor(product.id)} label="View all" />}
    >
      <SummaryTable
        columns={buildColumns(product.unit)}
        rows={rows}
        rowKey={(row) => row.movement.id}
        minWidthClassName="min-w-[52rem]"
        hoverable
        emptyMessage="No stock changes yet."
      />
    </SectionCard>
  )
}
