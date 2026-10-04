import { useMemo, useState } from 'react'

import {
  ALL,
  EMPTY_FILTERS,
  distinctValues,
  filterProducts,
  isFiltered,
  rangeLabel,
  summarise,
} from '@/features/products/lib/productQuery'
import type { Product } from '@/domain/types'
import type { ProductFilters } from '@/features/products/types'

export const PAGE_SIZE_OPTIONS = [10, 25, 50]

/**
 * Search, filter and paginate the catalogue. Kept out of the components so the
 * page stays presentational and the rules stay testable.
 */
export function useProductList(products: Product[]) {
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0])
  const [page, setPage] = useState(1)

  const matches = useMemo(() => filterProducts(products, filters), [products, filters])
  const summary = useMemo(() => summarise(products), [products])
  const categories = useMemo(() => distinctValues(products, 'category'), [products])
  const units = useMemo(() => distinctValues(products, 'unit'), [products])

  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize))
  // A filter can shrink the list under the current page; clamp instead of
  // showing an empty table.
  const currentPage = Math.min(page, pageCount)
  const rows = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  /** Any filter change returns to page one, so results are never off-screen. */
  function updateFilter(key: keyof ProductFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  function changePageSize(next: number) {
    setPageSize(next)
    setPage(1)
  }

  return {
    filters,
    updateFilter,
    clearFilters,
    hasFilters: isFiltered(filters),
    categories,
    units,
    summary,
    rows,
    matchCount: matches.length,
    matches,
    page: currentPage,
    pageCount,
    pageSize,
    setPage,
    changePageSize,
    rangeLabel: rangeLabel(currentPage, pageSize, matches.length),
    allOption: ALL,
  }
}
