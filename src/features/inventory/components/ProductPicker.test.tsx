import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ProductPicker } from '@/features/inventory/components/ProductPicker'
import { STOCK_STATUS_LABELS } from '@/domain/stock'
import type { Product } from '@/domain/types'

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

const IN_STOCK = product({ id: 'PVC-050', name: 'PVC Pipe', stock: 1500, unit: 'pcs' })
const LOW = product({ id: 'CEM-001', name: 'Cement', stock: 8, unit: 'bags' })
const OUT = product({ id: 'DK-001', name: 'Door Knob', stock: 0 })
const CATALOGUE = [IN_STOCK, LOW, OUT]

/** Server HTML with React's text-node separators removed, so "8 bags" reads as one string. */
function render(selected: Product | null = null): string {
  return renderToString(
    <ProductPicker products={CATALOGUE} selected={selected} onSelect={() => undefined} />,
  ).replace(/<!-- -->/g, '')
}

describe('ProductPicker', () => {
  it('shows each result with its stock count, unit and status', () => {
    const html = render()

    expect(html).toContain('1,500 pcs')
    expect(html).toContain('8 bags')
    expect(html).toContain('0 pcs')
    // Status is in the text itself, never only in a hover tooltip.
    expect(html).toContain(STOCK_STATUS_LABELS.in_stock)
    expect(html).toContain(STOCK_STATUS_LABELS.low_stock)
    expect(html).toContain(STOCK_STATUS_LABELS.out_of_stock)
    expect(html).not.toContain('title=')
  })

  it('shows the stock on hand and status of the selected product', () => {
    const html = render(LOW)

    expect(html).toContain('Change product. Selected: Cement')
    expect(html).toContain('On hand')
    expect(html).toContain('8 bags')
    expect(html).toContain(STOCK_STATUS_LABELS.low_stock)
    expect(html).not.toContain('Matching products')
  })
})
