import { cn } from '@/lib/utils'

type SegmentedControlProps<T extends string> = {
  /** Read by screen readers as the name of the group. */
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}

/**
 * A row of toggle buttons where exactly one is on. The pressed state is shown
 * by fill and weight and announced with aria-pressed, not by colour alone.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 rounded-lg px-4 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-500',
              selected
                ? 'bg-white font-semibold text-navy-900 shadow-card'
                : 'font-medium text-muted hover:text-navy-900',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
