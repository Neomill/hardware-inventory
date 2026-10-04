import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { CustomerLedgerPage } from '@/features/customers/pages/CustomerLedgerPage'

function renderAt(path: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/customers" element={<CustomerLedgerPage />} />
        <Route path="/customers/:customerId" element={<CustomerLedgerPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CustomerLedgerPage', () => {
  it('lists outstanding balances from the seeded store', () => {
    const html = renderAt('/customers')

    expect(html).toContain('Outstanding Credit')
    expect(html).toContain('Outstanding Balances')
    expect(html).toContain('ABC Construction')
  })

  it('shows one customer ledger by id', () => {
    const html = renderAt('/customers/CUS-006')

    expect(html).toContain('ABC Construction')
    expect(html).toContain('Open Charges')
    expect(html).toContain('Ledger Statement')
    expect(html).toContain('Payment History')
  })

  it('explains an unknown customer instead of failing', () => {
    expect(renderAt('/customers/CUS-999')).toContain('Customer not found')
  })
})
