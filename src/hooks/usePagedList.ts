import { useCallback, useMemo, useState } from 'react'

import { paginate, type PageSlice } from '@/lib/pagination'

export type PagedList<T> = PageSlice<T> & {
  setPage: (page: number) => void
  /** Back to page one, e.g. after a filter or search changes. */
  resetPage: () => void
}

/**
 * Pages an already filtered list. The page is clamped on every render, so a
 * list that shrinks under the current page lands on its last page instead of
 * an empty one.
 */
export function usePagedList<T>(items: readonly T[], pageSize: number): PagedList<T> {
  const [page, setPage] = useState(1)
  const slice = useMemo(() => paginate(items, page, pageSize), [items, page, pageSize])
  const resetPage = useCallback(() => setPage(1), [])

  return { ...slice, setPage, resetPage }
}
