import { describe, expect, it } from 'vitest'

import type { Product } from '@/domain/types'
import {
  ALL,
  EMPTY_INVENTORY_FILTERS,
  distinctCategories,
  filterInventory,
  isInventoryFiltered,
  searchProducts,
  summarizeInventory,
} from '@/features/inventory/lib/inventoryQuery'

function product(overrides: Partial<Product> & { id: string }): Product {
  return {
    name: `Product ${overrides.id}`,
    sku: overrides.id,
    category: 'Hardware',
    unit: 'pcs',
    price: 1000,
    stock: 50,
    reorderLevel: 10,
    isActive: true,
    ...overrides,
  }
}

const CATALOGUE: Product[] = [
  product({ id: 'PVC-050', name: 'PVC Pipe 1/2"', category: 'Plumbing', stock: 150 }),
  product({ id: 'CEM-001', name: 'Cement (Holcim)', category: 'Cement', stock: 8 }),
  product({ id: 'DK-001', name: 'Door Knob', stock: 0 }),
  product({ id: 'ABC-001', name: 'Anchor Bolt', stock: 10 }),
  product({ id: 'OLD-001', name: 'Old Item', stock: 0, isActive: false }),
]

describe('filterInventory', () => {
  it('lists out of stock first, then low, then in stock, alphabetical within each', () => {
    const names = filterInventory(CATALOGUE, EMPTY_INVENTORY_FILTERS).map((p) => p.name)

    expect(names).toEqual([
      'Door Knob',
      'Old Item',
      'Anchor Bolt',
      'Cement (Holcim)',
      'PVC Pipe 1/2"',
    ])
  })

  it('searches name and SKU, ignoring case and spaces', () => {
    expect(
      filterInventory(CATALOGUE, { ...EMPTY_INVENTORY_FILTERS, search: '  cem ' }).map((p) => p.id),
    ).toEqual(['CEM-001'])
    expect(
      filterInventory(CATALOGUE, { ...EMPTY_INVENTORY_FILTERS, search: 'pvc-050' }).map(
        (p) => p.id,
      ),
    ).toEqual(['PVC-050'])
  })

  it('filters by derived stock status and category', () => {
    const low = filterInventory(CATALOGUE, { ...EMPTY_INVENTORY_FILTERS, stockStatus: 'low_stock' })
    expect(low.map((p) => p.id)).toEqual(['ABC-001', 'CEM-001'])

    const plumbing = filterInventory(CATALOGUE, {
      ...EMPTY_INVENTORY_FILTERS,
      category: 'Plumbing',
    })
    expect(plumbing.map((p) => p.id)).toEqual(['PVC-050'])
  })
})

describe('summarizeInventory', () => {
  it('counts active products only', () => {
    expect(summarizeInventory(CATALOGUE)).toEqual({
      skuCount: 4,
      lowStockCount: 2,
      outOfStockCount: 1,
    })
  })
})

describe('isInventoryFiltered', () => {
  it('ignores a blank search', () => {
    expect(isInventoryFiltered({ ...EMPTY_INVENTORY_FILTERS, search: '   ' })).toBe(false)
    expect(isInventoryFiltered({ ...EMPTY_INVENTORY_FILTERS, category: 'Cement' })).toBe(true)
    expect(isInventoryFiltered({ ...EMPTY_INVENTORY_FILTERS, stockStatus: ALL })).toBe(false)
  })
})

describe('distinctCategories', () => {
  it('is sorted and de-duplicated', () => {
    expect(distinctCategories(CATALOGUE)).toEqual(['Cement', 'Hardware', 'Plumbing'])
  })
})

describe('searchProducts', () => {
  it('returns alphabetical matches up to the limit', () => {
    expect(searchProducts(CATALOGUE, '', 2).map((p) => p.name)).toEqual([
      'Anchor Bolt',
      'Cement (Holcim)',
    ])
    expect(searchProducts(CATALOGUE, 'knob', 5).map((p) => p.id)).toEqual(['DK-001'])
  })
})
