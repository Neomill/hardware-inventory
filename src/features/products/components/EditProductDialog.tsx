import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { FormField } from '@/components/common/FormField'
import { TextInput } from '@/components/common/TextInput'
import { listCategories } from '@/domain/product'
import type { Product } from '@/domain/types'
import { ChoiceOrNewField } from '@/features/products/components/ChoiceOrNewField'
import {
  NEW_CATEGORY_LABEL,
  choiceOptions,
  editValuesFor,
  makeEditProductSchema,
  toProductChanges,
  type EditProductValues,
} from '@/features/products/lib/productForm'
import { useShopStore } from '@/stores/useShopStore'

type EditProductDialogProps = {
  product: Product
  onClose: () => void
  onSaved: () => void
}

/**
 * Name, category, price, Reorder At and active only (spec 04 s.5.5). SKU and
 * unit are shown read-only; stock changes only through Inventory.
 */
export function EditProductDialog({ product, onClose, onSaved }: EditProductDialogProps) {
  const products = useShopStore((state) => state.products)
  const updateProduct = useShopStore((state) => state.updateProduct)
  const [storeError, setStoreError] = useState<string | null>(null)

  const schema = useMemo(() => makeEditProductSchema(product.id, products), [product.id, products])
  const categoryOptions = useMemo(
    () => choiceOptions(listCategories(products), NEW_CATEGORY_LABEL),
    [products],
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EditProductValues>({
    resolver: zodResolver(schema),
    defaultValues: editValuesFor(product),
  })

  function onSubmit(values: EditProductValues) {
    setStoreError(null)

    const changes = toProductChanges(values, product, products)

    if (Object.keys(changes).length === 0) {
      onClose()

      return
    }

    const result = updateProduct(product.id, changes)

    if (!result.ok) {
      setStoreError(result.message)

      return
    }

    onSaved()
  }

  return (
    <Dialog title="Edit Product" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div>
            <dt className="text-sm text-muted">Product code (cannot change)</dt>
            <dd className="font-semibold text-navy-900">{product.sku}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Unit (cannot change)</dt>
            <dd className="font-semibold text-navy-900">{product.unit}</dd>
          </div>
        </dl>

        <FormField label="Product name" error={errors.name?.message}>
          {(field) => <TextInput {...field} autoComplete="off" {...register('name')} />}
        </FormField>

        <ChoiceOrNewField
          label="Category"
          newLabel="New category name"
          placeholder="Choose a category"
          newPlaceholder="e.g. Garden"
          options={categoryOptions}
          choice={watch('categoryChoice')}
          selectProps={register('categoryChoice')}
          newProps={register('newCategory')}
          selectError={errors.categoryChoice?.message}
          newError={errors.newCategory?.message}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Price"
            error={errors.price?.message}
            hint="Past sales keep the price they were sold at."
          >
            {(field) => (
              <TextInput
                {...field}
                prefix="PHP"
                className="pl-14"
                inputMode="decimal"
                autoComplete="off"
                {...register('price')}
              />
            )}
          </FormField>

          <FormField
            label="Low-stock alert at"
            error={errors.reorderLevel?.message}
            hint={`Shown as Low Stock at or below this number, in ${product.unit}.`}
          >
            {(field) => (
              <TextInput
                {...field}
                inputMode="numeric"
                autoComplete="off"
                {...register('reorderLevel')}
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
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" icon={Save}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
