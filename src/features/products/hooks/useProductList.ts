import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { STOCK_QUERY_PARAM } from '@/app/routes'
import {
  ALL,
  EMPTY_FILTERS,
  distinctValues,
  filterProducts,
  isFiltered,
  parseStockFilter,
  summarise,
} from '@/features/products/lib/productQuery'
import { usePagedList } from '@/hooks/usePagedList'
import type { Product } from '@/domain/types'
import type { ProductFilters, StockFilterValue } from '@/features/products/types'

export const PAGE_SIZE_OPTIONS = [10, 25, 50]

type LocalFilters = Omit<ProductFilters, 'stockStatus'>

const EMPTY_LOCAL_FILTERS: LocalFilters = {
  search: EMPTY_FILTERS.search,
  category: EMPTY_FILTERS.category,
  unit: EMPTY_FILTERS.unit,
}

/**
 * Search, filter and paginate the catalogue. Kept out of the components so the
 * page stays presentational and the rules stay testable.
 *
 * The stock filter lives in the URL (`?stock=`), so a link such as the
 * dashboard's "View all" opens the list already filtered, and changing the
 * dropdown keeps the address shareable. The other filters are local state.
 */
export function useProductList(products: Product[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [localFilters, setLocalFilters] = useState<LocalFilters>(EMPTY_LOCAL_FILTERS)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0])

  const stockStatus = parseStockFilter(searchParams.get(STOCK_QUERY_PARAM))
  const filters = useMemo<ProductFilters>(
    () => ({ ...localFilters, stockStatus }),
    [localFilters, stockStatus],
  )

  const matches = useMemo(() => filterProducts(products, filters), [products, filters])
  const summary = useMemo(() => summarise(products), [products])
  const categories = useMemo(() => distinctValues(products, 'category'), [products])
  const units = useMemo(() => distinctValues(products, 'unit'), [products])
  const paged = usePagedList(matches, pageSize)

  function setStockFilter(value: StockFilterValue) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)

        if (value === ALL) {
          next.delete(STOCK_QUERY_PARAM)
        } else {
          next.set(STOCK_QUERY_PARAM, value)
        }

        return next
      },
      // Refining a filter is not a new page; Back should leave the list.
      { replace: true },
    )
  }

  /** Any filter change returns to page one, so results are never off-screen. */
  function updateFilter(key: keyof ProductFilters, value: string) {
    if (key === 'stockStatus') {
      setStockFilter(parseStockFilter(value))
    } else {
      setLocalFilters((current) => ({ ...current, [key]: value }))
    }

    paged.resetPage()
  }

  function clearFilters() {
    setLocalFilters(EMPTY_LOCAL_FILTERS)
    setStockFilter(ALL)
    paged.resetPage()
  }

  function changePageSize(next: number) {
    setPageSize(next)
    paged.resetPage()
  }

  return {
    filters,
    updateFilter,
    clearFilters,
    hasFilters: isFiltered(filters),
    categories,
    units,
    summary,
    rows: paged.rows,
    matchCount: matches.length,
    matches,
    page: paged.page,
    pageCount: paged.pageCount,
    pageSize,
    setPage: paged.setPage,
    changePageSize,
    rangeLabel: paged.rangeLabel,
  }
}
