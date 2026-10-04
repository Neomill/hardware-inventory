import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PackagePlus } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { inputClassName } from '@/components/common/inputStyles'
import { TextInput } from '@/components/common/TextInput'
import { ROUTES } from '@/app/routes'
import { ProductPicker } from '@/features/inventory/components/ProductPicker'
import {
  ReceiptConfirmation,
  type ReceivedStock,
} from '@/features/inventory/components/ReceiptConfirmation'
import {
  EMPTY_RECEIVE_VALUES,
  receiveStockSchema,
  toReceiveStockRequest,
  type ReceiveStockValues,
} from '@/features/inventory/lib/stockForms'
import { useShopStore } from '@/stores/useShopStore'

type ReceiveStockViewProps = {
  /** Preselected from a row action or a link: "?product=CEM-001". */
  initialProductId: string
}

export function ReceiveStockView({ initialProductId }: ReceiveStockViewProps) {
  const products = useShopStore((state) => state.products)
  const receiveStock = useShopStore((state) => state.receiveStock)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [received, setReceived] = useState<ReceivedStock | null>(null)

  const knownInitialId = products.some((product) => product.id === initialProductId)
    ? initialProductId
    : ''

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReceiveStockValues>({
    resolver: zodResolver(receiveStockSchema),
    defaultValues: { ...EMPTY_RECEIVE_VALUES, productId: knownInitialId },
  })

  const productId = watch('productId')
  const selected = products.find((product) => product.id === productId) ?? null

  function onSubmit(values: ReceiveStockValues) {
    setStoreError(null)

    const request = toReceiveStockRequest(values)
    const product = products.find((candidate) => candidate.id === request.productId)
    const result = receiveStock(request)

    if (!result.ok) {
      // Never silent: the form keeps everything typed so it can be corrected.
      setStoreError(result.message)

      return
    }

    setReceived({
      movement: result.movement,
      productName: product?.name ?? request.productId,
      unit: product?.unit ?? '',
      newStock: (product?.stock ?? 0) + result.movement.quantityDelta,
    })
  }

  function handleReceiveAnother() {
    reset(EMPTY_RECEIVE_VALUES)
    setReceived(null)
    setStoreError(null)
  }

  if (received) {
    return <ReceiptConfirmation received={received} onReceiveAnother={handleReceiveAnother} />
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="card mx-auto flex w-full max-w-3xl flex-col gap-5 p-5 sm:p-6"
    >
      <header>
        <h2 className="text-xl font-bold text-navy-900">Receive Stock</h2>
        <p className="mt-1 text-sm text-muted">
          Record a supplier delivery. Stock goes up as soon as you save.
        </p>
      </header>

      <FormField label="Product" error={errors.productId?.message}>
        {(fieldProps) => (
          <Controller
            control={control}
            name="productId"
            render={({ field }) => (
              <ProductPicker
                products={products}
                selected={selected}
                onSelect={field.onChange}
                id={fieldProps.id}
                describedBy={fieldProps.describedBy}
                invalid={fieldProps.invalid}
                inputRef={field.ref}
              />
            )}
          />
        )}
      </FormField>

      <FormField
        label={selected ? `Quantity received (${selected.unit})` : 'Quantity received'}
        error={errors.quantity?.message}
        hint="Whole units only."
      >
        {(field) => (
          <TextInput
            {...field}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            className="h-14 text-lg font-semibold sm:max-w-xs"
            {...register('quantity')}
          />
        )}
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Supplier" optional error={errors.supplier?.message}>
          {(field) => (
            <TextInput
              {...field}
              autoComplete="off"
              placeholder="e.g. Wilcon Depot"
              {...register('supplier')}
            />
          )}
        </FormField>

        <FormField
          label="Supplier invoice"
          optional
          error={errors.supplierInvoice?.message}
          hint="Format INV-10021."
        >
          {(field) => (
            <TextInput
              {...field}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="INV-10021"
              className="uppercase"
              {...register('supplierInvoice')}
            />
          )}
        </FormField>
      </div>

      <FormField label="Note" optional error={errors.note?.message}>
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            rows={3}
            placeholder="Anything worth remembering about this delivery"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={inputClassName(invalid, 'h-auto py-3')}
            {...register('note')}
          />
        )}
      </FormField>

      {storeError ? <Alert tone="error">{storeError}</Alert> : null}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Button to={ROUTES.inventory} className="sm:h-14 sm:px-8">
          Cancel
        </Button>
        <Button type="submit" variant="primary" icon={PackagePlus} className="sm:h-14 sm:px-10">
          Receive Stock
        </Button>
      </div>
    </form>
  )
}
