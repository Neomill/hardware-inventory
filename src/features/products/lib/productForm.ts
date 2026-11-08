import { z } from 'zod'

import { formatAmountInput, parseAmountInput, type Centavos } from '@/domain/money'
import {
  listCategories,
  listUnits,
  matchExisting,
  nextProductSku,
  normalizeProductText,
  validateCategory,
  validatePrice,
  validateProductName,
  validateUnit,
  validateWholeCount,
  type NewProductInput,
  type ProductChanges,
} from '@/domain/product'
import type { Product, ValidationResult } from '@/domain/types'

/**
 * Add Product and Edit Product forms (spec 04 s.5.1, s.5.5). Values stay
 * strings so an empty number field is "", never NaN. Every rule comes from
 * src/domain/product.ts, so the form and addProduct/updateProduct agree.
 */

/** The last option of the Category and Unit selects: reveals a text input. */
export const NEW_CHOICE = '__new__'

export const NEW_CATEGORY_LABEL = 'New category...'
export const NEW_UNIT_LABEL = 'New unit...'

export type ChoiceOption = { value: string; label: string }

/** Existing values, then the "New ..." option. */
export function choiceOptions(existing: string[], newLabel: string): ChoiceOption[] {
  return [
    ...existing.map((value) => ({ value, label: value })),
    { value: NEW_CHOICE, label: newLabel },
  ]
}

/** The picked value, or what was typed when "New ..." is picked. */
export function resolveChoice(choice: string, typed: string): string {
  return choice === NEW_CHOICE ? typed : choice
}

const WHOLE_NUMBER = /^\d+$/

/** "12" -> 12. Null for blank, "2.5", "-1" or "abc". */
export function parseWholeCount(raw: string): number | null {
  const trimmed = raw.trim()

  if (!WHOLE_NUMBER.test(trimmed)) {
    return null
  }

  const value = Number(trimmed)

  return Number.isSafeInteger(value) ? value : null
}

const WHOLE_COUNT_MESSAGE = 'Enter a whole number, 0 or more.'

function checkCount(raw: string): ValidationResult {
  const value = parseWholeCount(raw)

  return value === null ? { ok: false, message: WHOLE_COUNT_MESSAGE } : validateWholeCount(value)
}

/** Price text to centavos; zero stands for "not a price" so the domain rule refuses it. */
function priceFromText(raw: string): Centavos {
  return parseAmountInput(raw) ?? 0
}

type Issue = { path: string; result: ValidationResult }

function addIssues(issues: Issue[], context: z.RefinementCtx) {
  for (const { path, result } of issues) {
    if (!result.ok) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path],
        message: result.message ?? 'Check this field.',
      })
    }
  }
}

/** The category check, shown under whichever control the person is using. */
function categoryIssue(choice: string, typed: string): Issue {
  return {
    path: choice === NEW_CHOICE ? 'newCategory' : 'categoryChoice',
    result: validateCategory(resolveChoice(choice, typed)),
  }
}

// ---------------------------------------------------------------- Add Product

const addProductShape = z.object({
  name: z.string(),
  categoryChoice: z.string(),
  newCategory: z.string(),
  unitChoice: z.string(),
  newUnit: z.string(),
  price: z.string(),
  reorderLevel: z.string(),
  openingStock: z.string(),
  isActive: z.boolean(),
})

export type AddProductValues = z.infer<typeof addProductShape>

export const EMPTY_ADD_PRODUCT_VALUES: AddProductValues = {
  name: '',
  categoryChoice: '',
  newCategory: '',
  unitChoice: '',
  newUnit: '',
  price: '',
  reorderLevel: '',
  openingStock: '0',
  isActive: true,
}

/**
 * Built per catalogue, because the duplicate-name rule depends on the
 * products saved now. Each field gets its own message (spec s.5.1).
 */
export function makeAddProductSchema(products: Product[]) {
  return addProductShape.superRefine((values, context) => {
    addIssues(
      [
        { path: 'name', result: validateProductName(values.name, products) },
        categoryIssue(values.categoryChoice, values.newCategory),
        {
          path: values.unitChoice === NEW_CHOICE ? 'newUnit' : 'unitChoice',
          result: validateUnit(resolveChoice(values.unitChoice, values.newUnit)),
        },
        { path: 'price', result: validatePrice(priceFromText(values.price)) },
        { path: 'reorderLevel', result: checkCount(values.reorderLevel) },
        { path: 'openingStock', result: checkCount(values.openingStock) },
      ],
      context,
    )
  })
}

/** Validated form values to the store's input. Category and unit take existing spellings. */
export function toNewProductInput(values: AddProductValues, products: Product[]): NewProductInput {
  return {
    name: normalizeProductText(values.name),
    category: matchExisting(
      resolveChoice(values.categoryChoice, values.newCategory),
      listCategories(products),
    ),
    unit: matchExisting(resolveChoice(values.unitChoice, values.newUnit), listUnits(products)),
    price: priceFromText(values.price),
    reorderLevel: parseWholeCount(values.reorderLevel) ?? -1,
    openingStock: parseWholeCount(values.openingStock) ?? -1,
    isActive: values.isActive,
  }
}

/**
 * The SKU the product would get now ("CEM-003"), for the preview line.
 * Null until a valid category is chosen or typed. The store assigns it again
 * at save, from the data at that moment.
 */
export function previewSku(
  categoryChoice: string,
  newCategory: string,
  products: Product[],
): string | null {
  const raw = resolveChoice(categoryChoice, newCategory)

  if (!validateCategory(raw).ok) {
    return null
  }

  return nextProductSku(matchExisting(raw, listCategories(products)), products)
}

/** The unit as the product will store it, for the "Opening stock (sack)" label. Blank until known. */
export function previewUnit(unitChoice: string, newUnit: string, products: Product[]): string {
  const raw = resolveChoice(unitChoice, newUnit)

  return validateUnit(raw).ok ? matchExisting(raw, listUnits(products)) : ''
}

// --------------------------------------------------------------- Edit Product

const editProductShape = z.object({
  name: z.string(),
  categoryChoice: z.string(),
  newCategory: z.string(),
  price: z.string(),
  reorderLevel: z.string(),
  isActive: z.boolean(),
})

export type EditProductValues = z.infer<typeof editProductShape>

/** The form starts from the product as saved; price as "631.00". */
export function editValuesFor(product: Product): EditProductValues {
  return {
    name: product.name,
    categoryChoice: product.category,
    newCategory: '',
    price: formatAmountInput(product.price),
    reorderLevel: String(product.reorderLevel),
    isActive: product.isActive,
  }
}

/** Same rules as Add Product; the product's own name is not a clash (spec s.5.5). */
export function makeEditProductSchema(productId: string, products: Product[]) {
  return editProductShape.superRefine((values, context) => {
    addIssues(
      [
        { path: 'name', result: validateProductName(values.name, products, productId) },
        categoryIssue(values.categoryChoice, values.newCategory),
        { path: 'price', result: validatePrice(priceFromText(values.price)) },
        { path: 'reorderLevel', result: checkCount(values.reorderLevel) },
      ],
      context,
    )
  })
}

/**
 * Only the fields that differ from the saved product. Never SKU, unit or
 * stock: the edit form has no field for them.
 */
export function toProductChanges(
  values: EditProductValues,
  product: Product,
  products: Product[],
): ProductChanges {
  const others = products.filter((candidate) => candidate.id !== product.id)
  const name = normalizeProductText(values.name)
  const category = matchExisting(
    resolveChoice(values.categoryChoice, values.newCategory),
    listCategories(others),
  )
  const price = priceFromText(values.price)
  const reorderLevel = parseWholeCount(values.reorderLevel) ?? -1
  const changes: ProductChanges = {}

  if (name !== product.name) changes.name = name
  if (category !== product.category) changes.category = category
  if (price !== product.price) changes.price = price
  if (reorderLevel !== product.reorderLevel) changes.reorderLevel = reorderLevel
  if (values.isActive !== product.isActive) changes.isActive = values.isActive

  return changes
}
