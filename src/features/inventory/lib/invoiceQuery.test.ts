import { describe, expect, it } from 'vitest'

import type { SupplierInvoice } from '@/domain/types'
import {
  formatInvoiceDate,
  formatRecordedAt,
  savedInvoiceNumbers,
  searchInvoices,
} from '@/features/inventory/lib/invoiceQuery'

function invoice(
  invoiceNumber: string,
  supplier: string,
  invoiceDate: string,
  recordedAt: string,
): SupplierInvoice {
  return {
    invoiceNumber,
    supplier,
    invoiceDate,
    total: 100000,
    lines: [{ productId: 'A', productName: 'A', sku: 'A', unit: 'pcs', quantity: 1 }],
    note: null,
    receivedBy: 'Tester',
    recordedAt,
  }
}

// Stored oldest first, as the store keeps them.
const INVOICES = [
  invoice('INV-10018', 'Metro Electrical', '2026-11-01', '2026-11-01T06:00:00Z'),
  invoice('INV-10019', 'Metro Electrical', '2026-11-03', '2026-11-03T02:00:00Z'),
  // Dated earlier than INV-10019 but recorded later: the invoice date leads.
  invoice('INV-10020', 'XYZ Supplies', '2026-11-02', '2026-11-04T00:00:00Z'),
  invoice('INV-10021', 'ABC Trading', '2026-11-03', '2026-11-03T08:45:00Z'),
]

const numbers = (list: SupplierInvoice[]) => list.map((item) => item.invoiceNumber)

describe('searchInvoices', () => {
  it('lists newest invoice date first, then newest recorded', () => {
    expect(numbers(searchInvoices(INVOICES, ''))).toEqual([
      'INV-10021',
      'INV-10019',
      'INV-10020',
      'INV-10018',
    ])
  })

  it('finds by invoice number, any case', () => {
    expect(numbers(searchInvoices(INVOICES, ' inv-1002 '))).toEqual(['INV-10021', 'INV-10020'])
  })

  it('finds by supplier, ignoring case and extra spaces', () => {
    expect(numbers(searchInvoices(INVOICES, 'metro   ELECTRICAL'))).toEqual([
      'INV-10019',
      'INV-10018',
    ])
  })

  it('returns nothing when nothing matches', () => {
    expect(searchInvoices(INVOICES, 'Wilcon')).toEqual([])
  })

  it('does not reorder the stored list', () => {
    searchInvoices(INVOICES, '')

    expect(numbers(INVOICES)[0]).toBe('INV-10018')
  })
})

describe('formatInvoiceDate', () => {
  it('shows the printed day without shifting it', () => {
    expect(formatInvoiceDate('2026-11-01')).toBe('Nov 1, 2026')
  })

  it('shows an unreadable value as it is', () => {
    expect(formatInvoiceDate('someday')).toBe('someday')
  })
})

describe('formatRecordedAt', () => {
  it('shows the local date and time of the save', () => {
    const recorded = new Date(2026, 10, 1, 16, 45)

    expect(formatRecordedAt(recorded.toISOString())).toMatch(/^Nov 1, 2026, 0?4:45\sPM$/i)
  })

  it('is blank for an unreadable time', () => {
    expect(formatRecordedAt('not a date')).toBe('')
  })
})

describe('savedInvoiceNumbers', () => {
  it('collects every saved number', () => {
    expect(savedInvoiceNumbers(INVOICES).has('INV-10020')).toBe(true)
    expect(savedInvoiceNumbers(INVOICES).has('INV-09999')).toBe(false)
  })
})
