import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

type PaginationProps = {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

const WINDOW_SIZE = 3

/**
 * Page numbers around the current page, then an ellipsis and the last page.
 * Returns nulls where a gap is elided.
 */
function buildPages(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= WINDOW_SIZE + 2) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const start = Math.max(1, Math.min(page - 1, pageCount - WINDOW_SIZE))
  const window = Array.from({ length: WINDOW_SIZE }, (_, index) => start + index)
  const pages: (number | null)[] = [...window]

  if (window[window.length - 1] < pageCount - 1) {
    pages.push(null)
  }

  if (window[window.length - 1] < pageCount) {
    pages.push(pageCount)
  }

  return pages
}

const STEP_STYLES =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-700 transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40'

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) {
    return null
  }

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={STEP_STYLES}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      {buildPages(page, pageCount).map((value, index) =>
        value === null ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-muted" aria-hidden>
            &hellip;
          </span>
        ) : (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
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
