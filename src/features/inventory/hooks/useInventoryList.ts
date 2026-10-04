import { useMemo, useState } from 'react'

import {
  EMPTY_INVENTORY_FILTERS,
  distinctCategories,
  filterInventory,
  isInventoryFiltered,
  summarizeInventory,
  type InventoryFilters,
} from '@/features/inventory/lib/inventoryQuery'
import { paginate } from '@/features/inventory/lib/pagination'
import type { Product } from '@/domain/types'

export const INVENTORY_PAGE_SIZE = 15

/** Search, filter and page the stock list; the view stays presentational. */
export function useInventoryList(products: Product[]) {
  const [filters, setFilters] = useState<InventoryFilters>(EMPTY_INVENTORY_FILTERS)
  const [page, setPage] = useState(1)

  const matches = useMemo(() => filterInventory(products, filters), [products, filters])
  const summary = useMemo(() => summarizeInventory(products), [products])
  const categories = useMemo(() => distinctCategories(products), [products])
  const slice = paginate(matches, page, INVENTORY_PAGE_SIZE)

  /** Any filter change returns to page one, so results are never off-screen. */
  function updateFilter<K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(EMPTY_INVENTORY_FILTERS)
    setPage(1)
  }

  return {
    filters,
    updateFilter,
    clearFilters,
    hasFilters: isInventoryFiltered(filters),
    categories,
    summary,
    ...slice,
    setPage,
  }
}
