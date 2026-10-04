import { cn } from '@/lib/utils'

/** Text inputs share the 48px tap height of Button and SearchInput. */
const INPUT_STYLES =
  'h-12 w-full rounded-xl border bg-white px-4 text-sm text-navy-900 placeholder:text-muted'

export function inputClasses(hasError: boolean, className?: string): string {
  return cn(INPUT_STYLES, hasError ? 'border-rose-400' : 'border-slate-200', className)
}
