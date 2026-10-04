import { useMemo, useState } from 'react'

import { filterMovements, summarizeMovements } from '@/domain/inventory'
import type { StockMovement } from '@/domain/types'
import {
  ALL,
  DEFAULT_MOVEMENT_FILTERS,
  isMovementLogFiltered,
  toMovementFilter,
  type MovementLogFilters,
} from '@/features/inventory/lib/movementQuery'
import { paginate } from '@/features/inventory/lib/pagination'

export const MOVEMENT_PAGE_SIZE = 15

/**
 * Filter and page the movement log. A product chosen from a link widens the
 * date range to all time, because a product's history is what was asked for.
 */
export function useMovementLog(movements: StockMovement[], initialProductId: string | null) {
  const [filters, setFilters] = useState<MovementLogFilters>(() =>
    initialProductId
      ? { ...DEFAULT_MOVEMENT_FILTERS, productId: initialProductId, datePreset: ALL }
      : DEFAULT_MOVEMENT_FILTERS,
  )
  const [page, setPage] = useState(1)

  const matches = useMemo(
    () => filterMovements(movements, toMovementFilter(filters, new Date())),
    [movements, filters],
  )
  const totals = useMemo(() => summarizeMovements(matches), [matches])
  const slice = paginate(matches, page, MOVEMENT_PAGE_SIZE)

  function updateFilter<K extends keyof MovementLogFilters>(key: K, value: MovementLogFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function resetFilters() {
    setFilters(DEFAULT_MOVEMENT_FILTERS)
    setPage(1)
  }

  return {
    filters,
    updateFilter,
    resetFilters,
    isFiltered: isMovementLogFiltered(filters),
    totals,
    matchCount: matches.length,
    ...slice,
    setPage,
  }
}
