import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PackagePlus } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/app/routes'
import { FormField } from '@/features/inventory/components/FormField'
import { inputClasses } from '@/features/inventory/lib/formStyles'
import { ProductPicker } from '@/features/inventory/components/ProductPicker'
import {
  ReceiptConfirmation,
  type ReceivedStock,
} from '@/features/inventory/components/ReceiptConfirmation'
import { SubmitButton } from '@/features/inventory/components/SubmitButton'
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
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitted },
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

      <FormField label="Product" htmlFor="receive-product" error={errors.productId?.message}>
        <input id="receive-product" type="hidden" {...register('productId')} />
        <ProductPicker
          products={products}
          selected={selected}
          onSelect={(id) => setValue('productId', id, { shouldValidate: isSubmitted })}
          error={errors.productId?.message}
        />
      </FormField>

      <FormField
        label={selected ? `Quantity received (${selected.unit})` : 'Quantity received'}
        htmlFor="receive-quantity"
        error={errors.quantity?.message}
        hint="Whole units only."
      >
        <input
          id="receive-quantity"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          aria-invalid={Boolean(errors.quantity)}
          aria-describedby="receive-quantity-message"
          className={inputClasses(Boolean(errors.quantity), 'h-14 text-lg font-semibold sm:max-w-xs')}
          {...register('quantity')}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Supplier"
          htmlFor="receive-supplier"
          optional
          error={errors.supplier?.message}
        >
          <input
            id="receive-supplier"
            autoComplete="off"
            placeholder="e.g. Wilcon Depot"
            aria-describedby="receive-supplier-message"
            className={inputClasses(Boolean(errors.supplier))}
            {...register('supplier')}
          />
        </FormField>

        <FormField
          label="Supplier invoice"
          htmlFor="receive-invoice"
          optional
          error={errors.supplierInvoice?.message}
          hint="Format INV-10021."
        >
          <input
            id="receive-invoice"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="INV-10021"
            aria-invalid={Boolean(errors.supplierInvoice)}
            aria-describedby="receive-invoice-message"
            className={inputClasses(Boolean(errors.supplierInvoice), 'uppercase')}
            {...register('supplierInvoice')}
          />
        </FormField>
      </div>

      <FormField label="Note" htmlFor="receive-note" optional error={errors.note?.message}>
        <textarea
          id="receive-note"
          rows={3}
          placeholder="Anything worth remembering about this delivery"
          aria-describedby="receive-note-message"
          className={inputClasses(Boolean(errors.note), 'h-auto py-3')}
          {...register('note')}
        />
      </FormField>

      {storeError ? <Alert tone="error">{storeError}</Alert> : null}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Button to={ROUTES.inventory} className="sm:h-14 sm:px-8">
          Cancel
        </Button>
        <SubmitButton icon={PackagePlus} className="sm:h-14 sm:px-10">
          Receive Stock
        </SubmitButton>
      </div>
    </form>
  )
}
