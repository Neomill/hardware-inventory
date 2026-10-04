import { ChevronLeft, ChevronRight } from 'lucide-react'

import { pageItems } from '@/lib/pagination'
import { cn } from '@/lib/utils'

type PaginationProps = {
  page: number
  pageCount: number
  onChange: (page: number) => void
  /** Names the landmark when a screen has more than one paged list. */
  label?: string
}

const STEP_STYLES =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-700 transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40'

/**
 * Previous / next plus page numbers. Page 1 and the last page are always
 * offered, with an ellipsis wherever pages are skipped (see `pageItems`).
 */
export function Pagination({ page, pageCount, onChange, label = 'Pagination' }: PaginationProps) {
  if (pageCount <= 1) {
    return null
  }

  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={STEP_STYLES}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      {pageItems(page, pageCount).map((value, index) =>
        value === null ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-muted" aria-hidden>
            &hellip;
          </span>
        ) : (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-label={`Page ${value}`}
            aria-current={value === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-lg px-2 text-sm font-semibold transition-colors',
              value === page
                ? 'bg-navy-900 text-white'
                : 'border border-slate-200 text-navy-700 hover:bg-navy-50',
            )}
          >
            {value}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className={STEP_STYLES}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  )
}
