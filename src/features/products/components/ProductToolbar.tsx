import type { Ref } from 'react'
import { Download, Plus, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { SearchInput } from '@/components/common/SearchInput'
import { ROUTES } from '@/app/routes'

type ProductToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  filtersVisible: boolean
  onToggleFilters: () => void
  onExport: () => void
  exportDisabled: boolean
  /** The search input, so the page can focus it on arrival. */
  searchRef?: Ref<HTMLInputElement>
}

export function ProductToolbar({
  search,
  onSearchChange,
  filtersVisible,
  onToggleFilters,
  onExport,
  exportDisabled,
  searchRef,
}: ProductToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <SearchInput
        ref={searchRef}
        value={search}
        onChange={onSearchChange}
        label="Search products"
        // No barcode: the store does not label products (DESIGN-ERRATA E8).
        placeholder="Search by product name or SKU..."
        className="min-w-0 flex-1"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button icon={SlidersHorizontal} onClick={onToggleFilters} expanded={filtersVisible}>
          Filters
        </Button>

        <Button icon={Download} onClick={onExport} disabled={exportDisabled}>
          Export
        </Button>

        <Button icon={Plus} variant="primary" to={ROUTES.newProduct}>
          Add Product
        </Button>
      </div>
    </div>
  )
}
