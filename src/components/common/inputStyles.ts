import { cn } from '@/lib/utils'

/**
 * The one text-control look: 48px tap height to match Button and
 * SearchInput, 16px text so iOS does not zoom on focus, red border on error.
 * Use for selects and textareas too, so every field matches.
 */
export function inputClassName(invalid = false, className?: string): string {
  return cn(
    'h-12 w-full rounded-xl border bg-white px-4 text-base text-navy-900 placeholder:text-muted disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted',
    invalid ? 'border-rose-400' : 'border-slate-200',
    className,
  )
}
