import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/app/routes'
import { useShopStore } from '@/stores/useShopStore'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'

function renderAt(path: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/receive" element={<InventoryPage />} />
        <Route path="/inventory/movements" element={<InventoryPage />} />
        <Route path={ROUTES.invoices} element={<InventoryPage />} />
        <Route path={ROUTES.patterns.invoiceDetail} element={<InventoryPage />} />
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

  it('has four tabs, Invoices last', () => {
    const html = renderAt('/inventory')

    expect(html).toContain('Receive Stock')
    expect(html).toContain('Stock Movements')
    expect(html).toContain(`href="${ROUTES.invoices}"`)
  })

  it('shows the invoice form with no lines by default', () => {
    const html = renderAt('/inventory/receive')

    expect(html).toContain('Record a delivery from its supplier invoice.')
    expect(html).toContain('Invoice number')
    expect(html).toContain('Supplier')
    expect(html).toContain('Invoice date')
    expect(html).toContain('Invoice total (PHP)')
    expect(html).toContain('Add to invoice')
    expect(html).toContain('0 products, 0 units')
    expect(html).not.toContain('Products on this invoice')
  })

  it('makes a linked product the first line of the invoice', () => {
    const html = renderAt('/inventory/receive?product=CEM-001')

    expect(html).toContain('Products on this invoice')
    expect(html).toContain('Cement (Holcim)')
    expect(html).toContain('Remove Cement (Holcim)')
    expect(html).toContain('1 product, 0 units')
  })

  it('ignores an unknown product id and opens with no lines', () => {
    const html = renderAt('/inventory/receive?product=NOPE')

    expect(html).toContain('Search for the delivered product')
    expect(html).not.toContain('Products on this invoice')
  })

  it('suggests suppliers from saved invoices', () => {
    const html = renderAt('/inventory/receive')
    const [first] = useShopStore.getState().invoices

    expect(html).toContain('<datalist')
    expect(html).toContain(`value="${first.supplier}"`)
  })

  it('lists every saved invoice with links to its page', () => {
    const html = renderAt(ROUTES.invoices)
    const { invoices } = useShopStore.getState()

    expect(invoices.length).toBeGreaterThan(0)
    expect(html).toContain('Supplier Invoices')
    expect(html).toContain('Search invoices')

    for (const invoice of invoices) {
      expect(html).toContain(`href="${ROUTES.invoiceDetail(invoice.invoiceNumber)}"`)
    }
  })

  it("shows an invoice's details and lines", () => {
    const [invoice] = useShopStore.getState().invoices
    const html = renderAt(ROUTES.invoiceDetail(invoice.invoiceNumber))

    expect(html).toContain(invoice.invoiceNumber)
    expect(html).toContain(invoice.supplier)
    expect(html).toContain(invoice.receivedBy)
    expect(html).toContain('Products received')

    for (const line of invoice.lines) {
      expect(html).toContain(`href="${ROUTES.productDetail(line.productId)}"`)
      expect(html).toContain(line.sku)
    }
  })

  it('gives phones a card per invoice and per line instead of a sideways-scrolling table', () => {
    const [invoice] = useShopStore.getState().invoices
    const list = renderAt(ROUTES.invoices)
    const detail = renderAt(ROUTES.invoiceDetail(invoice.invoiceNumber))

    expect(list).toContain('aria-label="Supplier invoices"')
    expect(list).toMatch(/class="hidden [^"]*md:block"/)
    expect(detail).toContain('aria-label="Products received"')
    expect(detail).toMatch(/class="hidden [^"]*md:block"/)
  })

  it('says when an invoice is not on this device', () => {
    const html = renderAt(ROUTES.invoiceDetail('INV-99999'))

    expect(html).toContain('Invoice not found')
    expect(html).toContain('removed by a demo data reset')
    expect(html).toContain('Back to Invoices')
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

  it('links a saved invoice number in the movement log to its page', () => {
    const invoice = useShopStore
      .getState()
      .invoices.find((candidate) => candidate.lines.some((line) => line.productId === 'PVC-050'))

    expect(invoice).toBeDefined()

    const html = renderAt('/inventory/movements?product=PVC-050')

    expect(html).toContain(`href="${ROUTES.invoiceDetail(invoice?.invoiceNumber ?? '')}"`)
  })
})
