import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type FormFieldProps = {
  label: string
  htmlFor: string
  /** Shown under the control in place of the hint when present. */
  error?: string
  hint?: string
  optional?: boolean
  children: ReactNode
  className?: string
}

/** Label above, control, then a hint or a plain-language error below. */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  className,
}: FormFieldProps) {
  const messageId = `${htmlFor}-message`

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-navy-900">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
      </label>

      {children}

      {error ? (
        <p id={messageId} className="text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
