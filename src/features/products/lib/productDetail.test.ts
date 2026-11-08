import { describe, expect, it } from 'vitest'

import type { StockMovement, SupplierInvoice } from '@/domain/types'
import {
  movementReferenceLink,
  productAddedNotice,
  productAddedState,
  productSalesHistory,
  readProductAddedState,
} from '@/features/products/lib/productDetail'
import { testLine, testSale } from '@/test/fixtures'

function dayIso(day: number): string {
  return new Date(Date.UTC(2026, 9, day, 2)).toISOString()
}

describe('productSalesHistory (F2)', () => {
  // Twelve sales of P-1, each at a different price; sale 11 is cancelled.
  const sales = Array.from({ length: 12 }, (_, index) =>
    testSale({
      id: `S-${index + 1}`,
      occurredAt: dayIso(index + 1),
      lines: [testLine('P-1', 1000 + index, 2), testLine('P-2', 500, 1)],
      status: index === 10 ? 'cancelled' : 'completed',
    }),
  )
  const unrelated = testSale({ id: 'S-X', occurredAt: dayIso(20), lines: [testLine('P-9', 1, 1)] })

  it('lists the 10 newest sales of the product, newest first', () => {
    const rows = productSalesHistory([...sales, unrelated], 'P-1', 10)

    expect(rows).toHaveLength(10)
    expect(rows.map((row) => row.saleId)).toEqual([
      'S-12',
      'S-11',
      'S-10',
      'S-9',
      'S-8',
      'S-7',
      'S-6',
      'S-5',
      'S-4',
      'S-3',
    ])
  })

  it('flags the cancelled sale and keeps the price as sold', () => {
    const rows = productSalesHistory(sales, 'P-1', 10)
    const cancelled = rows.find((row) => row.saleId === 'S-11')!

    expect(cancelled.cancelled).toBe(true)
    expect(rows.filter((row) => row.cancelled)).toHaveLength(1)
    expect(cancelled.unitPrice).toBe(1010)
    expect(cancelled.quantity).toBe(2)
    expect(cancelled.amount).toBe(2020)
  })

  it('adds up a product that appears on two lines of one sale', () => {
    const sale = testSale({
      occurredAt: dayIso(1),
      lines: [testLine('P-1', 300, 1), testLine('P-1', 300, 4)],
    })

    expect(productSalesHistory([sale], 'P-1')[0]).toMatchObject({ quantity: 5, amount: 1500 })
  })

  it('is empty for a product never sold', () => {
    expect(productSalesHistory(sales, 'NOPE')).toEqual([])
  })
})

describe('movementReferenceLink', () => {
  const sale = testSale({ id: 'SALE-1', occurredAt: dayIso(1) })
  const invoice = { invoiceNumber: 'INV-10021' } as SupplierInvoice

  function movement(type: StockMovement['type'], reference: string): StockMovement {
    return {
      id: 'M',
      productId: 'P-1',
      type,
      quantityDelta: 1,
      reference,
      description: '',
      reason: null,
      recordedBy: 'Test',
      occurredAt: dayIso(1),
    }
  }

  it('links a sale number to the sale, for sales and reversals', () => {
    expect(movementReferenceLink(movement('sale', sale.saleNumber), [sale], [])).toBe(
      '/sales/SALE-1',
    )
    expect(movementReferenceLink(movement('sale_reversal', sale.saleNumber), [sale], [])).toBe(
      '/sales/SALE-1',
    )
  })

  it('links a saved invoice number to the invoice', () => {
    expect(movementReferenceLink(movement('stock_in', 'inv-10021'), [], [invoice])).toBe(
      '/inventory/invoices/INV-10021',
    )
  })

  it('leaves references with no target as text', () => {
    expect(movementReferenceLink(movement('stock_in', 'OPENING'), [sale], [invoice])).toBeNull()
    expect(movementReferenceLink(movement('stock_in', 'INV-99999'), [], [invoice])).toBeNull()
    expect(movementReferenceLink(movement('stock_in', ''), [], [])).toBeNull()
    expect(movementReferenceLink(movement('sale', '#unknown'), [sale], [])).toBeNull()
    expect(movementReferenceLink(movement('adjustment', 'ADJ-00001'), [sale], [])).toBeNull()
  })
})

describe('added-product notice', () => {
  it('round-trips the opening stock through router state', () => {
    expect(readProductAddedState(productAddedState(25))).toBe(25)
    expect(readProductAddedState(productAddedState(0))).toBe(0)
    expect(readProductAddedState(null)).toBeNull()
    expect(readProductAddedState({ addedOpeningStock: 'x' })).toBeNull()
  })

  it('says what was added', () => {
    expect(productAddedNotice(25, 'sack')).toBe('Product added. Opening stock: 25 sack.')
  })
})
