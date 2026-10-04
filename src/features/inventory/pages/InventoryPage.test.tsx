import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { InventoryPage } from '@/features/inventory/pages/InventoryPage'

function renderAt(path: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/receive" element={<InventoryPage />} />
        <Route path="/inventory/movements" element={<InventoryPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InventoryPage', () => {
  it('shows current inventory with summary stats at /inventory', () => {
    const html = renderAt('/inventory')

    expect(html).toContain('Current Inventory')
    expect(html).toContain('SKUs')
    expect(html).toContain('Out of Stock')
    // Out of stock rows lead the list.
    expect(html).toContain('Door Knob (Stainless)')
  })

  it('shows the receive form, preselecting a product from the link', () => {
    const html = renderAt('/inventory/receive?product=CEM-001')

    expect(html).toContain('Quantity received (sack)')
    expect(html).toContain('Cement (Holcim)')
    expect(html).toContain('Change')
  })

  it('ignores an unknown product id and shows the picker', () => {
    const html = renderAt('/inventory/receive?product=NOPE')

    expect(html).toContain('Search for the delivered product')
  })

  it('shows the movement log with its filters', () => {
    const html = renderAt('/inventory/movements')

    expect(html).toContain('Stock Movements')
    expect(html).toContain('Last 30 days')
    expect(html).toContain('All Types')
  })

  it('narrows the log to one product from a link, across all time', () => {
    const html = renderAt('/inventory/movements?product=PVC-050')

    expect(html).toContain('Received')
    expect(html).toContain('PVC Pipe 1/2&quot;')
  })
})
