import { useId, useState } from 'react'

import type { DailySales } from '@/domain/reports'
import { formatShortDay, formatDayWithWeekday } from '@/features/reports/lib/reportFormat'
import { formatCompactCurrency, type ChartScale } from '@/features/reports/lib/reportViewModel'
import { formatCurrency, formatNumber } from '@/lib/format'

const WIDTH = 720
const HEIGHT = 260
const MARGIN = { top: 12, right: 8, bottom: 32, left: 60 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const MAX_BAR_WIDTH = 48
const MAX_X_LABELS = 10
const CORNER = 4

const BAR_COLOR = '#2A5387' // navy-500
const BAR_ACTIVE_COLOR = '#0E2A4D' // navy-800

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
 * Total sales per day. Each bar is focusable and named, and the readout above
 * the plot repeats the hovered or focused day in words, so the chart never
 * relies on reading bar heights or colour. The table below it has every value.
 */
export function DailySalesChart({ days, scale, rangeLabel }: DailySalesChartProps) {
  const titleId = useId()
  const descId = useId()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const band = PLOT_WIDTH / Math.max(days.length, 1)
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(band * 0.6, 2))
  const labelEvery = Math.ceil(days.length / MAX_X_LABELS)
  const y = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / scale.max) * PLOT_HEIGHT

  const busiest = days.reduce<DailySales | null>(
    (best, day) => (best === null || day.totalSales > best.totalSales ? day : best),
    null,
  )
  const active = activeIndex === null ? null : days[activeIndex]

  return (
    <figure className="flex flex-col gap-3">
      <p className="min-h-5 text-sm text-muted" aria-live="polite">
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
          'Hover or tap a bar to see that day.'
        )}
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="group"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <title id={titleId}>Total sales per day, {rangeLabel}</title>
        <desc id={descId}>
          {days.length} {days.length === 1 ? 'day' : 'days'}.
          {busiest && busiest.totalSales > 0
            ? ` Highest: ${formatShortDay(busiest.date)} at ${formatCurrency(busiest.totalSales)}.`
            : ' No sales in this period.'}
        </desc>

        <g aria-hidden>
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
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
                className="fill-slate-500 text-[11px] tabular-nums"
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
                y={HEIGHT - MARGIN.bottom + 18}
                textAnchor="middle"
                className="fill-slate-500 text-[11px]"
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
              role="img"
              tabIndex={0}
              aria-label={`${formatDayWithWeekday(day.date)}: ${formatCurrency(day.totalSales)}, ${formatNumber(day.transactionCount)} transactions`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => setActiveIndex(index)}
              className="cursor-pointer focus:outline-none"
            >
              {/* Full-height hit target, wider than the bar, so a thin or zero bar is still easy to tap. */}
              <rect
                x={MARGIN.left + band * index}
                y={MARGIN.top}
                width={band}
                height={PLOT_HEIGHT}
                fill={isActive ? '#EEF3F9' : 'transparent'}
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
      </svg>

      <figcaption className="sr-only">
        Bar chart of total sales per day. The table below lists the same figures.
      </figcaption>
    </figure>
  )
}
