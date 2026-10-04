import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type SummaryColumn<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  cellClassName?: string
}

type SummaryTableProps<T> = {
  columns: SummaryColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyMessage: string
  /** Widen for tables with more columns than a dashboard widget carries. */
  minWidthClassName?: string
  hoverable?: boolean
}

/**
 * Display-only table. Filtering and pagination belong to the caller, so the
 * same component serves a three-row dashboard widget and a paged product list.
 * Wide content scrolls inside the card rather than the page.
 */
export function SummaryTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
  minWidthClassName = 'min-w-[34rem]',
  hoverable = false,
}: SummaryTableProps<T>) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">{emptyMessage}</p>
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className={cn('w-full border-collapse text-left text-sm', minWidthClassName)}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className="whitespace-nowrap pb-3 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                'border-t border-slate-100',
                hoverable && 'transition-colors hover:bg-slate-50/70',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn('whitespace-nowrap py-3 pr-4 text-navy-900', column.cellClassName)}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
