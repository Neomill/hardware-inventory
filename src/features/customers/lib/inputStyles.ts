import { cn } from '@/lib/utils'

/** Shared text-input look for the ledger forms; a red border marks a field with an error. */
export function inputClassName(hasError: boolean, className?: string): string {
  return cn(
    'h-12 w-full rounded-xl border bg-white px-4 text-base text-navy-900 placeholder:text-muted',
    hasError ? 'border-rose-400' : 'border-slate-200',
    className,
  )
}
