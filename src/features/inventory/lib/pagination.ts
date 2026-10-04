export type PageSlice<T> = {
  rows: T[]
  /** Clamped into range, so a filter that shrinks the list never shows an empty page. */
  page: number
  pageCount: number
  /** "1-15 of 42", or "0 of 0" when nothing matches. */
  rangeLabel: string
}

export function paginate<T>(items: T[], page: number, pageSize: number): PageSlice<T> {
  const size = Math.max(1, Math.floor(pageSize))
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, Math.floor(page)), pageCount)
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
