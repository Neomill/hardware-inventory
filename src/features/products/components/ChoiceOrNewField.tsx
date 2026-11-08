import type { ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

import { FormField } from '@/components/common/FormField'
import { inputClassName } from '@/components/common/inputStyles'
import { TextInput } from '@/components/common/TextInput'
import { NEW_CHOICE, type ChoiceOption } from '@/features/products/lib/productForm'

type ChoiceOrNewFieldProps = {
  label: string
  /** Label of the text input shown when "New ..." is picked. */
  newLabel: string
  placeholder: string
  newPlaceholder: string
  options: ChoiceOption[]
  /** The select's current value, to know when to show the text input. */
  choice: string
  selectProps: UseFormRegisterReturn
  newProps: UseFormRegisterReturn
  selectError?: string
  newError?: string
  /** Under the field, e.g. the SKU preview. */
  footer?: ReactNode
}

/**
 * A select of existing values with a last "New ..." option that reveals a
 * text input (spec 04 s.7.1). Used for Category and Unit.
 */
export function ChoiceOrNewField({
  label,
  newLabel,
  placeholder,
  newPlaceholder,
  options,
  choice,
  selectProps,
  newProps,
  selectError,
  newError,
  footer,
}: ChoiceOrNewFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      <FormField label={label} error={selectError}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={inputClassName(invalid)}
            {...selectProps}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      {choice === NEW_CHOICE ? (
        <FormField label={newLabel} error={newError}>
          {(field) => (
            <TextInput {...field} autoComplete="off" placeholder={newPlaceholder} {...newProps} />
          )}
        </FormField>
      ) : null}

      {footer}
    </div>
  )
}
