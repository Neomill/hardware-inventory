import { describe, expect, it } from 'vitest'

import { SEED_PRODUCTS } from '@/data/mock/catalog'
import type { Product } from '@/domain/types'
import {
  EMPTY_ADD_PRODUCT_VALUES,
  NEW_CHOICE,
  NEW_UNIT_LABEL,
  choiceOptions,
  editValuesFor,
  makeAddProductSchema,
  makeEditProductSchema,
  parseWholeCount,
  previewSku,
  previewUnit,
  resolveChoice,
  toNewProductInput,
  toProductChanges,
  type AddProductValues,
} from '@/features/products/lib/productForm'

const products = SEED_PRODUCTS

function fieldErrors(values: AddProductValues, catalogue: Product[] = products) {
  const result = makeAddProductSchema(catalogue).safeParse(values)

  return result.success ? {} : result.error.flatten().fieldErrors
}

const VALID: AddProductValues = {
  ...EMPTY_ADD_PRODUCT_VALUES,
  name: 'Garden Hose 10m',
  categoryChoice: NEW_CHOICE,
  newCategory: 'Garden',
  unitChoice: 'pcs',
  price: '150',
  reorderLevel: '5',
  openingStock: '12',
}

const pipe = products.find((product) => product.name.startsWith('PVC Pipe 1/2'))!

describe('choiceOptions and resolveChoice', () => {
  it('lists existing values then the New option', () => {
    expect(choiceOptions(['kg', 'pcs'], NEW_UNIT_LABEL)).toEqual([
      { value: 'kg', label: 'kg' },
      { value: 'pcs', label: 'pcs' },
      { value: NEW_CHOICE, label: 'New unit...' },
    ])
  })

  it('takes the typed text only when New is picked', () => {
    expect(resolveChoice('Cement', 'ignored')).toBe('Cement')
    expect(resolveChoice(NEW_CHOICE, 'Garden')).toBe('Garden')
  })
})

describe('parseWholeCount', () => {
  it('accepts whole numbers and refuses the rest', () => {
    expect(parseWholeCount(' 12 ')).toBe(12)
    expect(parseWholeCount('0')).toBe(0)
    expect(parseWholeCount('')).toBeNull()
    expect(parseWholeCount('2.5')).toBeNull()
    expect(parseWholeCount('-1')).toBeNull()
    expect(parseWholeCount('abc')).toBeNull()
    expect(parseWholeCount('99999999999999999999')).toBeNull()
  })
})

describe('makeAddProductSchema (F1)', () => {
  it('accepts a complete product', () => {
    expect(makeAddProductSchema(products).safeParse(VALID).success).toBe(true)
  })

  it('gives each blank field its spec message', () => {
    const errors = fieldErrors({ ...EMPTY_ADD_PRODUCT_VALUES, openingStock: '' })

    expect(errors.name).toEqual(['Enter the product name.'])
    expect(errors.categoryChoice).toEqual(['Choose or type a category.'])
    expect(errors.unitChoice).toEqual(['Choose or type a unit.'])
    expect(errors.price).toEqual(['Enter a price greater than zero.'])
    expect(errors.reorderLevel).toEqual(['Enter a whole number, 0 or more.'])
    expect(errors.openingStock).toEqual(['Enter a whole number, 0 or more.'])
  })

  it('refuses price text that is not an amount, and a zero price', () => {
    expect(fieldErrors({ ...VALID, price: 'abc' }).price).toEqual([
      'Enter a price greater than zero.',
    ])
    expect(fieldErrors({ ...VALID, price: '0' }).price).toEqual([
      'Enter a price greater than zero.',
    ])
    expect(fieldErrors({ ...VALID, price: '1.234' }).price).toBeDefined()
  })

  it('refuses fractional and negative counts', () => {
    const errors = fieldErrors({ ...VALID, reorderLevel: '-1', openingStock: '2.5' })

    expect(errors.reorderLevel).toEqual(['Enter a whole number, 0 or more.'])
    expect(errors.openingStock).toEqual(['Enter a whole number, 0 or more.'])
  })

  it('refuses a name already in the list, ignoring case', () => {
    expect(fieldErrors({ ...VALID, name: pipe.name.toLowerCase() }).name).toEqual([
      `${pipe.name.toLowerCase()} is already in the product list.`,
    ])
  })

  it('puts a typed category or unit error under the text input', () => {
    const errors = fieldErrors({
      ...VALID,
      newCategory: '123',
      unitChoice: NEW_CHOICE,
      newUnit: '  ',
    })

    expect(errors.newCategory).toEqual(['A category needs at least one letter.'])
    expect(errors.newUnit).toEqual(['Choose or type a unit.'])
    expect(errors.categoryChoice).toBeUndefined()
  })
})

describe('toNewProductInput', () => {
  it('parses price to centavos and counts to whole numbers', () => {
    expect(toNewProductInput({ ...VALID, price: '1,250.50' }, products)).toEqual({
      name: 'Garden Hose 10m',
      category: 'Garden',
      unit: 'pcs',
      price: 125050,
      reorderLevel: 5,
      openingStock: 12,
      isActive: true,
    })
  })

  it('uses the existing spelling of a typed category and unit', () => {
    const input = toNewProductInput(
      { ...VALID, newCategory: 'cement ', unitChoice: NEW_CHOICE, newUnit: 'SACK' },
      products,
    )

    expect(input.category).toBe('Cement')
    expect(input.unit).toBe('sack')
  })
})

describe('previewSku and previewUnit', () => {
  it('previews the SKU the store would assign', () => {
    expect(previewSku(NEW_CHOICE, 'Garden', products)).toBe('GAR-001')
    expect(previewSku(NEW_CHOICE, 'cement ', products)).toBe('CEM-003')
    expect(previewSku('Nails & Screws', '', products)).toBe('NAI-301')
  })

  it('is blank until a usable category is chosen', () => {
    expect(previewSku('', '', products)).toBeNull()
    expect(previewSku(NEW_CHOICE, '123', products)).toBeNull()
  })

  it('names the unit for the opening stock label', () => {
    expect(previewUnit('sack', '', products)).toBe('sack')
    expect(previewUnit(NEW_CHOICE, 'PCS', products)).toBe('pcs')
    expect(previewUnit('', '', products)).toBe('')
  })
})

describe('Edit Product', () => {
  it('starts from the saved product', () => {
    expect(editValuesFor(pipe)).toEqual({
      name: pipe.name,
      categoryChoice: pipe.category,
      newCategory: '',
      price: (pipe.price / 100).toFixed(2),
      reorderLevel: String(pipe.reorderLevel),
      isActive: pipe.isActive,
    })
  })

  it('lets a product keep its own name', () => {
    const schema = makeEditProductSchema(pipe.id, products)

    expect(schema.safeParse(editValuesFor(pipe)).success).toBe(true)
  })

  it("refuses another product's name and a zero price", () => {
    const other = products.find((product) => product.id !== pipe.id)!
    const result = makeEditProductSchema(pipe.id, products).safeParse({
      ...editValuesFor(pipe),
      name: other.name,
      price: '0',
    })

    expect(result.success).toBe(false)
    const errors = result.success ? {} : result.error.flatten().fieldErrors
    expect(errors.name).toEqual([`${other.name} is already in the product list.`])
    expect(errors.price).toEqual(['Enter a price greater than zero.'])
  })

  it('sends only the fields that changed', () => {
    expect(toProductChanges(editValuesFor(pipe), pipe, products)).toEqual({})

    const changes = toProductChanges(
      { ...editValuesFor(pipe), price: '999.99', isActive: !pipe.isActive },
      pipe,
      products,
    )

    expect(changes).toEqual({ price: 99999, isActive: !pipe.isActive })
    expect(changes).not.toHaveProperty('unit')
    expect(changes).not.toHaveProperty('sku')
    expect(changes).not.toHaveProperty('stock')
  })

  it('matches a typed category to its existing spelling', () => {
    const changes = toProductChanges(
      { ...editValuesFor(pipe), categoryChoice: NEW_CHOICE, newCategory: 'cement' },
      pipe,
      products,
    )

    expect(changes).toEqual({ category: 'Cement' })
  })
})
