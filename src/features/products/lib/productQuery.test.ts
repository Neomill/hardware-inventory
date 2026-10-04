import { describe, expect, it } from 'vitest'

import { SEED_PRODUCTS as PRODUCTS } from '@/data/mock/catalog'
import {
  ALL,
  EMPTY_FILTERS,
  STOCK_FILTER_OPTIONS,
  filterProducts,
  matchesStockFilter,
  parseStockFilter,
  summarise,
} from '@/features/products/lib/productQuery'
import { deriveStockStatus } from '@/domain/stock'

describe('deriveStockStatus', () => {
  it('reports zero and negative stock as out of stock', () => {
    expect(deriveStockStatus(0, 10)).toBe('out_of_stock')
    expect(deriveStockStatus(-3, 10)).toBe('out_of_stock')
  })

  it('treats stock at the reorder level as low, not in stock', () => {
    expect(deriveStockStatus(10, 10)).toBe('low_stock')
    expect(deriveStockStatus(11, 10)).toBe('in_stock')
  })
})

describe('catalogue', () => {
  it('reproduces the badges the design shows for page one', () => {
    const expected: Record<string, string> = {
      'PVC-050': 'in_stock',
      'CEM-001': 'low_stock',
      'NAI-200': 'low_stock',
      'GI-100': 'in_stock',
      'SP-120': 'low_stock',
      'PNT-701': 'low_stock',
      'WIR-020': 'in_stock',
      'PVCE-050': 'in_stock',
      'DK-001': 'out_of_stock',
      'THN-001': 'low_stock',
    }

    for (const product of PRODUCTS.slice(0, 10)) {
      expect(deriveStockStatus(product.stock, product.reorderLevel)).toBe(expected[product.sku])
    }
  })

  it('uses unique SKUs', () => {
    expect(new Set(PRODUCTS.map((product) => product.sku)).size).toBe(PRODUCTS.length)
  })
})

describe('summarise', () => {
  it('counts low and out of stock separately', () => {
    const summary = summarise(PRODUCTS)

    expect(summary.totalProducts).toBe(PRODUCTS.length)
    expect(summary.lowStockCount).toBe(12)
    expect(summary.outOfStockCount).toBe(3)
  })

  it('values stock at price times quantity on hand', () => {
    const summary = summarise([
      {
        id: 'a',
        name: 'A',
        sku: 'A',
        category: 'c',
        unit: 'pcs',
        price: 1000,
        stock: 3,
        reorderLevel: 1,
        isActive: true,
      },
      {
        id: 'b',
        name: 'B',
        sku: 'B',
        category: 'c',
        unit: 'pcs',
        price: 250,
        stock: 4,
        reorderLevel: 1,
        isActive: true,
      },
    ])

    expect(summary.totalStockValue).toBe(4000)
  })
})

describe('filterProducts', () => {
  it('matches name and SKU, case-insensitively', () => {
    expect(filterProducts(PRODUCTS, { ...EMPTY_FILTERS, search: 'holcim' })).toHaveLength(1)
    expect(filterProducts(PRODUCTS, { ...EMPTY_FILTERS, search: 'pvc-0' })).toHaveLength(2)
  })

  it('combines filters', () => {
    const result = filterProducts(PRODUCTS, {
      ...EMPTY_FILTERS,
      category: 'Plumbing',
      stockStatus: 'out_of_stock',
    })

    expect(result.map((product) => product.sku)).toEqual(['PVC-200'])
  })

  it('returns everything when nothing is selected', () => {
    expect(filterProducts(PRODUCTS, EMPTY_FILTERS)).toHaveLength(PRODUCTS.length)
    expect(EMPTY_FILTERS.category).toBe(ALL)
  })
})

describe('parseStockFilter', () => {
  it('accepts every filter a link can carry', () => {
    expect(parseStockFilter('in_stock')).toBe('in_stock')
    expect(parseStockFilter('low_stock')).toBe('low_stock')
    expect(parseStockFilter('out_of_stock')).toBe('out_of_stock')
    expect(parseStockFilter('restock')).toBe('restock')
  })

  it('falls back to no filter for missing or unknown values', () => {
    expect(parseStockFilter(null)).toBe(ALL)
    expect(parseStockFilter(undefined)).toBe(ALL)
    expect(parseStockFilter('')).toBe(ALL)
    expect(parseStockFilter('LOW_STOCK')).toBe(ALL)
    expect(parseStockFilter('bogus')).toBe(ALL)
  })
})

describe('stock filter', () => {
  const at = (stock: number, reorderLevel = 10) => ({
    id: String(stock),
    name: 'X',
    sku: 'X',
    category: 'c',
    unit: 'pcs',
    price: 100,
    stock,
    reorderLevel,
    isActive: true,
  })

  it('treats restock as low or out of stock, i.e. stock at or under the reorder level', () => {
    expect(matchesStockFilter(at(0), 'restock')).toBe(true)
    expect(matchesStockFilter(at(10), 'restock')).toBe(true)
    expect(matchesStockFilter(at(11), 'restock')).toBe(false)
  })

  it('matches single statuses exactly', () => {
    expect(matchesStockFilter(at(0), 'out_of_stock')).toBe(true)
    expect(matchesStockFilter(at(0), 'low_stock')).toBe(false)
    expect(matchesStockFilter(at(5), 'low_stock')).toBe(true)
    expect(matchesStockFilter(at(50), 'in_stock')).toBe(true)
    expect(matchesStockFilter(at(50), ALL)).toBe(true)
  })

  it('restock returns the union of low and out of stock', () => {
    const count = (stockStatus: Parameters<typeof matchesStockFilter>[1]) =>
      filterProducts(PRODUCTS, { ...EMPTY_FILTERS, stockStatus }).length

    expect(count('restock')).toBe(count('low_stock') + count('out_of_stock'))
    expect(count('restock') + count('in_stock')).toBe(PRODUCTS.length)
  })

  it('offers a labelled option for every filter, restock included', () => {
    expect(STOCK_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      'in_stock',
      'low_stock',
      'out_of_stock',
      'restock',
    ])
    expect(STOCK_FILTER_OPTIONS.find((option) => option.value === 'restock')?.label).toBe(
      'Needs restocking',
    )
  })
})
