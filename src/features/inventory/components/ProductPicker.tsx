import { useState } from 'react'
import { Check } from 'lucide-react'

import { SearchInput } from '@/components/common/SearchInput'
import { StatusPill } from '@/components/common/StatusPill'
import { searchProducts } from '@/features/inventory/lib/inventoryQuery'
import { STOCK_STATUS_TONES } from '@/components/common/statusTones'
import { deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'

const RESULT_LIMIT = 8

type ProductPickerProps = {
  products: Product[]
  selected: Product | null
  onSelect: (productId: string) => void
  /** FormField wiring, so the field label and error belong to the search box. */
  id?: string
  describedBy?: string
  invalid?: boolean
  /** Receives the search box, so the form can focus it on a validation error. */
  inputRef?: (element: HTMLInputElement | null) => void
}

function StockPill({ product }: { product: Product }) {
  const status = deriveStockStatus(product.stock, product.reorderLevel)

  return (
    <StatusPill tone={STOCK_STATUS_TONES[status]}>
      {formatNumber(product.stock)} {product.unit}
    </StatusPill>
  )
}

/** Search by name or SKU, tap a result. A short list beats a 40-item dropdown. */
export function ProductPicker({
  products,
  selected,
  onSelect,
  id,
  describedBy,
  invalid = false,
  inputRef,
}: ProductPickerProps) {
  const [search, setSearch] = useState('')
  const [isChanging, setChanging] = useState(false)

  if (selected && !isChanging) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{selected.name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            {selected.sku}
            <span aria-hidden>&middot;</span>
            On hand <StockPill product={selected} />
          </p>
        </div>
        <button
          id={id}
          type="button"
          aria-label={`Change product. Selected: ${selected.name}`}
          aria-describedby={describedBy}
          onClick={() => setChanging(true)}
          className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy-800 transition-colors hover:bg-slate-50"
        >
          Change
        </button>
      </div>
    )
  }

  const results = searchProducts(products, search, RESULT_LIMIT)

  return (
    <div className="flex flex-col gap-2">
      <SearchInput
        ref={inputRef}
        id={id}
        value={search}
        onChange={setSearch}
        label="Search for the delivered product"
        placeholder="Search by product name or SKU..."
        aria-describedby={describedBy}
        invalid={invalid}
      />

      <ul
        aria-label="Matching products"
        className={cn(
          'flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl border',
          invalid ? 'border-rose-400' : 'border-slate-200',
        )}
      >
        {results.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted">
            No product matches &ldquo;{search.trim()}&rdquo;.
          </li>
        ) : (
          results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(product.id)
                  setChanging(false)
                  setSearch('')
                }}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-navy-900">
                    {product.name}
                  </span>
                  <span className="block text-xs text-muted">{product.sku}</span>
                </span>
                <StockPill product={product} />
                {selected?.id === product.id ? (
                  <Check className="h-5 w-5 text-emerald-600" aria-label="Selected" />
                ) : null}
              </button>
            </li>
          ))
        )}
      </ul>

      {products.length > RESULT_LIMIT && results.length === RESULT_LIMIT ? (
        <p className="text-xs text-muted">
          Showing the first {RESULT_LIMIT}. Type more of the name or SKU to narrow it down.
        </p>
      ) : null}
    </div>
  )
}
