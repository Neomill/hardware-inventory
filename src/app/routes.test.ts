import { describe, expect, it } from 'vitest'
import { matchPath } from 'react-router-dom'

import { isProductStockFilter, ROUTES } from '@/app/routes'

describe('ROUTES builders', () => {
  it('builds product stock filter links', () => {
    expect(ROUTES.productsByStock('restock')).toBe('/products?stock=restock')
    expect(ROUTES.productsByStock('out_of_stock')).toBe('/products?stock=out_of_stock')
  })

  it('builds inventory links with the product query the inventory views read', () => {
    expect(ROUTES.receiveStockFor('P-001')).toBe('/inventory/receive?product=P-001')
    expect(ROUTES.movementsFor('a b&c')).toBe('/inventory/movements?product=a+b%26c')
    expect(new URLSearchParams(ROUTES.movementsFor('a b&c').split('?')[1]).get('product')).toBe(
      'a b&c',
    )
  })

  it('builds detail links that match their route patterns', () => {
    expect(matchPath(ROUTES.patterns.productDetail, ROUTES.productDetail('P-1'))?.params).toEqual({
      productId: 'P-1',
    })
    expect(matchPath(ROUTES.patterns.saleDetail, ROUTES.saleDetail('S-1'))?.params).toEqual({
      saleId: 'S-1',
    })
    expect(matchPath(ROUTES.patterns.customerDetail, ROUTES.customerDetail('C-1'))?.params).toEqual(
      { customerId: 'C-1' },
    )
  })

  it('builds supplier invoice links under inventory', () => {
    expect(ROUTES.invoices).toBe('/inventory/invoices')
    expect(ROUTES.invoiceDetail('INV-10021')).toBe('/inventory/invoices/INV-10021')
    expect(ROUTES.invoiceDetail('a/b c')).toBe('/inventory/invoices/a%2Fb%20c')
    expect(
      matchPath(ROUTES.patterns.invoiceDetail, ROUTES.invoiceDetail('INV-10021'))?.params,
    ).toEqual({ invoiceNumber: 'INV-10021' })
    expect(matchPath(ROUTES.patterns.invoiceDetail, ROUTES.invoices)).toBeNull()
  })

  it('recognises stock filters', () => {
    expect(isProductStockFilter('restock')).toBe(true)
    expect(isProductStockFilter('low-stock')).toBe(false)
    expect(isProductStockFilter(null)).toBe(false)
  })
})

describe('ROUTES.reportsFor', () => {
  it('returns the bare path with no options', () => {
    expect(ROUTES.reportsFor()).toBe('/reports')
    expect(ROUTES.reportsFor({})).toBe('/reports')
  })

  it('writes a preset range, and drops from/to unless custom', () => {
    expect(ROUTES.reportsFor({ range: { preset: '7d' } })).toBe('/reports?range=7d')
    expect(ROUTES.reportsFor({ range: { preset: 'today', from: '2026-10-01' } })).toBe(
      '/reports?range=today',
    )
  })

  it('writes a custom range, top metric and section', () => {
    expect(
      ROUTES.reportsFor({
        range: { preset: 'custom', from: '2026-10-01', to: '2026-10-04' },
        top: 'revenue',
        section: 'top-products',
      }),
    ).toBe('/reports?range=custom&from=2026-10-01&to=2026-10-04&top=revenue&section=top-products')
  })

  it('builds plain and preset deep links', () => {
    expect(ROUTES.reportsFor()).toBe('/reports')
    expect(ROUTES.reportsFor({ range: { preset: 'today' }, section: 'top-products' })).toBe(
      '/reports?range=today&section=top-products',
    )
  })
})
