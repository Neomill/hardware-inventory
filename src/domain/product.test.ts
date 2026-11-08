import { describe, expect, it } from 'vitest'

import { SEED_PRODUCTS } from '@/data/mock/catalog'
import {
  applyProductChanges,
  buildNewProduct,
  listCategories,
  listUnits,
  matchExisting,
  nextProductSku,
  normalizeProductText,
  skuPrefixForCategory,
  validateCategory,
  validateNewProduct,
  validatePrice,
  validateProductChanges,
  validateProductName,
  validateUnit,
  validateWholeCount,
  type NewProductInput,
} from '@/domain/product'
import type { Product } from '@/domain/types'

const valid: NewProductInput = {
  name: 'Garden Hose 10m',
  category: 'Garden',
  unit: 'pcs',
  price: 15000,
  reorderLevel: 5,
  openingStock: 12,
  isActive: true,
}

function product(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    name: overrides.id,
    sku: overrides.id,
    category: 'Tools',
    unit: 'pcs',
    price: 100,
    stock: 0,
    reorderLevel: 0,
    isActive: true,
    ...overrides,
  }
}

describe('normalizeProductText and matchExisting', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeProductText('  PVC   Pipe  ')).toBe('PVC Pipe')
  })

  it('uses the existing spelling ignoring case (U6)', () => {
    expect(matchExisting('cement ', ['Cement'])).toBe('Cement')
    expect(matchExisting('  Garden   tools', ['Cement'])).toBe('Garden tools')
  })
})

describe('listCategories and listUnits', () => {
  it('lists distinct values A to Z', () => {
    const products = [
      product({ id: 'A', category: 'Tools', unit: 'pcs' }),
      product({ id: 'B', category: 'cement', unit: 'sack' }),
      product({ id: 'C', category: 'Cement', unit: 'pcs' }),
      product({ id: 'D', category: ' ', unit: 'kg' }),
    ]

    expect(listCategories(products)).toEqual(['cement', 'Tools'])
    expect(listUnits(products)).toEqual(['kg', 'pcs', 'sack'])
  })
})

describe('skuPrefixForCategory (U1)', () => {
  it('takes up to three letters A to Z, upper-cased', () => {
    expect(skuPrefixForCategory('Cement')).toBe('CEM')
    expect(skuPrefixForCategory('Nails & Screws')).toBe('NAI')
    expect(skuPrefixForCategory('GI')).toBe('GI')
    expect(skuPrefixForCategory('a 1 b')).toBe('AB')
  })

  it('is null without a letter', () => {
    expect(skuPrefixForCategory('123')).toBeNull()
    expect(skuPrefixForCategory('')).toBeNull()
  })
})

describe('nextProductSku', () => {
  it('continues the seed catalogue (U2, U3)', () => {
    expect(nextProductSku('Cement', SEED_PRODUCTS)).toBe('CEM-003')
    expect(nextProductSku('Nails & Screws', SEED_PRODUCTS)).toBe('NAI-301')
  })

  it('starts a new category at 001 (U4)', () => {
    expect(nextProductSku('Garden', SEED_PRODUCTS)).toBe('GAR-001')
    expect(nextProductSku('Plumbing', SEED_PRODUCTS)).toBe('PLU-001')
  })

  it('checks ids as well as SKUs (U5)', () => {
    expect(nextProductSku('Garden', [product({ id: 'GAR-001', sku: 'X-1' })])).toBe('GAR-002')
  })

  it('does not mistake a longer prefix for its own', () => {
    expect(nextProductSku('PVC things', [product({ id: 'PVCE-050' })])).toBe('PVC-001')
  })

  it('shares one sequence between categories with the same prefix', () => {
    const products = [product({ id: 'PAI-001', category: 'Paints' })]

    expect(nextProductSku('Paint Sundries', products)).toBe('PAI-002')
  })

  it('grows past 999 and is null without a letter', () => {
    expect(nextProductSku('Garden', [product({ id: 'GAR-999' })])).toBe('GAR-1000')
    expect(nextProductSku('123', SEED_PRODUCTS)).toBeNull()
  })
})

describe('field rules', () => {
  it('name: required, limited, unique ignoring case (U7)', () => {
    expect(validateProductName('  ', SEED_PRODUCTS).message).toBe('Enter the product name.')
    expect(validateProductName('x'.repeat(81), SEED_PRODUCTS).message).toBe(
      'Keep the name under 80 characters.',
    )
    expect(validateProductName('x'.repeat(80), SEED_PRODUCTS).ok).toBe(true)
    expect(validateProductName('pvc pipe 1/2"', SEED_PRODUCTS).message).toBe(
      'pvc pipe 1/2" is already in the product list.',
    )
    expect(validateProductName('PVC Pipe 1/2"', SEED_PRODUCTS, 'PVC-050').ok).toBe(true)
  })

  it('category: required, limited, needs a letter', () => {
    expect(validateCategory('').message).toBe('Choose or type a category.')
    expect(validateCategory('x'.repeat(41)).message).toBe('Keep the category under 40 characters.')
    expect(validateCategory('123').message).toBe('A category needs at least one letter.')
    expect(validateCategory('Garden').ok).toBe(true)
  })

  it('unit: required and limited', () => {
    expect(validateUnit(' ').message).toBe('Choose or type a unit.')
    expect(validateUnit('x'.repeat(21)).message).toBe('Keep the unit under 20 characters.')
    expect(validateUnit('sack').ok).toBe(true)
  })

  it('price: whole centavos more than zero', () => {
    for (const price of [0, -100, 10.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(validatePrice(price).message).toBe('Enter a price greater than zero.')
    }
    expect(validatePrice(1).ok).toBe(true)
  })

  it('counts: whole, zero or more', () => {
    for (const value of [-1, 2.5, Number.NaN]) {
      expect(validateWholeCount(value).message).toBe('Enter a whole number, 0 or more.')
    }
    expect(validateWholeCount(0).ok).toBe(true)
  })
})

describe('validateNewProduct (U8)', () => {
  it('accepts a valid product', () => {
    expect(validateNewProduct(valid, SEED_PRODUCTS)).toEqual({ ok: true, message: null })
  })

  it('refuses price 0, reorder -1, opening 2.5 and a bad active flag', () => {
    expect(validateNewProduct({ ...valid, price: 0 }, SEED_PRODUCTS).ok).toBe(false)
    expect(validateNewProduct({ ...valid, reorderLevel: -1 }, SEED_PRODUCTS).ok).toBe(false)
    expect(validateNewProduct({ ...valid, openingStock: 2.5 }, SEED_PRODUCTS).ok).toBe(false)
    expect(
      validateNewProduct({ ...valid, isActive: 'yes' as unknown as boolean }, SEED_PRODUCTS)
        .message,
    ).toBe('Choose whether the product is for sale.')
  })

  it('reports the first failure in form order', () => {
    expect(validateNewProduct({ ...valid, name: '', price: 0 }, SEED_PRODUCTS).message).toBe(
      'Enter the product name.',
    )
  })
})

describe('buildNewProduct', () => {
  it('normalizes text, matches spellings and assigns the SKU as the id', () => {
    const built = buildNewProduct(
      { ...valid, name: '  Holcim   Premium ', category: 'cement ', unit: 'SACK' },
      SEED_PRODUCTS,
    )

    expect(built).toEqual({
      id: 'CEM-003',
      sku: 'CEM-003',
      name: 'Holcim Premium',
      category: 'Cement',
      unit: 'sack',
      price: 15000,
      stock: 12,
      reorderLevel: 5,
      isActive: true,
    })
  })

  it('is null for invalid input', () => {
    expect(buildNewProduct({ ...valid, category: '42' }, SEED_PRODUCTS)).toBeNull()
  })
})

describe('validateProductChanges and applyProductChanges', () => {
  const pvc = SEED_PRODUCTS.find((candidate) => candidate.id === 'PVC-050') as Product

  it('checks only the fields given', () => {
    expect(validateProductChanges(pvc.id, {}, SEED_PRODUCTS).ok).toBe(true)
    expect(validateProductChanges(pvc.id, { price: 0 }, SEED_PRODUCTS).ok).toBe(false)
    expect(validateProductChanges(pvc.id, { reorderLevel: -1 }, SEED_PRODUCTS).ok).toBe(false)
    expect(validateProductChanges(pvc.id, { category: '!!' }, SEED_PRODUCTS).ok).toBe(false)
    expect(validateProductChanges(pvc.id, { name: pvc.name.toUpperCase() }, SEED_PRODUCTS).ok).toBe(
      true,
    )
    expect(validateProductChanges(pvc.id, { name: 'Cement (Holcim)' }, SEED_PRODUCTS).message).toBe(
      'Cement (Holcim) is already in the product list.',
    )
    expect(
      validateProductChanges(pvc.id, { isActive: 1 as unknown as boolean }, SEED_PRODUCTS).ok,
    ).toBe(false)
  })

  it('changes only the editable fields, never SKU, unit or stock', () => {
    const changes = {
      name: ' PVC  Pipe ',
      category: 'cement',
      price: 3000,
      reorderLevel: 9,
      isActive: false,
      sku: 'HACK',
      unit: 'kg',
      stock: 999,
    }

    expect(applyProductChanges(pvc, changes, SEED_PRODUCTS)).toEqual({
      ...pvc,
      name: 'PVC Pipe',
      category: 'Cement',
      price: 3000,
      reorderLevel: 9,
      isActive: false,
    })
    expect(applyProductChanges(pvc, {}, SEED_PRODUCTS)).toEqual(pvc)
  })
})
