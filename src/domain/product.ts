import { nextSequentialId } from '@/domain/ids'
import type { Centavos } from '@/domain/money'
import type { Product, ValidationResult } from '@/domain/types'

/**
 * Adding and editing products (spec 04 add product, D9). The SKU is generated,
 * never typed; opening stock is a movement (buildOpeningStockMovement).
 */

export const PRODUCT_NAME_MAX = 80
export const CATEGORY_MAX = 40
export const UNIT_MAX = 20

/** What Add Product asks for. Price is integer centavos; counts are whole units (D2). */
export type NewProductInput = {
  name: string
  category: string
  unit: string
  price: Centavos
  reorderLevel: number
  openingStock: number
  isActive: boolean
}

/** The fields Product Details may edit. Never SKU, unit or stock (spec s.5.5). */
export type ProductChanges = Partial<
  Pick<Product, 'name' | 'category' | 'price' | 'reorderLevel' | 'isActive'>
>

const OK: ValidationResult = { ok: true, message: null }

function fail(message: string): ValidationResult {
  return { ok: false, message }
}

/** Trims and collapses repeated spaces. */
export function normalizeProductText(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** An existing value matching ignoring case ("plumbing" -> "Plumbing"), else the normalized input. */
export function matchExisting(raw: string, existing: string[]): string {
  const value = normalizeProductText(raw)
  const key = value.toLowerCase()

  return (
    existing.find((candidate) => normalizeProductText(candidate).toLowerCase() === key) ?? value
  )
}

/** Distinct categories in use, A to Z, for the category select. */
export function listCategories(products: Product[]): string[] {
  return distinctSorted(products.map((product) => product.category))
}

/** Distinct units in use, A to Z, for the unit select. */
export function listUnits(products: Product[]): string[] {
  return distinctSorted(products.map((product) => product.unit))
}

function distinctSorted(values: string[]): string[] {
  const seen = new Map<string, string>()

  for (const value of values) {
    const normalized = normalizeProductText(value)
    const key = normalized.toLowerCase()

    if (normalized !== '' && !seen.has(key)) {
      seen.set(key, normalized)
    }
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

/** "Nails & Screws" -> "NAI". Up to three letters A-Z of the category. Null when it has none. */
export function skuPrefixForCategory(category: string): string | null {
  const letters = category
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)

  return letters === '' ? null : letters
}

/**
 * The next free SKU for the category (spec s.5.2): its prefix, a dash and one
 * more than the highest number already used with that prefix, three digits
 * ("CEM-003"). Checks every product's SKU and id, so categories that share a
 * prefix share one sequence. Null when the category has no letter.
 */
export function nextProductSku(category: string, products: Product[]): string | null {
  const prefix = skuPrefixForCategory(category)

  if (prefix === null) {
    return null
  }

  const taken = products.flatMap((product) => [product.sku.toUpperCase(), product.id.toUpperCase()])

  return nextSequentialId(`${prefix}-`, taken, 3)
}

/** Name rule: 1 to PRODUCT_NAME_MAX, not another product's name ignoring case. */
export function validateProductName(
  raw: string,
  products: Product[],
  excludeProductId?: string,
): ValidationResult {
  const name = normalizeProductText(raw)

  if (name === '') {
    return fail('Enter the product name.')
  }

  if (name.length > PRODUCT_NAME_MAX) {
    return fail(`Keep the name under ${PRODUCT_NAME_MAX} characters.`)
  }

  const key = name.toLowerCase()
  const clash = products.find(
    (product) =>
      product.id !== excludeProductId && normalizeProductText(product.name).toLowerCase() === key,
  )

  return clash ? fail(`${name} is already in the product list.`) : OK
}

/** Category rule: 1 to CATEGORY_MAX, at least one letter (the SKU prefix needs it). */
export function validateCategory(raw: string): ValidationResult {
  const category = normalizeProductText(raw)

  if (category === '') {
    return fail('Choose or type a category.')
  }

  if (category.length > CATEGORY_MAX) {
    return fail(`Keep the category under ${CATEGORY_MAX} characters.`)
  }

  return skuPrefixForCategory(category) === null
    ? fail('A category needs at least one letter.')
    : OK
}

/** Unit rule: 1 to UNIT_MAX. One unit per product (D2). */
export function validateUnit(raw: string): ValidationResult {
  const unit = normalizeProductText(raw)

  if (unit === '') {
    return fail('Choose or type a unit.')
  }

  return unit.length > UNIT_MAX ? fail(`Keep the unit under ${UNIT_MAX} characters.`) : OK
}

/** Every product has exactly one selling price, in whole centavos, more than zero. */
export function validatePrice(price: Centavos): ValidationResult {
  return Number.isSafeInteger(price) && price > 0 ? OK : fail('Enter a price greater than zero.')
}

/** Reorder At and opening stock: a whole number, zero or more. */
export function validateWholeCount(value: number): ValidationResult {
  return Number.isSafeInteger(value) && value >= 0 ? OK : fail('Enter a whole number, 0 or more.')
}

function firstFailure(results: ValidationResult[]): ValidationResult {
  return results.find((result) => !result.ok) ?? OK
}

/** Every Add Product rule (spec s.5.1), first failure wins, in form order. */
export function validateNewProduct(input: NewProductInput, products: Product[]): ValidationResult {
  return firstFailure([
    validateProductName(input.name, products),
    validateCategory(input.category),
    validateUnit(input.unit),
    validatePrice(input.price),
    validateWholeCount(input.reorderLevel),
    validateWholeCount(input.openingStock),
    typeof input.isActive === 'boolean' ? OK : fail('Choose whether the product is for sale.'),
  ])
}

/**
 * Only the fields present are checked, with the same rules as Add Product.
 * The product's own name does not count as a clash.
 */
export function validateProductChanges(
  productId: string,
  changes: ProductChanges,
  products: Product[],
): ValidationResult {
  return firstFailure([
    changes.name === undefined ? OK : validateProductName(changes.name, products, productId),
    changes.category === undefined ? OK : validateCategory(changes.category),
    changes.price === undefined ? OK : validatePrice(changes.price),
    changes.reorderLevel === undefined ? OK : validateWholeCount(changes.reorderLevel),
    changes.isActive === undefined || typeof changes.isActive === 'boolean'
      ? OK
      : fail('Choose whether the product is for sale.'),
  ])
}

/**
 * The product a valid Add Product input becomes: text normalized, category and
 * unit matched to existing spellings, SKU assigned, `id` equal to the SKU and
 * stock equal to the opening stock (its movement is written beside it).
 * Null when the input is not valid.
 */
export function buildNewProduct(input: NewProductInput, products: Product[]): Product | null {
  if (!validateNewProduct(input, products).ok) {
    return null
  }

  const category = matchExisting(input.category, listCategories(products))
  const sku = nextProductSku(category, products)

  if (sku === null) {
    return null
  }

  return {
    id: sku,
    name: normalizeProductText(input.name),
    sku,
    category,
    unit: matchExisting(input.unit, listUnits(products)),
    price: input.price,
    stock: input.openingStock,
    reorderLevel: input.reorderLevel,
    isActive: input.isActive,
  }
}

/**
 * The product after a valid edit: only the editable fields, text normalized,
 * category matched to an existing spelling. SKU, unit and stock never change.
 */
export function applyProductChanges(
  product: Product,
  changes: ProductChanges,
  products: Product[],
): Product {
  const others = products.filter((candidate) => candidate.id !== product.id)

  return {
    ...product,
    ...(changes.name === undefined ? {} : { name: normalizeProductText(changes.name) }),
    ...(changes.category === undefined
      ? {}
      : { category: matchExisting(changes.category, listCategories(others)) }),
    ...(changes.price === undefined ? {} : { price: changes.price }),
    ...(changes.reorderLevel === undefined ? {} : { reorderLevel: changes.reorderLevel }),
    ...(changes.isActive === undefined ? {} : { isActive: changes.isActive }),
  }
}
