import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Minus, Plus, SlidersVertical } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { FormField } from '@/components/common/FormField'
import { TextInput } from '@/components/common/TextInput'
import {
  EMPTY_ADJUST_VALUES,
  makeAdjustStockSchema,
  toQuantityDelta,
  type AdjustStockValues,
  type AdjustmentDirection,
} from '@/features/inventory/lib/stockForms'
import { formatQuantityDelta } from '@/features/inventory/lib/movementQuery'
import type { Product, StockMovement } from '@/domain/types'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'
import { useShopStore } from '@/stores/useShopStore'

/** Common corrections, one tap each. Any other reason can be typed. */
const QUICK_REASONS = ['Damaged', 'Physical count', 'Lost or missing', 'Returned to supplier']

const DIRECTIONS: { value: AdjustmentDirection; label: string; icon: typeof Plus }[] = [
  { value: 'remove', label: 'Remove stock', icon: Minus },
  { value: 'add', label: 'Add stock', icon: Plus },
]

type AdjustStockDialogProps = {
  product: Product
  onClose: () => void
  onAdjusted: (movement: StockMovement) => void
}

export function AdjustStockDialog({ product, onClose, onAdjusted }: AdjustStockDialogProps) {
  const adjustStock = useShopStore((state) => state.adjustStock)
  const [storeError, setStoreError] = useState<string | null>(null)
  const quantityRef = useRef<HTMLInputElement | null>(null)
  const schema = useMemo(() => makeAdjustStockSchema(product.stock), [product.stock])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<AdjustStockValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_ADJUST_VALUES,
  })

  const quantityField = register('quantity')
  const direction = watch('direction')
  const delta = toQuantityDelta(direction, watch('quantity'))
  const projected = delta === null ? null : product.stock + delta
  // Shown as soon as it is typed, not only on submit: the rule is the point.
  const belowZero =
    projected !== null && projected < 0
      ? `Only ${formatNumber(product.stock)} ${product.unit} on hand. Stock cannot go below zero.`
      : undefined

  function chooseDirection(value: AdjustmentDirection) {
    setValue('direction', value, { shouldValidate: isSubmitted })
  }

  /** Radio-group keys: arrows move and select, like native radios. */
  function handleDirectionKey(event: KeyboardEvent<HTMLButtonElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]

    if (step === undefined) {
      return
    }

    event.preventDefault()
    const index = DIRECTIONS.findIndex((option) => option.value === direction)
    const next = DIRECTIONS[(index + step + DIRECTIONS.length) % DIRECTIONS.length]
    chooseDirection(next.value)
    const group = event.currentTarget.parentElement
    group?.querySelector<HTMLButtonElement>(`[data-direction="${next.value}"]`)?.focus()
  }

  function onSubmit(values: AdjustStockValues) {
    const quantityDelta = toQuantityDelta(values.direction, values.quantity)

    if (quantityDelta === null) {
      return
    }

    const result = adjustStock({ productId: product.id, quantityDelta, reason: values.reason })

    if (!result.ok) {
      setStoreError(result.message)

      return
    }

    onAdjusted(result.movement)
  }

  return (
    <Dialog title="Adjust Stock" onClose={onClose} initialFocusRef={quantityRef}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy-900">{product.name}</p>
            <p className="text-xs text-muted">{product.sku}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">On hand</p>
            <p className="text-lg font-bold tabular-nums text-navy-900">
              {formatNumber(product.stock)} {product.unit}
            </p>
          </div>
        </div>

        <div role="radiogroup" aria-label="Direction" className="grid grid-cols-2 gap-3">
          {DIRECTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={direction === option.value}
              tabIndex={direction === option.value ? 0 : -1}
              data-direction={option.value}
              onClick={() => chooseDirection(option.value)}
              onKeyDown={handleDirectionKey}
              className={cn(
                'flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors',
                direction === option.value
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-slate-200 text-navy-800 hover:bg-navy-50',
              )}
            >
              <option.icon className="h-5 w-5" aria-hidden />
              {option.label}
            </button>
          ))}
        </div>

        <FormField
          label={`Quantity (${product.unit})`}
          error={belowZero ?? errors.quantity?.message}
          hint={
            projected !== null && projected >= 0
              ? `${formatQuantityDelta(delta ?? 0)} ${product.unit}. New stock will be ${formatNumber(projected)}.`
              : undefined
          }
        >
          {(field) => (
            <TextInput
              {...field}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              className="h-14 text-lg font-semibold"
              {...quantityField}
              ref={(element) => {
                quantityField.ref(element)
                quantityRef.current = element
              }}
            />
          )}
        </FormField>

        <FormField label="Reason" error={errors.reason?.message}>
          {(field) => (
            <TextInput
              {...field}
              autoComplete="off"
              placeholder="Why is the stock changing?"
              {...register('reason')}
            />
          )}
        </FormField>
        <div role="group" aria-label="Common reasons" className="-mt-3 flex flex-wrap gap-2">
          {QUICK_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setValue('reason', reason, { shouldValidate: isSubmitted })}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-50"
            >
              {reason}
            </button>
          ))}
        </div>

        {storeError ? <Alert tone="error">{storeError}</Alert> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onClose} className="flex-1 sm:h-14">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={SlidersVertical}
            disabled={belowZero !== undefined}
            className="flex-1 sm:h-14"
          >
            Save Adjustment
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
