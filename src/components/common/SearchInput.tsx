import { Search } from 'lucide-react'
import { forwardRef, type AriaAttributes } from 'react'

import { cn } from '@/lib/utils'

type SearchInputProps = AriaAttributes & {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Accessible name; the design shows no visible label. */
  label: string
  id?: string
  name?: string
  /** Red border and aria-invalid. `aria-invalid` alone also shows the red border. */
  invalid?: boolean
  className?: string
}

/** Search field with a leading icon. The ref points at the <input>. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, placeholder, label, id, name, invalid, className, ...aria },
  ref,
) {
  const ariaInvalid = aria['aria-invalid'] ?? (invalid ? true : undefined)
  const isInvalid =
    invalid === true ||
    (ariaInvalid !== undefined && ariaInvalid !== false && ariaInvalid !== 'false')

  return (
    <label className={cn('relative flex items-center', className)}>
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-4 h-5 w-5 text-muted" aria-hidden />
      <input
        {...aria}
        ref={ref}
        id={id}
        name={name}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        className={cn(
          'h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-sm text-navy-900 placeholder:text-muted',
          isInvalid ? 'border-rose-400' : 'border-slate-200',
        )}
      />
    </label>
  )
})
