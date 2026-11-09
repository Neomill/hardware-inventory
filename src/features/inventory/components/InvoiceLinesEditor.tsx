import { Trash2 } from 'lucide-react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import { StatusPill } from '@/components/common/StatusPill'
import { STOCK_STATUS_TONES } from '@/components/common/statusTones'
import { TextInput } from '@/components/common/TextInput'
import { deriveStockStatus } from '@/domain/stock'
import type { Product } from '@/domain/types'
import type { InvoiceFormValues } from '@/features/inventory/lib/invoiceForm'
import { formatNumber } from '@/lib/format'

type InvoiceLinesEditorProps = {
  /** useFieldArray's fields: each carries a stable `id` for the React key. */
  fields: { id: string; productId: string }[]
  productsById: Map<string, Product>
  register: UseFormRegister<InvoiceFormValues>
  errors: FieldErrors<InvoiceFormValues>['lines']
  onRemove: (index: number) => void
}

/** The products on the invoice: current stock, an editable quantity and Remove. */
export function InvoiceLinesEditor({
  fields,
  productsById,
  register,
  errors,
  onRemove,
}: InvoiceLinesEditorProps) {
  if (fields.length === 0) {
    return null
  }

  return (
    <ul
      aria-label="Products on this invoice"
      className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200"
    >
      {fields.map((field, index) => {
        const product = productsById.get(field.productId)
        const name = product?.name ?? field.productId
        const quantityId = `invoice-line-${field.id}-quantity`
        const errorId = `${quantityId}-error`
        const error = errors?.[index]?.quantity?.message

        return (
          <li key={field.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 sm:pt-2">
              <p className="truncate font-semibold text-navy-900">{name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                {product?.sku ?? 'Removed product'}
                {product ? (
                  <>
                    <span aria-hidden>&middot;</span>
                    Current stock
                    <StatusPill
                      tone={
                        STOCK_STATUS_TONES[deriveStockStatus(product.stock, product.reorderLevel)]
                      }
                    >
                      {formatNumber(product.stock)} {product.unit}
                    </StatusPill>
                  </>
                ) : null}
              </p>
            </div>

            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor={quantityId} className="sr-only">
                  Quantity received of {name}
                </label>
                <div className="flex items-center gap-2">
                  <TextInput
                    id={quantityId}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    invalid={Boolean(error)}
                    describedBy={error ? errorId : undefined}
                    className="w-24 text-right font-semibold tabular-nums"
                    {...register(`lines.${index}.quantity`)}
                  />
                  <span className="w-14 truncate text-sm text-muted">{product?.unit}</span>
                </div>
                {error ? (
                  <p id={errorId} className="max-w-[10rem] text-sm font-medium text-rose-700">
                    {error}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${name}`}
                className="flex h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
