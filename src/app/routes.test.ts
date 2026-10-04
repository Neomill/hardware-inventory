import { describe, expect, it } from 'vitest'
import { matchPath } from 'react-router-dom'

import { isProductStockFilter, ROUTES } from '@/app/routes'
import { reportsHref } from '@/features/reports/lib/reportRange'

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

  it('matches reportsHref for every option it supports', () => {
    const cases = [
      {},
      { section: 'payment-breakdown' as const },
      { range: { preset: 'yesterday' as const } },
      { range: { preset: '30d' as const }, section: 'daily-sales' as const },
      { range: { preset: 'custom' as const, from: '2026-09-01', to: '2026-09-30' } },
      {
        range: { preset: 'custom' as const, from: '2026-09-01' },
        section: 'outstanding-credit' as const,
      },
    ]

    for (const options of cases) {
      expect(ROUTES.reportsFor(options)).toBe(reportsHref(options))
    }
  })
})
