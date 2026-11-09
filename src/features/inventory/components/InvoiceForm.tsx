import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PackagePlus, Plus } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { inputClassName } from '@/components/common/inputStyles'
import { TextInput } from '@/components/common/TextInput'
import { ROUTES } from '@/app/routes'
import { toDayKey } from '@/domain/dates'
import { knownSuppliers } from '@/domain/supplierInvoice'
import type { SupplierInvoice } from '@/domain/types'
import { InvoiceLinesEditor } from '@/features/inventory/components/InvoiceLinesEditor'
import { ProductPicker } from '@/features/inventory/components/ProductPicker'
import {
  describeInvoiceLines,
  emptyInvoiceValues,
  makeInvoiceFormSchema,
  productsNotOnInvoice,
  toReceiveInvoiceInput,
  validateLineToAdd,
  type InvoiceFormValues,
  type LineToAddResult,
} from '@/features/inventory/lib/invoiceForm'
import { useCalendarDay } from '@/hooks/useCalendarDay'
import { useShopStore } from '@/stores/useShopStore'

type StageError = Extract<LineToAddResult, { ok: false }>

type InvoiceFormProps = {
  /** Preselected from a row action or a link ("?product=CEM-001"): the first line. */
  initialProductId: string
  onReceived: (invoice: SupplierInvoice) => void
}

/** Receive Stock: one supplier invoice, one or more products (spec 04 s.7.3). */
export function InvoiceForm({ initialProductId, onReceived }: InvoiceFormProps) {
  const products = useShopStore((state) => state.products)
  const invoices = useShopStore((state) => state.invoices)
  const movements = useShopStore((state) => state.movements)
  const receiveInvoice = useShopStore((state) => state.receiveInvoice)
  const today = useCalendarDay()
  const supplierListId = useId()

  const [storeError, setStoreError] = useState<string | null>(null)
  const [stagedId, setStagedId] = useState('')
  const [stagedQuantity, setStagedQuantity] = useState('')
  const [stageError, setStageError] = useState<StageError | null>(null)
  const pickerInputRef = useRef<HTMLInputElement | null>(null)
  const focusPickerNext = useRef(false)
  const quantityInputRef = useRef<HTMLInputElement | null>(null)

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const suppliers = useMemo(() => knownSuppliers(invoices), [invoices])
  const schema = useMemo(
    () => makeInvoiceFormSchema({ invoices, movements, products, now: () => new Date() }),
    [invoices, movements, products],
  )

  const {
    register,
    control,
    handleSubmit,
    watch,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyInvoiceValues(
      toDayKey(new Date()),
      productsById.has(initialProductId) ? initialProductId : '',
    ),
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const lines = watch('lines')
  const staged = productsById.get(stagedId) ?? null
  const linesError = errors.lines?.root?.message ?? errors.lines?.message

  // After a line is added the picker is back to its search box; put the cursor there.
  useEffect(() => {
    if (focusPickerNext.current) {
      focusPickerNext.current = false
      pickerInputRef.current?.focus()
    }
  }, [fields.length])

  function addLine() {
    const result = validateLineToAdd(stagedId, stagedQuantity, lines)

    if (!result.ok) {
      setStageError(result)

      return
    }

    append(result.line)
    clearErrors('lines')
    setStagedId('')
    setStagedQuantity('')
    setStageError(null)
    focusPickerNext.current = true
  }

  function handleStagedKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter adds the line instead of submitting the whole invoice.
    if (event.key === 'Enter') {
      event.preventDefault()
      addLine()
    }
  }

  function onSubmit(values: InvoiceFormValues) {
    setStoreError(null)

    const result = receiveInvoice(toReceiveInvoiceInput(values))

    if (!result.ok) {
      // Never silent: the form keeps everything typed so it can be corrected.
      setStoreError(result.message)

      return
    }

    onReceived(result.invoice)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="card mx-auto flex w-full max-w-3xl flex-col gap-6 p-5 sm:p-6"
    >
      <header>
        <h2 className="text-xl font-bold text-navy-900">Receive Stock</h2>
        <p className="mt-1 text-sm text-muted">
          Record a delivery from its supplier invoice. Stock goes up for every product as soon as
          you save.
        </p>
      </header>

      <fieldset className="flex flex-col gap-4">
        <legend className="float-left w-full text-base font-bold text-navy-800">Invoice</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Invoice number"
            error={errors.invoiceNumber?.message}
            hint="As printed, e.g. INV-10021."
          >
            {(field) => (
              <TextInput
                {...field}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="INV-10021"
                className="uppercase"
                {...register('invoiceNumber')}
              />
            )}
          </FormField>

          <FormField label="Supplier" error={errors.supplier?.message}>
            {(field) => (
              <>
                <TextInput
                  {...field}
                  autoComplete="off"
                  placeholder="e.g. ABC Trading"
                  list={supplierListId}
                  {...register('supplier')}
                />
                <datalist id={supplierListId}>
                  {suppliers.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </>
            )}
          </FormField>

          <FormField label="Invoice date" error={errors.invoiceDate?.message}>
            {(field) => (
              <TextInput {...field} type="date" max={today} {...register('invoiceDate')} />
            )}
          </FormField>

          <FormField label="Invoice total (PHP)" error={errors.total?.message}>
            {(field) => (
              <TextInput
                {...field}
                prefix="₱"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                className="text-right font-semibold tabular-nums"
                {...register('total')}
              />
            )}
          </FormField>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-slate-100 pt-5">
        <legend className="float-left w-full text-base font-bold text-navy-800">Products</legend>

        <FormField
          label="Product"
          error={stageError?.field === 'productId' ? stageError.message : undefined}
        >
          {(fieldProps) => (
            <ProductPicker
              products={productsNotOnInvoice(products, lines)}
              selected={staged}
              onSelect={(productId) => {
                setStagedId(productId)
                setStageError(null)
                // The tapped result is about to unmount; without this, focus falls to <body>.
                quantityInputRef.current?.focus()
              }}
              id={fieldProps.id}
              describedBy={fieldProps.describedBy}
              invalid={fieldProps.invalid}
              inputRef={(element) => {
                pickerInputRef.current = element
              }}
            />
          )}
        </FormField>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <FormField
            label={staged ? `Quantity (${staged.unit})` : 'Quantity'}
            hint="Whole units only."
            error={stageError?.field === 'quantity' ? stageError.message : undefined}
            className="sm:w-56"
          >
            {(field) => (
              <TextInput
                {...field}
                ref={quantityInputRef}
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={stagedQuantity}
                onChange={(event) => {
                  setStagedQuantity(event.target.value)
                  setStageError(null)
                }}
                onKeyDown={handleStagedKeyDown}
                className="text-lg font-semibold"
              />
            )}
          </FormField>
          <Button icon={Plus} variant="navy" onClick={addLine} className="sm:mt-[2.875rem]">
            Add to invoice
          </Button>
        </div>

        <InvoiceLinesEditor
          fields={fields}
          productsById={productsById}
          register={register}
          errors={errors.lines}
          onRemove={remove}
        />

        {linesError ? (
          <p role="alert" className="text-sm font-medium text-rose-700">
            {linesError}
          </p>
        ) : null}

        <p className="text-sm font-semibold text-navy-900" aria-live="polite">
          {describeInvoiceLines(lines)}
        </p>
      </fieldset>

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
        <Button
          type="submit"
          variant="primary"
          icon={PackagePlus}
          pending={isSubmitting}
          className="sm:h-14 sm:px-10"
        >
          Receive Stock
        </Button>
      </div>
    </form>
  )
}
