import { describe, expect, it } from 'vitest'

import { pageItems, paginate } from '@/lib/pagination'

const items = Array.from({ length: 42 }, (_, index) => index + 1)

describe('paginate', () => {
  it('returns the first page with a range label', () => {
    const slice = paginate(items, 1, 15)

    expect(slice.rows).toEqual(items.slice(0, 15))
    expect(slice.page).toBe(1)
    expect(slice.pageCount).toBe(3)
    expect(slice.rangeLabel).toBe('1-15 of 42')
  })

  it('returns a short last page', () => {
    const slice = paginate(items, 3, 15)

    expect(slice.rows).toEqual([31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42])
    expect(slice.rangeLabel).toBe('31-42 of 42')
  })

  it('clamps a page past the end to the last page', () => {
    expect(paginate(items, 9, 15).page).toBe(3)
  })

  it('clamps a page below one, and a non-number, to the first page', () => {
    expect(paginate(items, 0, 15).page).toBe(1)
    expect(paginate(items, -4, 15).page).toBe(1)
    expect(paginate(items, Number.NaN, 15).page).toBe(1)
  })

  it('reports one empty page for an empty list', () => {
    expect(paginate([], 1, 15)).toEqual({ rows: [], page: 1, pageCount: 1, rangeLabel: '0 of 0' })
  })

  it('treats a page size below one as one', () => {
    expect(paginate(items, 2, 0).rows).toEqual([2])
  })
})

describe('pageItems', () => {
  it('lists every page when there are few', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(2, 3)).toEqual([1, 2, 3])
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('shows the start, a gap and the last page near the beginning', () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, null, 10])
    expect(pageItems(2, 10)).toEqual([1, 2, 3, 4, null, 10])
  })

  it('always offers page 1 with a leading gap in the middle', () => {
    expect(pageItems(6, 10)).toEqual([1, null, 5, 6, 7, null, 10])
  })

  it('always offers page 1 with a leading gap near the end', () => {
    expect(pageItems(10, 10)).toEqual([1, null, 7, 8, 9, 10])
    expect(pageItems(9, 10)).toEqual([1, null, 7, 8, 9, 10])
  })

  it('shows a lone skipped page instead of a gap', () => {
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(pageItems(4, 8)).toEqual([1, 2, 3, 4, 5, null, 8])
  })

  it('clamps an out-of-range current page', () => {
    expect(pageItems(99, 10)).toEqual(pageItems(10, 10))
    expect(pageItems(0, 10)).toEqual(pageItems(1, 10))
  })

  it('returns nothing for zero pages', () => {
    expect(pageItems(1, 0)).toEqual([])
  })

  it('never repeats a page and always includes first and last', () => {
    for (let count = 1; count <= 30; count += 1) {
      for (let page = 1; page <= count; page += 1) {
        const numbers = pageItems(page, count).filter((value): value is number => value !== null)

        expect(new Set(numbers).size).toBe(numbers.length)
        expect(numbers[0]).toBe(1)
        expect(numbers[numbers.length - 1]).toBe(count)
        expect(numbers).toContain(page)
        expect([...numbers].sort((a, b) => a - b)).toEqual(numbers)
      }
    }
  })
})
