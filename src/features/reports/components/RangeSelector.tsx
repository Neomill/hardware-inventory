import { CalendarDays } from 'lucide-react'
import { useId } from 'react'

import { toDayKey } from '@/domain/dates'
import { SegmentedControl } from '@/features/reports/components/SegmentedControl'
import {
  RANGE_PRESETS,
  type RangePreset,
  type ReportRangeSelection,
  type ResolvedRange,
} from '@/features/reports/lib/reportRange'

type RangeSelectorProps = {
  resolved: ResolvedRange
  now: Date
  onChange: (selection: ReportRangeSelection) => void
}

/** Preset buttons, plus From/To day pickers when "Custom" is chosen. */
export function RangeSelector({ resolved, now, onChange }: RangeSelectorProps) {
  const fromId = useId()
  const toId = useId()
  const today = toDayKey(now)

  function handlePreset(preset: RangePreset) {
    // Custom starts from whatever was on screen, so the figures don't jump.
    onChange(preset === 'custom' ? { preset, from: resolved.from, to: resolved.to } : { preset })
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        label="Report period"
        value={resolved.preset}
        options={RANGE_PRESETS}
        onChange={handlePreset}
      />

      {resolved.preset === 'custom' ? (
        <div className="flex flex-wrap items-end gap-3">
          <DayInput
            id={fromId}
            label="From"
            value={resolved.from}
            max={today}
            onChange={(from) => onChange({ preset: 'custom', from, to: resolved.to })}
          />
          <DayInput
            id={toId}
            label="To"
            value={resolved.to}
            max={today}
            onChange={(to) => onChange({ preset: 'custom', from: resolved.from, to })}
          />
        </div>
      ) : null}
    </div>
  )
}

type DayInputProps = {
  id: string
  label: string
  value: string
  max: string
  onChange: (value: string) => void
}

function DayInput({ id, label, value, max, onChange }: DayInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <CalendarDays
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id={id}
          type="date"
          value={value}
          max={max}
          // Clearing the field in some browsers sends "", which would mean no day at all.
          onChange={(event) => event.target.value && onChange(event.target.value)}
          className="h-12 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-navy-900 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
        />
      </div>
    </div>
  )
}
