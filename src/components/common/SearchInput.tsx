import { Search } from 'lucide-react'

import { cn } from '@/lib/utils'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Accessible name; the design shows no visible label. */
  label: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder, label, className }: SearchInputProps) {
  return (
    <label className={cn('relative flex items-center', className)}>
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-4 h-5 w-5 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-navy-900 placeholder:text-muted"
      />
    </label>
  )
}
