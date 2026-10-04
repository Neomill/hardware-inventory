import { UserPlus } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { SearchInput } from '@/components/common/SearchInput'
import { cn } from '@/lib/utils'

type CustomerListToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  includeSettled: boolean
  onIncludeSettledChange: (value: boolean) => void
  onAddCustomer: () => void
}

export function CustomerListToolbar({
  search,
  onSearchChange,
  includeSettled,
  onIncludeSettledChange,
  onAddCustomer,
}: CustomerListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        label="Search customers"
        placeholder="Search by customer name or phone..."
        className="flex-1"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={includeSettled}
          onClick={() => onIncludeSettledChange(!includeSettled)}
          className="inline-flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-50"
        >
          <span
            aria-hidden
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              includeSettled ? 'bg-navy-800' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                includeSettled ? 'left-[1.375rem]' : 'left-0.5',
              )}
            />
          </span>
          Show settled customers
        </button>

        <Button icon={UserPlus} variant="primary" onClick={onAddCustomer}>
          Add Customer
        </Button>
      </div>
    </div>
  )
}
