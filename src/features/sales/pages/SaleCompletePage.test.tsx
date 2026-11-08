import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Sale } from '@/domain/types'
import { RecentSalesPanel } from '@/features/sales/components/RecentSalesPanel'
import { SaleCompletePage } from '@/features/sales/pages/SaleCompletePage'
import type * as ShopStoreModule from '@/stores/useShopStore'
import { useShopStore } from '@/stores/useShopStore'
import { testLine, testPayment, testSale } from '@/test/fixtures'
import { formatCurrency } from '@/lib/format'

// Server rendering reads a zustand store's *initial* state (getServerSnapshot),
// so the hook is swapped for one that reads the live state these tests set.
vi.mock('@/stores/useShopStore', async (importOriginal) => {
  const actual = await importOriginal<typeof ShopStoreModule>()
  const store = actual.useShopStore
  const liveHook = Object.assign(
    <T,>(selector: (state: ReturnType<typeof store.getState>) => T): T =>
      selector(store.getState()),
    store,
  )

  return { ...actual, useShopStore: liveHook }
})

/** A seeded product, so cancelSale can return its stock. */
const PVC = 'PVC-050'

const initial = useShopStore.getState()

function addSale(overrides: Partial<Parameters<typeof testSale>[0]> = {}): Sale {
  const sale = testSale({
    occurredAt: new Date().toISOString(),
    lines: [testLine(PVC, 5000, 3, 'PVC Pipe')],
    ...overrides,
  })
  useShopStore.setState({ sales: [...useShopStore.getState().sales, sale] })

  return sale
}

function renderSale(saleId: string, state?: unknown): string {
  return renderToString(
    <MemoryRouter initialEntries={[{ pathname: `/sales/${saleId}`, state }]}>
      <Routes>
        <Route path="/sales/:saleId" element={<SaleCompletePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The attributes of the Cancel Sale button, or null when there is none. */
function cancelButtonAttributes(html: string): string | null {
  return html.match(/<button([^>]*)>(?:(?!<\/button>).)*Cancel Sale/)?.[1] ?? null
}

/** Text only, so assertions do not depend on markup between words. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
}

beforeEach(() => {
  useShopStore.setState({
    sales: initial.sales,
    movements: initial.movements,
    payments: initial.payments,
    products: initial.products,
  })
})

afterEach(() => {
  useShopStore.setState({
    sales: initial.sales,
    movements: initial.movements,
    payments: initial.payments,
    products: initial.products,
  })
})

describe('SaleCompletePage: a sale that stands', () => {
  it('offers Cancel Sale, enabled, and reads its settlement as before', () => {
    const sale = addSale()
    const text = textOf(renderSale(sale.id))

    expect(text).toContain('Cancel Sale')
    expect(text).not.toMatch(/You can't cancel this sale/)
    expect(text).toContain('Status now Paid')
    expect(cancelButtonAttributes(renderSale(sale.id))).not.toContain('disabled=""')
  })

  it('disables Cancel Sale and says why once a customer payment is applied (AC5)', () => {
    const sale = addSale({ paymentMethod: 'credit', customerId: 'CUS-T1', total: 15000 })
    // Only charge for this customer, so the 10,000 payment goes entirely to it.
    useShopStore.setState({
      payments: [
        ...useShopStore.getState().payments,
        testPayment('CUS-T1', 10000, new Date().toISOString()),
      ],
    })
    const html = renderSale(sale.id)
    const text = textOf(html)

    expect(cancelButtonAttributes(html)).toContain('disabled=""')
    expect(text).toContain(
      `You can't cancel this sale. Customer CUS-T1 has already paid ${formatCurrency(10000)} toward it`,
    )
    expect(text).toContain('Leave the sale as it is and tell the owner.')
  })
})

describe('SaleCompletePage: completion wording', () => {
  it('says Sale Completed when arriving from checkout', () => {
    const sale = addSale()
    const text = textOf(renderSale(sale.id, { completed: true }))

    expect(text).toContain('Sale Completed')
    expect(text).toContain('Stock was reduced for 1 product')
  })

  it('uses neutral wording for a sale opened from the sales history', () => {
    const sale = addSale()
    const text = textOf(renderSale(sale.id))

    expect(text).not.toContain('Sale Completed')
    expect(text).not.toContain('Stock was reduced')
    expect(text).toContain('This sale reduced stock for 1 product.')
  })
})

describe('SaleCompletePage: receipt payment lines', () => {
  it('reads a credit sale as charged to account, with no zero "Paid by" line', () => {
    const sale = addSale({ paymentMethod: 'credit', customerId: 'CUS-T4' })
    const text = textOf(renderSale(sale.id))

    expect(text).not.toMatch(/Paid by/)
    expect(text).not.toContain(`Paid at counter ${formatCurrency(0)}`)
    expect(text).toContain('Payment On credit, charged to account')
    expect(text).toContain(`Balance at time of sale ${formatCurrency(sale.total)}`)
  })

  it('shows what a partial sale paid at the counter and the balance', () => {
    const sale = addSale({
      paymentMethod: 'partial',
      customerId: 'CUS-T5',
      total: 15000,
      amountPaid: 5000,
    })
    const text = textOf(renderSale(sale.id))

    expect(text).toContain(`Paid at counter ${formatCurrency(5000)}`)
    expect(text).toContain(`Balance at time of sale ${formatCurrency(10000)}`)
  })
})

describe('SaleCompletePage: a cancelled sale', () => {
  function cancel(sale: Sale, reason = 'Customer changed his mind'): Sale {
    const result = useShopStore.getState().cancelSale({ saleId: sale.id, reason })
    if (!result.ok) {
      throw new Error(result.message)
    }

    return result.sale
  }

  it('shows Cancelled with who, when and why, and no Cancel Sale button (AC2, AC6)', () => {
    const cancelled = cancel(addSale())
    const text = textOf(renderSale(cancelled.id))

    expect(text).toContain('Cancelled')
    expect(text).toContain(`by ${cancelled.cancellation?.cancelledBy}.`)
    expect(text).toContain('Reason: Customer changed his mind.')
    expect(text).toContain('Stock returned: 3 items across 1 product.')
    expect(text).toContain('Status now Cancelled')
    expect(text).not.toContain('Status now Paid')
    expect(text).not.toContain('Cancel Sale')
    expect(cancelButtonAttributes(renderSale(cancelled.id))).toBeNull()
    expect(text).not.toContain('Stock was reduced')
  })

  it('marks the receipt itself CANCELLED so the printout says so', () => {
    const cancelled = cancel(addSale())
    const html = renderSale(cancelled.id)
    const receipt = html.slice(html.indexOf('class="receipt'))
    const receiptHeader = receipt.slice(0, receipt.indexOf('</header>'))

    expect(textOf(receiptHeader)).toContain('Cancelled')
  })

  it('hides the Sale Completed banner even when router state says completed', () => {
    const cancelled = cancel(addSale())
    const text = textOf(renderSale(cancelled.id, { completed: true }))

    expect(text).not.toContain('Sale Completed')
    expect(text).toContain('Cancelled')
  })

  it('states that counter money was not refunded (AC7)', () => {
    const cancelled = cancel(addSale())
    const text = textOf(renderSale(cancelled.id))

    expect(text).toContain(`${formatCurrency(cancelled.total)} was taken at the counter.`)
    expect(text).toContain('The app does not record refunds')
  })

  it('hides Balance now and the counter-money note for a cancelled credit sale', () => {
    const cancelled = cancel(addSale({ paymentMethod: 'credit', customerId: 'CUS-T2' }))
    const text = textOf(renderSale(cancelled.id))

    expect(text).not.toContain('Balance now')
    expect(text).not.toContain('taken at the counter')
    expect(text).toContain('Balance at time of sale')
  })
})

describe('RecentSalesPanel', () => {
  it('reads Cancelled, with no "left" line, for a cancelled sale (AC6)', () => {
    const credit = testSale({
      occurredAt: new Date().toISOString(),
      paymentMethod: 'credit',
      customerId: 'CUS-T3',
      total: 20000,
      status: 'cancelled',
      cancellation: {
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'Tester',
        reason: 'Wrong item',
      },
    })
    const text = textOf(
      renderToString(
        <MemoryRouter>
          <RecentSalesPanel sales={[credit]} remaining={new Map([[credit.id, 20000]])} />
        </MemoryRouter>,
      ),
    )

    expect(text).toContain('Cancelled')
    expect(text).not.toContain('Paid')
    expect(text).not.toContain('Outstanding')
    expect(text).not.toContain('left')
  })
})
