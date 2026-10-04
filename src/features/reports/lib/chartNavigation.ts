/**
 * Keyboard and layout rules for the reports bar charts. Pure, so the chart
 * component only wires them to events and the logic is unit tested.
 */

/**
 * The bar a key moves to in a roving-tabindex chart, or `null` when the key
 * is not a chart navigation key (so the browser keeps its default).
 * Left/Right step one bar and stop at the ends; Home/End jump to the ends.
 */
export function nextBarIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) {
    return null
  }

  const last = count - 1
  const from = Math.min(Math.max(0, current), last)

  switch (key) {
    case 'ArrowLeft':
      return Math.max(0, from - 1)
    case 'ArrowRight':
      return Math.min(last, from + 1)
    case 'Home':
      return 0
    case 'End':
      return last
    default:
      return null
  }
}

/** Keeps the chart's single tab stop on a bar that exists after the data changes. */
export function clampBarIndex(index: number, count: number): number {
  if (count <= 0) {
    return 0
  }

  return Math.min(Math.max(0, Math.floor(index) || 0), count - 1)
}

/**
 * Show every n-th x-axis label so labels never crowd: each needs about
 * `minSpacing` pixels. Always at least 1.
 */
export function labelStride(count: number, plotWidth: number, minSpacing: number): number {
  if (count <= 0 || plotWidth <= 0 || minSpacing <= 0) {
    return 1
  }

  const fits = Math.max(1, Math.floor(plotWidth / minSpacing))

  return Math.max(1, Math.ceil(count / fits))
}
