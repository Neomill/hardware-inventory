import { describe, expect, it } from 'vitest'

import { clampBarIndex, labelStride, nextBarIndex } from '@/features/reports/lib/chartNavigation'

describe('nextBarIndex', () => {
  it('steps left and right by one bar', () => {
    expect(nextBarIndex('ArrowRight', 3, 10)).toBe(4)
    expect(nextBarIndex('ArrowLeft', 3, 10)).toBe(2)
  })

  it('stops at the ends instead of wrapping', () => {
    expect(nextBarIndex('ArrowLeft', 0, 10)).toBe(0)
    expect(nextBarIndex('ArrowRight', 9, 10)).toBe(9)
  })

  it('jumps to the first and last bar with Home and End', () => {
    expect(nextBarIndex('Home', 5, 10)).toBe(0)
    expect(nextBarIndex('End', 5, 10)).toBe(9)
  })

  it('ignores other keys so Tab and the rest keep their default', () => {
    expect(nextBarIndex('Tab', 2, 10)).toBeNull()
    expect(nextBarIndex('ArrowUp', 2, 10)).toBeNull()
    expect(nextBarIndex('Enter', 2, 10)).toBeNull()
  })

  it('handles an empty chart and an out-of-range start', () => {
    expect(nextBarIndex('ArrowRight', 0, 0)).toBeNull()
    expect(nextBarIndex('ArrowRight', 40, 7)).toBe(6)
    expect(nextBarIndex('ArrowLeft', -3, 7)).toBe(0)
  })
})

describe('clampBarIndex', () => {
  it('keeps the index inside the bars', () => {
    expect(clampBarIndex(30, 7)).toBe(6)
    expect(clampBarIndex(-1, 7)).toBe(0)
    expect(clampBarIndex(3, 7)).toBe(3)
    expect(clampBarIndex(3, 0)).toBe(0)
  })
})

describe('labelStride', () => {
  it('labels every bar when they fit', () => {
    expect(labelStride(7, 640, 56)).toBe(1)
  })

  it('thins labels on a narrow chart', () => {
    // 300px fits 5 labels of 56px, so 31 days need every 7th.
    expect(labelStride(31, 300, 56)).toBe(7)
    expect(labelStride(366, 300, 56)).toBe(74)
  })

  it('never returns less than 1', () => {
    expect(labelStride(0, 300, 56)).toBe(1)
    expect(labelStride(10, 0, 56)).toBe(1)
    expect(labelStride(10, 20, 56)).toBe(10)
  })
})
