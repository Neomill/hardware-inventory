import { describe, expect, it } from 'vitest'

import { paginate } from '@/features/inventory/lib/pagination'

const ITEMS = Array.from({ length: 42 }, (_, index) => index + 1)

describe('paginate', () => {
  it('slices a page and labels the range', () => {
    const slice = paginate(ITEMS, 2, 15)

    expect(slice.rows[0]).toBe(16)
    expect(slice.rows).toHaveLength(15)
    expect(slice.pageCount).toBe(3)
    expect(slice.rangeLabel).toBe('16-30 of 42')
  })

  it('labels a short last page by what it holds', () => {
    expect(paginate(ITEMS, 3, 15).rangeLabel).toBe('31-42 of 42')
  })

  it('clamps a page that a filter has pushed out of range', () => {
    const slice = paginate(ITEMS.slice(0, 5), 4, 15)

    expect(slice.page).toBe(1)
    expect(slice.rows).toEqual([1, 2, 3, 4, 5])
  })

  it('reports one empty page when nothing matches', () => {
    expect(paginate([], 1, 15)).toEqual({ rows: [], page: 1, pageCount: 1, rangeLabel: '0 of 0' })
  })
})
