import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PackagePlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { TextInput } from '@/components/common/TextInput'
import { ROUTES } from '@/app/routes'
import { listCategories, listUnits } from '@/domain/product'
import { ChoiceOrNewField } from '@/features/products/components/ChoiceOrNewField'
import { productAddedState } from '@/features/products/lib/productDetail'
import {
  EMPTY_ADD_PRODUCT_VALUES,
  NEW_CATEGORY_LABEL,
  NEW_UNIT_LABEL,
  choiceOptions,
  makeAddProductSchema,
  previewSku,
  previewUnit,
  toNewProductInput,
  type AddProductValues,
} from '@/features/products/lib/productForm'
import { useShopStore } from '@/stores/useShopStore'

export function AddProductForm() {
  const products = useShopStore((state) => state.products)
  const addProduct = useShopStore((state) => state.addProduct)
  const navigate = useNavigate()
  const [storeError, setStoreError] = useState<string | null>(null)

  const schema = useMemo(() => makeAddProductSchema(products), [products])
  const categoryOptions = useMemo(
    () => choiceOptions(listCategories(products), NEW_CATEGORY_LABEL),
    [products],
  )
  const unitOptions = useMemo(() => choiceOptions(listUnits(products), NEW_UNIT_LABEL), [products])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddProductValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_ADD_PRODUCT_VALUES,
  })

  const [categoryChoice, newCategory, unitChoice, newUnit] = watch([
    'categoryChoice',
    'newCategory',
    'unitChoice',
    'newUnit',
  ])
  const sku = previewSku(categoryChoice, newCategory, products)
  const unit = previewUnit(unitChoice, newUnit, products)

  function onSubmit(values: AddProductValues) {
    setStoreError(null)

    const result = addProduct(toNewProductInput(values, products))

    if (!result.ok) {
      // Never silent: the form keeps everything typed so it can be corrected.
      setStoreError(result.message)

      return
    }

    navigate(ROUTES.productDetail(result.product.id), {
      state: productAddedState(result.movement.quantityDelta),
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="card mx-auto flex w-full max-w-3xl flex-col gap-5 p-5 sm:p-6"
    >
      <header>
        <h2 className="text-xl font-bold text-navy-900">Add Product</h2>
        <p className="mt-1 text-sm text-muted">
          The product code is assigned for you. Stock already on the shelf is recorded as opening
          stock.
        </p>
      </header>

      <FormField label="Product name" error={errors.name?.message}>
        {(field) => (
          <TextInput
            {...field}
            autoComplete="off"
            placeholder="e.g. Garden Hose 10m"
            {...register('name')}
          />
        )}
      </FormField>

      <ChoiceOrNewField
        label="Category"
        newLabel="New category name"
        placeholder="Choose a category"
        newPlaceholder="e.g. Garden"
        options={categoryOptions}
        choice={categoryChoice}
        selectProps={register('categoryChoice')}
        newProps={register('newCategory')}
        selectError={errors.categoryChoice?.message}
        newError={errors.newCategory?.message}
        footer={
          <p className="text-sm text-muted" aria-live="polite">
            {sku ? (
              <>
                Product code: <span className="font-semibold text-navy-900">{sku}</span>, assigned
                when you save.
              </>
            ) : null}
          </p>
        }
      />

      <ChoiceOrNewField
        label="Unit"
        newLabel="New unit name"
        placeholder="Choose a unit"
        newPlaceholder="e.g. bundle"
        options={unitOptions}
        choice={unitChoice}
        selectProps={register('unitChoice')}
        newProps={register('newUnit')}
        selectError={errors.unitChoice?.message}
        newError={errors.newUnit?.message}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField label="Price" error={errors.price?.message} hint="Selling price, VAT included.">
          {(field) => (
            <TextInput
              {...field}
              prefix="PHP"
              className="pl-14"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              {...register('price')}
            />
          )}
        </FormField>

        <FormField
          label="Low-stock alert at"
          error={errors.reorderLevel?.message}
          hint="Shown as Low Stock at or below this number."
        >
          {(field) => (
            <TextInput
              {...field}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              {...register('reorderLevel')}
            />
          )}
        </FormField>

        <FormField
          label={unit ? `Opening stock (${unit})` : 'Opening stock'}
          error={errors.openingStock?.message}
          hint="On the shelf now."
        >
          {(field) => (
            <TextInput
              {...field}
              inputMode="numeric"
              autoComplete="off"
              {...register('openingStock')}
            />
          )}
        </FormField>
      </div>

      <label className="flex min-h-12 items-center gap-3 text-sm font-semibold text-navy-900">
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-slate-300 accent-brand-500"
          {...register('isActive')}
        />
        Available for sale
      </label>

      {storeError ? <Alert tone="error">{storeError}</Alert> : null}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Button to={ROUTES.products} className="sm:h-14 sm:px-8">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          icon={PackagePlus}
          pending={isSubmitting}
          className="sm:h-14 sm:px-10"
        >
          Add Product
        </Button>
      </div>
    </form>
  )
}
