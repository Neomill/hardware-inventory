import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import type { DailySales } from '@/domain/reports'
import { useElementWidth } from '@/features/reports/hooks/useElementWidth'
import { clampBarIndex, labelStride, nextBarIndex } from '@/features/reports/lib/chartNavigation'
import { formatShortDay, formatDayWithWeekday } from '@/features/reports/lib/reportFormat'
import { formatCompactCurrency, type ChartScale } from '@/features/reports/lib/reportViewModel'
import { formatCurrency, formatNumber } from '@/lib/format'

/** Drawn at the container's real pixel width, so axis text stays 12px on a phone. */
const FALLBACK_WIDTH = 720
const HEIGHT = 260
const MARGIN = { top: 12, right: 8, bottom: 32, left: 56 }
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const MAX_BAR_WIDTH = 48
/** Room one "May 21" axis label needs, so labels thin out instead of shrinking. */
const LABEL_SPACING = 60
const CORNER = 4
const FOCUS_MIN_WIDTH = 10

const BAR_COLOR = '#2A5387' // navy-500
const BAR_ACTIVE_COLOR = '#0E2A4D' // navy-800
const FOCUS_RING_COLOR = '#0E2A4D'

/** A bar whose top corners are rounded and whose base sits square on the axis. */
function barPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(CORNER, width / 2, height)

  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ')
}

type DailySalesChartProps = {
  days: DailySales[]
  scale: ChartScale
  rangeLabel: string
}

/**
 * Total sales per day. The bars are one tab stop: Left/Right move between
 * days and Home/End jump to the ends (roving tabindex), with a ring around
 * the focused day. The readout above the plot repeats the hovered or focused
 * day in words, so the chart never relies on reading bar heights or colour.
 * The table below it has every value.
 */
export function DailySalesChart({ days, scale, rangeLabel }: DailySalesChartProps) {
  const titleId = useId()
  const descId = useId()
  const { ref: frameRef, width } = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH)
  const barRefs = useRef<(SVGGElement | null)[]>([])
  const [rovingIndex, setRovingIndex] = useState(0)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)

  const tabStop = clampBarIndex(rovingIndex, days.length)

  // A new range can have fewer days; keep the tab stop on a bar that exists.
  useEffect(() => {
    setRovingIndex((current) => clampBarIndex(current, days.length))
  }, [days.length])

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const band = plotWidth / Math.max(days.length, 1)
  // Very long ranges get touching bars rather than overlapping ones.
  const barWidth = band >= 4 ? Math.min(MAX_BAR_WIDTH, Math.max(band * 0.6, 2)) : band
  const labelEvery = labelStride(days.length, plotWidth, LABEL_SPACING)
  const y = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / scale.max) * PLOT_HEIGHT

  const busiest = days.reduce<DailySales | null>(
    (best, day) => (best === null || day.totalSales > best.totalSales ? day : best),
    null,
  )
  const activeIndex = hoverIndex ?? focusIndex
  const active = activeIndex === null ? null : (days[activeIndex] ?? null)

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const next = nextBarIndex(event.key, tabStop, days.length)

    if (next === null) {
      return
    }

    event.preventDefault()
    setRovingIndex(next)
    barRefs.current[next]?.focus()
  }

  let focusBox: { x: number; width: number } | null = null

  if (focusIndex !== null && focusIndex < days.length) {
    const boxWidth = Math.max(band, FOCUS_MIN_WIDTH)
    const centre = MARGIN.left + band * focusIndex + band / 2
    const x = Math.min(
      Math.max(centre - boxWidth / 2, MARGIN.left - 2),
      width - MARGIN.right - boxWidth + 2,
    )

    focusBox = { x, width: boxWidth }
  }

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <p className="min-h-10 text-sm text-muted sm:min-h-5" aria-live="polite">
        {active ? (
          <>
            <span className="font-semibold text-navy-900">{formatDayWithWeekday(active.date)}</span>
            {': '}
            <span className="font-semibold text-navy-900">{formatCurrency(active.totalSales)}</span>
            {' from '}
            {formatNumber(active.transactionCount)}{' '}
            {active.transactionCount === 1 ? 'transaction' : 'transactions'}
          </>
        ) : (
          'Hover or tap a bar to see that day, or Tab to the chart and use the arrow keys.'
        )}
      </p>

      <div ref={frameRef} className="w-full min-w-0">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block max-w-full"
          role="group"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onMouseLeave={() => setHoverIndex(null)}
          onKeyDown={handleKeyDown}
        >
          <title id={titleId}>Total sales per day, {rangeLabel}</title>
          <desc id={descId}>
            {days.length} {days.length === 1 ? 'day' : 'days'}.
            {busiest && busiest.totalSales > 0
              ? ` Highest: ${formatShortDay(busiest.date)} at ${formatCurrency(busiest.totalSales)}.`
              : ' No sales in this period.'}
            {days.length > 1 ? ' Use the left and right arrow keys to move between days.' : ''}
          </desc>

          <g aria-hidden>
            {scale.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={tick === 0 ? '#CBD5E1' : '#EEF2F6'}
                  strokeWidth={1}
                />
                <text
                  x={MARGIN.left - 8}
                  y={y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-slate-500 text-xs tabular-nums"
                >
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            ))}

            {days.map((day, index) =>
              index % labelEvery === 0 ? (
                <text
                  key={day.day}
                  x={MARGIN.left + band * index + band / 2}
                  y={HEIGHT - MARGIN.bottom + 20}
                  textAnchor="middle"
                  className="fill-slate-500 text-xs"
                >
                  {formatShortDay(day.date)}
                </text>
              ) : null,
            )}
          </g>

          {days.map((day, index) => {
            const x = MARGIN.left + band * index + (band - barWidth) / 2
            const top = y(day.totalSales)
            const height = MARGIN.top + PLOT_HEIGHT - top
            const isActive = index === activeIndex

            return (
              <g
                key={day.day}
                ref={(element) => {
                  barRefs.current[index] = element
                }}
                role="img"
                tabIndex={index === tabStop ? 0 : -1}
                aria-label={`${formatDayWithWeekday(day.date)}: ${formatCurrency(day.totalSales)}, ${formatNumber(day.transactionCount)} ${day.transactionCount === 1 ? 'transaction' : 'transactions'}`}
                onMouseEnter={() => setHoverIndex(index)}
                onFocus={() => {
                  setRovingIndex(index)
                  setFocusIndex(index)
                }}
                onBlur={() => setFocusIndex(null)}
                onClick={() => setRovingIndex(index)}
                className="cursor-pointer outline-none"
              >
                {/* Full-height hit target, wider than the bar, so a thin or zero bar is still easy to tap. */}
                <rect
                  x={MARGIN.left + band * index}
                  y={MARGIN.top}
                  width={band}
                  height={PLOT_HEIGHT}
                  fill={isActive ? '#E2EAF4' : 'transparent'}
                />
                {height > 0 ? (
                  <path
                    d={barPath(x, top, barWidth, height)}
                    fill={isActive ? BAR_ACTIVE_COLOR : BAR_COLOR}
                  />
                ) : null}
              </g>
            )
          })}

          {/* The focus ring, drawn last so it sits above the neighbouring bars. */}
          {focusBox ? (
            <rect
              aria-hidden
              data-testid="chart-focus-ring"
              x={focusBox.x}
              y={MARGIN.top - 2}
              width={focusBox.width}
              height={PLOT_HEIGHT + 4}
              rx={4}
              fill="none"
              stroke={FOCUS_RING_COLOR}
              strokeWidth={2.5}
              pointerEvents="none"
            />
          ) : null}
        </svg>
      </div>

      <figcaption className="sr-only">
        Bar chart of total sales per day. The table below lists the same figures.
      </figcaption>
    </figure>
  )
}
