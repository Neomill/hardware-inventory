import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** What a FormField hands its control so the label, hint and error are wired up. */
export type FormFieldControlProps = {
  /** Put on the control: the label's htmlFor points at it. */
  id: string
  /** Ids of the hint and error, only for elements that are actually rendered. */
  describedBy: string | undefined
  /** True when an error is shown; pass to aria-invalid / TextInput's `invalid`. */
  invalid: boolean
}

type FormFieldProps = {
  label: string
  /** Inline validation message. Rendered under the control and announced with it. */
  error?: string
  /** Help text under the label, e.g. "Five digits, as printed on the invoice". */
  hint?: ReactNode
  /** Marks the field "Optional" beside the label. */
  optional?: boolean
  /** Use a known id instead of a generated one. */
  id?: string
  className?: string
  children: (control: FormFieldControlProps) => ReactNode
}

/**
 * Label, optional hint, the control, and an inline error, wired together with
 * `htmlFor` and `aria-describedby`. Layout and wiring only; validation stays
 * with the form.
 *
 *   <FormField label="Phone number" optional error={errors.phone?.message}>
 *     {(field) => <TextInput {...field} type="tel" {...register('phone')} />}
 *   </FormField>
 */
export function FormField({
  label,
  error,
  hint,
  optional = false,
  id,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const hintId = `${controlId}-hint`
  const errorId = `${controlId}-error`

  const hasHint = hint !== undefined && hint !== null && hint !== ''
  const hasError = Boolean(error)
  const describedBy =
    [hasHint ? hintId : null, hasError ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={controlId} className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-navy-900">{label}</span>
        {optional ? <span className="text-xs text-muted">Optional</span> : null}
      </label>

      {hasHint ? (
        <p id={hintId} className="-mt-0.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}

      {children({ id: controlId, describedBy, invalid: hasError })}

      {hasError ? (
        <p id={errorId} className="text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
