import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

export type SelectOption = {
  value: string
  label: string
}

type SelectFieldProps = {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  className?: string
}

/** Boxed select with the label stacked above the value, as the design shows. */
export function SelectField({ label, value, options, onChange, className }: SelectFieldProps) {
  return (
    <label
      className={cn(
        'relative flex flex-col justify-center rounded-xl border border-slate-200 bg-white px-4 py-2',
        className,
      )}
    >
      <span className="text-xs text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none bg-transparent pr-6 text-sm font-medium text-navy-900 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 h-5 w-5 text-muted"
        aria-hidden
      />
    </label>
  )
}
