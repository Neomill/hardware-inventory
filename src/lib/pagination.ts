/**
 * Client-side paging shared by every list screen. Pure, so the ranges are
 * tested once here instead of per feature.
 */

export type PageSlice<T> = {
  /** The items on the current page. */
  rows: T[]
  /** Clamped into range, so a filter that shrinks the list never shows an empty page. */
  page: number
  /** Always at least 1, even for an empty list. */
  pageCount: number
  /** "1-15 of 42", or "0 of 0" when nothing matches. */
  rangeLabel: string
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): PageSlice<T> {
  const size = Math.max(1, Math.floor(pageSize) || 1)
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const requested = Number.isFinite(page) ? Math.floor(page) : 1
  const current = Math.min(Math.max(1, requested), pageCount)
  const start = (current - 1) * size
  const rows = items.slice(start, start + size)

  return {
    rows,
    page: current,
    pageCount,
    rangeLabel:
      items.length === 0 ? '0 of 0' : `${start + 1}-${start + rows.length} of ${items.length}`,
  }
}

/** A page number to render, or `null` where a run of pages is elided. */
export type PageItem = number | null

/** Pages either side of the current one. */
const SIBLINGS = 1

/**
 * The page buttons to show: always page 1 and the last page, the current page
 * with its neighbours, and a gap (`null`) wherever pages are skipped. A gap
 * that would hide a single page shows that page instead.
 *
 *   pageItems(1, 10)  -> [1, 2, 3, 4, null, 10]
 *   pageItems(6, 10)  -> [1, null, 5, 6, 7, null, 10]
 *   pageItems(10, 10) -> [1, null, 7, 8, 9, 10]
 */
export function pageItems(page: number, pageCount: number): PageItem[] {
  const count = Math.max(0, Math.floor(pageCount))

  if (count === 0) {
    return []
  }

  const current = Math.min(Math.max(1, Math.floor(page) || 1), count)
  // Keep the window three wide at the ends so the bar does not shrink.
  const windowStart = Math.max(2, Math.min(current - SIBLINGS, count - 1 - 2 * SIBLINGS))
  const windowEnd = Math.min(count - 1, Math.max(current + SIBLINGS, 2 + 2 * SIBLINGS))

  const items: PageItem[] = [1]

  if (windowStart === 3) {
    items.push(2)
  } else if (windowStart > 3) {
    items.push(null)
  }

  for (let value = windowStart; value <= windowEnd; value += 1) {
    items.push(value)
  }

  if (windowEnd === count - 2) {
    items.push(count - 1)
  } else if (windowEnd < count - 2) {
    items.push(null)
  }

  if (count > 1) {
    items.push(count)
  }

  return items
}
