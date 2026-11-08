import { describe, expect, it } from 'vitest'

import {
  buildInvoiceMovements,
  buildSupplierInvoice,
  findInvoice,
  invoiceUnitCount,
  isInvoiceNumberTaken,
  isValidDayKey,
  knownSuppliers,
  normalizeSupplierName,
  sortInvoicesNewestFirst,
  validateSupplierInvoice,
  type InvoiceValidationContext,
  type ReceiveInvoiceInput,
} from '@/domain/supplierInvoice'
import type { Product, SupplierInvoice } from '@/domain/types'
import { testMovement } from '@/test/fixtures'

function product(id: string): Product {
  return {
    id,
    name: `Product ${id}`,
    sku: id,
    category: 'Tools',
    unit: 'pcs',
    price: 100,
    stock: 0,
    reorderLevel: 0,
    isActive: true,
  }
}

function invoice(overrides: Partial<SupplierInvoice> = {}): SupplierInvoice {
  return {
    invoiceNumber: 'INV-10021',
    supplier: 'ABC Trading',
    invoiceDate: '2025-05-21',
    total: 345000,
    lines: [
      { productId: 'A', productName: 'Product A', sku: 'A', unit: 'pcs', quantity: 3 },
      { productId: 'B', productName: 'Product B', sku: 'B', unit: 'pcs', quantity: 4 },
    ],
    note: null,
    receivedBy: 'Juan Dela Cruz',
    recordedAt: '2025-05-21T10:00:00.000Z',
    ...overrides,
  }
}

const today = new Date(2025, 4, 21, 15, 0)

const context: InvoiceValidationContext = {
  invoices: [invoice()],
  movements: [
    testMovement({ id: 'MOV-OLD', occurredAt: today.toISOString(), reference: 'INV-10010' }),
  ],
  products: [product('A'), product('B')],
  today,
}

const valid: ReceiveInvoiceInput = {
  invoiceNumber: ' inv-10050 ',
  supplier: '  Metro   Electrical ',
  invoiceDate: '2025-05-21',
  total: 500000,
  lines: [
    { productId: 'A', quantity: 10 },
    { productId: 'B', quantity: 5 },
  ],
  note: '  Two boxes short ',
}

function messageFor(changes: Partial<ReceiveInvoiceInput>): string | null {
  return validateSupplierInvoice({ ...valid, ...changes }, context).message
}

describe('isInvoiceNumberTaken (U1)', () => {
  it('finds a number on an invoice, on a movement only, or nowhere', () => {
    expect(isInvoiceNumberTaken('INV-10021', context.invoices, context.movements)).toBe(true)
    expect(isInvoiceNumberTaken('inv-10010 ', context.invoices, context.movements)).toBe(true)
    expect(isInvoiceNumberTaken('INV-10099', context.invoices, context.movements)).toBe(false)
  })

  it('never treats a blank number as taken, even beside blank references', () => {
    const blank = [testMovement({ id: 'M', occurredAt: today.toISOString(), reference: '' })]

    expect(isInvoiceNumberTaken('  ', [], blank)).toBe(false)
  })
})

describe('validateSupplierInvoice (U2, U3)', () => {
  it('accepts a valid invoice', () => {
    expect(validateSupplierInvoice(valid, context)).toEqual({ ok: true, message: null })
  })

  it('checks every rule in form order', () => {
    expect(messageFor({ invoiceNumber: 'INV-12' })).toBe(
      'Supplier invoice numbers look like INV-10021.',
    )
    expect(messageFor({ invoiceNumber: 'inv-10021' })).toBe('INV-10021 is already recorded.')
    expect(messageFor({ invoiceNumber: 'INV-10010' })).toBe('INV-10010 is already recorded.')
    expect(messageFor({ supplier: '   ' })).toBe('Enter the supplier.')
    expect(messageFor({ supplier: 'x'.repeat(81) })).toBe(
      'Keep the supplier name under 80 characters.',
    )
    expect(messageFor({ invoiceDate: '2025-02-30' })).toBe('Enter the invoice date.')
    expect(messageFor({ invoiceDate: '' })).toBe('Enter the invoice date.')
    expect(messageFor({ total: 0 })).toBe('Enter the total from the invoice.')
    expect(messageFor({ total: 10.5 })).toBe('Enter the total from the invoice.')
    expect(messageFor({ total: -1 })).toBe('Enter the total from the invoice.')
    expect(messageFor({ lines: [] })).toBe('Add at least one product.')
    expect(messageFor({ lines: [{ productId: 'GONE', quantity: 1 }] })).toBe(
      'A product on this invoice no longer exists.',
    )
    for (const quantity of [0, -2, 1.5]) {
      expect(messageFor({ lines: [{ productId: 'A', quantity }] })).toBe(
        'Enter a whole number of units greater than zero.',
      )
    }
    expect(
      messageFor({
        lines: [
          { productId: 'A', quantity: Number.MAX_SAFE_INTEGER },
          { productId: 'A', quantity: 1 },
        ],
      }),
    ).toBe('Enter a whole number of units greater than zero.')
    expect(messageFor({ note: 'x'.repeat(201) })).toBe('Keep the note under 200 characters.')
    expect(messageFor({ note: 'x'.repeat(200) })).toBeNull()
    expect(messageFor({ note: undefined })).toBeNull()
  })

  it('accepts today and an earlier day, refuses tomorrow', () => {
    expect(messageFor({ invoiceDate: '2025-05-21' })).toBeNull()
    expect(messageFor({ invoiceDate: '2025-05-14' })).toBeNull()
    expect(messageFor({ invoiceDate: '2025-05-22' })).toBe(
      'The invoice date cannot be in the future.',
    )
  })
})

describe('isValidDayKey and normalizeSupplierName', () => {
  it('accepts real days only', () => {
    expect(isValidDayKey('2024-02-29')).toBe(true)
    expect(isValidDayKey('2025-02-29')).toBe(false)
    expect(isValidDayKey('2025-13-01')).toBe(false)
    expect(isValidDayKey('21/05/2025')).toBe(false)
  })

  it('tidies spaces', () => {
    expect(normalizeSupplierName('  Ram   Hardware ')).toBe('Ram Hardware')
  })
})

describe('buildSupplierInvoice', () => {
  it('normalizes, merges repeated products and copies product details', () => {
    const built = buildSupplierInvoice(
      {
        ...valid,
        lines: [
          { productId: 'A', quantity: 10 },
          { productId: 'B', quantity: 5 },
          { productId: 'A', quantity: 2 },
        ],
      },
      { ...context, receivedBy: 'Juan Dela Cruz' },
    )

    expect(built).toEqual({
      invoiceNumber: 'INV-10050',
      supplier: 'Metro Electrical',
      invoiceDate: '2025-05-21',
      total: 500000,
      lines: [
        { productId: 'A', productName: 'Product A', sku: 'A', unit: 'pcs', quantity: 12 },
        { productId: 'B', productName: 'Product B', sku: 'B', unit: 'pcs', quantity: 5 },
      ],
      note: 'Two boxes short',
      receivedBy: 'Juan Dela Cruz',
      recordedAt: today.toISOString(),
    })
  })

  it('stores a blank note as null and refuses invalid input', () => {
    const withContext = { ...context, receivedBy: 'X' }

    expect(buildSupplierInvoice({ ...valid, note: '  ' }, withContext)?.note).toBeNull()
    expect(buildSupplierInvoice({ ...valid, total: 0 }, withContext)).toBeNull()
  })
})

describe('buildInvoiceMovements (U4)', () => {
  it('writes one stock_in per line with the invoice number as reference', () => {
    expect(buildInvoiceMovements(invoice())).toEqual([
      {
        id: 'MOV-INV-10021-A',
        productId: 'A',
        type: 'stock_in',
        quantityDelta: 3,
        reference: 'INV-10021',
        description: 'Received from ABC Trading',
        reason: null,
        note: null,
        recordedBy: 'Juan Dela Cruz',
        occurredAt: '2025-05-21T10:00:00.000Z',
      },
      expect.objectContaining({ id: 'MOV-INV-10021-B', quantityDelta: 4 }),
    ])
  })
})

describe('knownSuppliers (U5), invoiceUnitCount, sorting and lookup', () => {
  it('lists distinct suppliers A to Z, ignoring case and spacing', () => {
    expect(
      knownSuppliers([
        invoice({ supplier: 'XYZ Supplies' }),
        invoice({ supplier: 'abc trading' }),
        invoice({ supplier: 'ABC  Trading' }),
        invoice({ supplier: ' ' }),
      ]),
    ).toEqual(['abc trading', 'XYZ Supplies'])
  })

  it('counts units', () => {
    expect(invoiceUnitCount(invoice())).toBe(7)
  })

  it('sorts by invoice date, then by recorded time, newest first', () => {
    const a = invoice({ invoiceNumber: 'INV-1', invoiceDate: '2025-05-20' })
    const b = invoice({ invoiceNumber: 'INV-2', recordedAt: '2025-05-21T08:00:00.000Z' })
    const c = invoice({ invoiceNumber: 'INV-3', recordedAt: '2025-05-21T12:00:00.000Z' })

    expect(sortInvoicesNewestFirst([a, b, c]).map((entry) => entry.invoiceNumber)).toEqual([
      'INV-3',
      'INV-2',
      'INV-1',
    ])
  })

  it('finds an invoice by number, forgiving case', () => {
    expect(findInvoice([invoice()], ' inv-10021')?.invoiceNumber).toBe('INV-10021')
    expect(findInvoice([invoice()], 'INV-10099')).toBeNull()
    expect(findInvoice([invoice()], 'nope')).toBeNull()
  })
})
