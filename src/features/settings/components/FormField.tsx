import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** Shown under the input until there is an error. */
  hint?: ReactNode
  error?: string
  /** Text fixed at the right edge of the input, such as "%". */
  suffix?: string
}

/** Labelled text input with its own hint and error line. Forwards its ref for react-hook-form. */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, hint, error, suffix, id, className, ...inputProps },
  ref,
) {
  const inputId = id ?? inputProps.name
  const describedBy = `${inputId}-description`

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-navy-900">
        {label}
      </label>

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? describedBy : undefined}
          className={cn(
            'h-12 w-full rounded-xl border bg-white px-4 text-sm text-navy-900 placeholder:text-muted',
            suffix ? 'pr-10' : null,
            error ? 'border-rose-400' : 'border-slate-200',
          )}
          {...inputProps}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-muted">
            {suffix}
          </span>
        ) : null}
      </div>

      {error ? (
        <p id={describedBy} className="text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
