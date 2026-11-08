import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/app/routes'
import { formatCurrency, formatNumber } from '@/lib/format'
import { ProductHeaderCard } from '@/features/products/components/ProductHeaderCard'
import { ProductListCard } from '@/features/products/components/ProductListCard'
import { ProductSalesCard } from '@/features/products/components/ProductSalesCard'
import { NewProductPage } from '@/features/products/pages/NewProductPage'
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage'
import { useShopStore } from '@/stores/useShopStore'

function renderAt(path: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={ROUTES.newProduct} element={<NewProductPage />} />
        <Route path={ROUTES.patterns.productDetail} element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

describe('NewProductPage', () => {
  it('shows the form in spec order with opening stock defaulting to 0', () => {
    const html = renderAt(ROUTES.newProduct)
    const order = [
      'Product name',
      'Category',
      'Unit',
      'Price',
      'Reorder At',
      'Opening stock',
      'Available for sale',
    ].map((label) => html.indexOf(label))

    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(html).toContain('New category...')
    expect(html).toContain('New unit...')
    expect(html).toContain('Add Product')
    expect(html).toContain('Cancel')
    // No SKU field to type in; the preview is blank until a category is chosen.
    expect(html).not.toContain('SKU:')
  })
})

describe('ProductDetailPage', () => {
  it('shows the not found state for an unknown id', () => {
    const html = renderAt(ROUTES.productDetail('NOPE'))

    expect(html).toContain('Product not found')
    expect(html).toContain('Back to Products')
  })

  it("shows a seeded product's facts, stock and history from store data", () => {
    const product = useShopStore.getState().products[0]
    const html = renderAt(ROUTES.productDetail(product.id))

    expect(html).toContain(escapeHtml(product.name))
    expect(html).toContain(product.sku)
    expect(html).toContain(escapeHtml(formatCurrency(product.price)))
    expect(html).toContain(formatNumber(product.stock))
    expect(html).toContain('Current Stock')
    expect(html).toContain('Stock Movements')
    expect(html).toContain('Recent Sales')
    expect(html).toContain('Edit Product')
    expect(html).toContain('Receive Stock')
    expect(html).toContain('Opening stock')
  })

  it('shows Not for sale and Not sold yet for an inactive product with no sales', () => {
    const product = { ...useShopStore.getState().products[0], isActive: false }
    const html = renderToString(
      <MemoryRouter>
        <ProductHeaderCard product={product} onEdit={() => undefined} />
        <ProductSalesCard unit={product.unit} rows={[]} />
      </MemoryRouter>,
    )

    expect(html).toContain('Not for sale')
    expect(html).toContain('Not sold yet.')
    expect(html).toContain(`href="${escapeHtml(ROUTES.receiveStockFor(product.id))}"`)
    expect(html).toContain(`href="${escapeHtml(ROUTES.movementsFor(product.id))}"`)
  })
})

describe('ProductListCard', () => {
  it('links each product name to its details', () => {
    const product = useShopStore.getState().products[0]
    const html = renderToString(
      <MemoryRouter>
        <ProductListCard
          rows={[product]}
          page={1}
          pageCount={1}
          pageSize={10}
          rangeLabel="1 of 1"
          hasFilters={false}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(html).toContain(`href="${ROUTES.productDetail(product.id)}"`)
  })
})
