import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

import { inputClassName } from '@/components/common/inputStyles'
import { cn } from '@/lib/utils'

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  /** Shows the error border and sets aria-invalid. */
  invalid?: boolean
  /** Fixed text before the value, e.g. "₱". Decorative; put the unit in the label too. */
  prefix?: ReactNode
  /** Fixed text after the value, e.g. "%" or "pcs". */
  suffix?: ReactNode
  /** Forwarded from FormField; mapped to aria-describedby. */
  describedBy?: string
  /** Classes for the wrapper when a prefix or suffix is shown. */
  wrapperClassName?: string
}

const AFFIX = 'pointer-events-none absolute inset-y-0 flex items-center text-base text-muted'

/**
 * Text input that takes FormField's control props directly:
 *
 *   <FormField label="Amount" error={errors.amount?.message}>
 *     {(field) => <TextInput {...field} prefix="₱" inputMode="decimal" {...register('amount')} />}
 *   </FormField>
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    invalid = false,
    prefix,
    suffix,
    describedBy,
    wrapperClassName,
    className,
    type = 'text',
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...rest
  },
  ref,
) {
  const input = (
    <input
      ref={ref}
      type={type}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
      aria-describedby={ariaDescribedBy ?? describedBy}
      className={inputClassName(
        invalid,
        cn(prefix ? 'pl-9' : null, suffix ? 'pr-12' : null, className),
      )}
      {...rest}
    />
  )

  if (!prefix && !suffix) {
    return input
  }

  return (
    <div className={cn('relative', wrapperClassName)}>
      {prefix ? (
        <span aria-hidden className={cn(AFFIX, 'left-4')}>
          {prefix}
        </span>
      ) : null}
      {input}
      {suffix ? (
        <span aria-hidden className={cn(AFFIX, 'right-4')}>
          {suffix}
        </span>
      ) : null}
    </div>
  )
})
