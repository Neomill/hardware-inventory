import { describe, expect, it } from 'vitest'

import { resolvePageTitle } from '@/components/layout/navigation'

describe('resolvePageTitle', () => {
  it('returns the dashboard title for the root route', () => {
    expect(resolvePageTitle('/')).toBe('Dashboard')
  })

  it('returns the section title for a module route', () => {
    expect(resolvePageTitle('/inventory')).toBe('Inventory')
  })

  it('returns the section title for a nested detail route', () => {
    expect(resolvePageTitle('/sales/SALE-001')).toBe('Sales (POS)')
  })

  it('falls back to the dashboard title for unknown routes', () => {
    expect(resolvePageTitle('/does-not-exist')).toBe('Dashboard')
  })
})
