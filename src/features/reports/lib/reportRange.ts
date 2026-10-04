import { ROUTES } from '@/app/routes'
import {
  dayRange,
  fromDayKey,
  lastNDays,
  startOfDay,
  toDayKey,
  type DateRange,
  type DayKey,
} from '@/domain/dates'
import { formatShortDate } from '@/features/reports/lib/reportFormat'

/**
 * The Reports date range lives in the URL (?range=7d, or ?range=custom&from=&to=)
 * so a link from another screen -- the Sales root's "View Report" -- can open
 * the page on exactly the period it was talking about, and a refresh keeps it.
 */

export type RangePreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
]

/** Today, because every link into Reports from the Sales root talks about today. */
export const DEFAULT_PRESET: RangePreset = 'today'

/** A custom range longer than this is cut at its start, so a typo cannot draw 10,000 bars. */
export const MAX_CUSTOM_DAYS = 366

export const REPORT_SECTIONS = [
  { id: 'daily-sales', label: 'Daily Sales' },
  { id: 'top-products', label: 'Top Products' },
  { id: 'payment-breakdown', label: 'Payments' },
  { id: 'outstanding-credit', label: 'Outstanding Credit' },
] as const

export type ReportSectionId = (typeof REPORT_SECTIONS)[number]['id']

export type ReportRangeSelection = {
  preset: RangePreset
  /** Only meaningful for 'custom'. */
  from?: DayKey
  to?: DayKey
}

export type ResolvedRange = {
  preset: RangePreset
  range: DateRange
  /** First and last day covered, both included. */
  from: DayKey
  to: DayKey
  dayCount: number
  /** "Today", "Last 7 days", or "May 1, 2025 - May 21, 2025" for a custom range. */
  label: string
  /** The same period inside a sentence: "today", "the last 7 days", "May 1, 2025 - ...". */
  phrase: string
}

const PRESET_PHRASES: Record<Exclude<RangePreset, 'custom'>, string> = {
  today: 'today',
  yesterday: 'yesterday',
  '7d': 'the last 7 days',
  '30d': 'the last 30 days',
}

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** A real calendar day in "YYYY-MM-DD" form; rejects "2025-02-30". */
export function isValidDayKey(value: string | null | undefined): value is DayKey {
  if (!value || !DAY_KEY_PATTERN.test(value)) {
    return false
  }

  return toDayKey(fromDayKey(value)) === value
}

function isPreset(value: string | null): value is RangePreset {
  return RANGE_PRESETS.some((preset) => preset.value === value)
}

/** Calendar days from the day of `from` to the day of `to`, both included. */
function daysBetween(from: Date, to: Date): number {
  // Rounded so a daylight-saving shift cannot lose or add a day.
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000) + 1
}

function formatRangeLabel(from: Date, to: Date): string {
  if (toDayKey(from) === toDayKey(to)) {
    return formatShortDate(from)
  }

  return `${formatShortDate(from)} - ${formatShortDate(to)}`
}

/** Turns a selection into concrete local-day boundaries relative to `now`. */
export function resolveRange(selection: ReportRangeSelection, now: Date): ResolvedRange {
  const preset = isPreset(selection.preset) ? selection.preset : DEFAULT_PRESET
  let range: DateRange

  switch (preset) {
    case 'yesterday': {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      range = dayRange(yesterday, yesterday)
      break
    }
    case '7d':
      range = lastNDays(now, 7)
      break
    case '30d':
      range = lastNDays(now, 30)
      break
    case 'custom': {
      const from = isValidDayKey(selection.from) ? fromDayKey(selection.from) : now
      const to = isValidDayKey(selection.to) ? fromDayKey(selection.to) : now
      // Picking the end before the start still means the days in between.
      const [start, end] = from.getTime() <= to.getTime() ? [from, to] : [to, from]
      range = dayRange(start, end)

      if (daysBetween(range.from, range.to) > MAX_CUSTOM_DAYS) {
        range = lastNDays(end, MAX_CUSTOM_DAYS)
      }
      break
    }
    default:
      range = dayRange(now, now)
  }

  const presetLabel = RANGE_PRESETS.find((option) => option.value === preset)?.label ?? ''

  return {
    preset,
    range,
    from: toDayKey(range.from),
    to: toDayKey(range.to),
    dayCount: daysBetween(range.from, range.to),
    label: preset === 'custom' ? formatRangeLabel(range.from, range.to) : presetLabel,
    phrase: preset === 'custom' ? formatRangeLabel(range.from, range.to) : PRESET_PHRASES[preset],
  }
}

/** Reads ?range=&from=&to= leniently: anything unknown falls back to the default. */
export function parseRangeParams(params: URLSearchParams): ReportRangeSelection {
  const preset = params.get('range')

  if (!isPreset(preset)) {
    return { preset: DEFAULT_PRESET }
  }

  if (preset !== 'custom') {
    return { preset }
  }

  const from = params.get('from')
  const to = params.get('to')

  return {
    preset,
    from: isValidDayKey(from) ? from : undefined,
    to: isValidDayKey(to) ? to : undefined,
  }
}

/** Writes a selection onto a copy of `params`, keeping unrelated keys. */
export function writeRangeParams(
  params: URLSearchParams,
  selection: ReportRangeSelection,
): URLSearchParams {
  const next = new URLSearchParams(params)

  next.set('range', selection.preset)
  next.delete('from')
  next.delete('to')

  if (selection.preset === 'custom') {
    if (selection.from) next.set('from', selection.from)
    if (selection.to) next.set('to', selection.to)
  }

  return next
}

export function parseSectionParam(params: URLSearchParams): ReportSectionId | null {
  const section = params.get('section')

  return REPORT_SECTIONS.find((candidate) => candidate.id === section)?.id ?? null
}

export type TopProductsMetric = 'quantity' | 'revenue'

export function parseTopMetricParam(params: URLSearchParams): TopProductsMetric {
  return params.get('top') === 'revenue' ? 'revenue' : 'quantity'
}

/**
 * Deep link into Reports. The app uses a HashRouter, so a URL #anchor cannot
 * address a section; `section` is a query parameter the page scrolls to.
 */
export function reportsHref(
  options: { range?: ReportRangeSelection; section?: ReportSectionId } = {},
): string {
  let params = new URLSearchParams()

  if (options.range) {
    params = writeRangeParams(params, options.range)
  }

  if (options.section) {
    params.set('section', options.section)
  }

  const query = params.toString()

  return query ? `${ROUTES.reports}?${query}` : ROUTES.reports
}
