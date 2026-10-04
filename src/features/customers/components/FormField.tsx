import { useId, type ReactNode } from 'react'

type FormFieldProps = {
  label: string
  /** Shown beside the label, e.g. "Optional". */
  hint?: string
  error?: string
  /** Receives the generated id and the error-description id for the input. */
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode
}

/** Label, input and an inline error that screen readers tie to the input. */
export function FormField({ label, hint, error, children }: FormFieldProps) {
  const inputId = useId()
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-navy-900">{label}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </label>

      {children({ inputId, describedBy: error ? errorId : undefined })}

      {error ? (
        <p id={errorId} className="text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
