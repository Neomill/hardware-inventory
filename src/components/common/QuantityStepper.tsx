import { Minus, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** `sm` is still a full 48px tap target; `lg` is for the add-to-cart dialog. */
  size?: 'sm' | 'lg'
  label: string
}

const STEP_STYLES: Record<'sm' | 'lg', string> = {
  sm: 'h-12 w-12',
  lg: 'h-14 w-16',
}

const VALUE_STYLES: Record<'sm' | 'lg', string> = {
  sm: 'h-12 w-12 text-base',
  lg: 'h-14 w-24 text-2xl',
}

/**
 * Plus and minus rather than a text field: it is the fastest, least
 * error-prone way to set a quantity, and needs no keyboard.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  size = 'sm',
  label,
}: QuantityStepperProps) {
  const canDecrease = value > min
  const canIncrease = max === undefined || value < max

  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label={`Decrease ${label}`}
        className={cn(
          'flex items-center justify-center bg-slate-50 text-navy-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40',
          STEP_STYLES[size],
        )}
      >
        <Minus className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden />
      </button>

      <output
        className={cn(
          'flex items-center justify-center font-semibold text-navy-900',
          VALUE_STYLES[size],
        )}
      >
        {value}
      </output>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label={`Increase ${label}`}
        className={cn(
          'flex items-center justify-center bg-slate-50 text-navy-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40',
          STEP_STYLES[size],
        )}
      >
        <Plus className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden />
      </button>
    </div>
  )
}
