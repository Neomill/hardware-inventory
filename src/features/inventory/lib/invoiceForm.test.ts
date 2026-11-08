import { describe, expect, it } from 'vitest'

import type { Product, SupplierInvoice } from '@/domain/types'
import {
  describeInvoiceLines,
  describeSavedLines,
  emptyInvoiceValues,
  invoiceFormIssues,
  makeInvoiceFormSchema,
  parseInvoiceTotal,
  productsNotOnInvoice,
  stockAfterInvoice,
  toReceiveInvoiceInput,
  validateLineToAdd,
  type InvoiceFormContext,
  type InvoiceFormValues,
} from '@/features/inventory/lib/invoiceForm'
import { testMovement } from '@/test/fixtures'

function product(id: string, stock = 10): Product {
  return {
    id,
    name: `Product ${id}`,
    sku: id,
    category: 'Test',
    unit: 'pcs',
    price: 1000,
    stock,
    reorderLevel: 2,
    isActive: true,
  }
}

const SAVED: SupplierInvoice = {
  invoiceNumber: 'INV-10021',
  supplier: 'ABC Trading',
  invoiceDate: '2026-11-01',
  total: 345000,
  lines: [
    { productId: 'A', productName: 'Product A', sku: 'A', unit: 'pcs', quantity: 150 },
    { productId: 'B', productName: 'Product B', sku: 'B', unit: 'pcs', quantity: 1 },
  ],
  note: null,
  receivedBy: 'Tester',
  recordedAt: '2026-11-01T08:45:00.000Z',
}

// Noon local time, so "today" is 2026-11-09 in any time zone the tests run in.
const NOW = new Date(2026, 10, 9, 12, 0)

const CONTEXT: InvoiceFormContext = {
  invoices: [SAVED],
  movements: [
    testMovement({ id: 'M-OLD', occurredAt: '2026-10-01T00:00:00Z', reference: 'INV-09999' }),
  ],
  products: [product('A'), product('B'), product('C')],
  now: () => NOW,
}

const VALID: InvoiceFormValues = {
  invoiceNumber: 'INV-10050',
  supplier: 'ABC Trading',
  invoiceDate: '2026-11-09',
  total: '5,000',
  lines: [
    { productId: 'A', quantity: '10' },
    { productId: 'B', quantity: '5' },
  ],
  note: '',
}

function messagesFor(values: Partial<InvoiceFormValues>) {
  return invoiceFormIssues({ ...VALID, ...values }, CONTEXT)
}

function onlyMessage(values: Partial<InvoiceFormValues>) {
  const issues = messagesFor(values)

  expect(issues).toHaveLength(1)

  return issues[0]
}

describe('invoiceFormIssues (spec s.5.2)', () => {
  it('accepts a complete invoice', () => {
    expect(messagesFor({})).toEqual([])
  })

  it.each(['', 'INV-12', '10050', 'INV-100500'])('refuses invoice number "%s"', (number) => {
    expect(onlyMessage({ invoiceNumber: number })).toEqual({
      path: ['invoiceNumber'],
      message: 'Supplier invoice numbers look like INV-10021.',
    })
  })

  it('refuses a number already on an invoice, whatever the case and spaces', () => {
    expect(onlyMessage({ invoiceNumber: ' inv-10021 ' }).message).toBe(
      'INV-10021 is already recorded.',
    )
  })

  it('refuses a number used by an older single-product receipt', () => {
    expect(onlyMessage({ invoiceNumber: 'INV-09999' }).message).toBe(
      'INV-09999 is already recorded.',
    )
  })

  it('requires the supplier and limits its length', () => {
    expect(onlyMessage({ supplier: '   ' })).toEqual({
      path: ['supplier'],
      message: 'Enter the supplier.',
    })
    expect(onlyMessage({ supplier: 'x'.repeat(81) }).message).toBe(
      'Keep the supplier name under 80 characters.',
    )
    expect(messagesFor({ supplier: 'x'.repeat(80) })).toEqual([])
  })

  it('accepts today and last week, refuses tomorrow', () => {
    expect(messagesFor({ invoiceDate: '2026-11-09' })).toEqual([])
    expect(messagesFor({ invoiceDate: '2026-11-02' })).toEqual([])
    expect(onlyMessage({ invoiceDate: '2026-11-10' })).toEqual({
      path: ['invoiceDate'],
      message: 'The invoice date cannot be in the future.',
    })
  })

  it('refuses a missing or impossible date', () => {
    expect(onlyMessage({ invoiceDate: '' }).message).toBe('Enter the invoice date.')
    expect(onlyMessage({ invoiceDate: '2026-02-30' }).message).toBe('Enter the invoice date.')
  })

  it.each(['', '0', '0.00', 'abc', '-5', '1.234'])('refuses total "%s"', (total) => {
    expect(onlyMessage({ total })).toEqual({
      path: ['total'],
      message: 'Enter the total from the invoice.',
    })
  })

  it('refuses an invoice with no lines', () => {
    expect(onlyMessage({ lines: [] })).toEqual({
      path: ['lines'],
      message: 'Add at least one product.',
    })
  })

  it('puts a bad quantity on its own line', () => {
    expect(
      onlyMessage({
        lines: [
          { productId: 'A', quantity: '10' },
          { productId: 'B', quantity: '2.5' },
        ],
      }),
    ).toEqual({
      path: ['lines', 1, 'quantity'],
      message: 'Enter a whole number of units greater than zero.',
    })
  })

  it('refuses a line whose product no longer exists', () => {
    expect(onlyMessage({ lines: [{ productId: 'GONE', quantity: '1' }] })).toEqual({
      path: ['lines'],
      message: 'A product on this invoice no longer exists.',
    })
  })

  it('limits the note to 200 characters', () => {
    expect(onlyMessage({ note: 'n'.repeat(201) }).message).toBe(
      'Keep the note under 200 characters.',
    )
    expect(messagesFor({ note: 'n'.repeat(200) })).toEqual([])
  })

  it('reports every problem at once', () => {
    const issues = invoiceFormIssues(emptyInvoiceValues('2026-11-09'), CONTEXT)

    expect(issues.map((issue) => issue.path[0])).toEqual([
      'invoiceNumber',
      'supplier',
      'total',
      'lines',
    ])
  })

  it('reads the clock when validating, not when the form was built', () => {
    let now = NOW
    const schema = makeInvoiceFormSchema({ ...CONTEXT, now: () => now })
    const tomorrow = { ...VALID, invoiceDate: '2026-11-10' }

    expect(schema.safeParse(tomorrow).success).toBe(false)
    now = new Date(2026, 10, 10, 9, 0)
    expect(schema.safeParse(tomorrow).success).toBe(true)
  })
})

describe('emptyInvoiceValues', () => {
  it('dates the form today with no lines', () => {
    expect(emptyInvoiceValues('2026-11-09')).toMatchObject({ invoiceDate: '2026-11-09', lines: [] })
  })

  it('makes a linked product the first line', () => {
    expect(emptyInvoiceValues('2026-11-09', 'CEM-001').lines).toEqual([
      { productId: 'CEM-001', quantity: '' },
    ])
  })
})

describe('parseInvoiceTotal', () => {
  it('reads pesos as integer centavos', () => {
    expect(parseInvoiceTotal('5,000')).toBe(500000)
    expect(parseInvoiceTotal('₱ 706.50')).toBe(70650)
    expect(parseInvoiceTotal('0.01')).toBe(1)
  })
})

describe('toReceiveInvoiceInput', () => {
  it('normalizes the number and supplier, parses money and quantities, drops a blank note', () => {
    expect(
      toReceiveInvoiceInput({
        ...VALID,
        invoiceNumber: ' inv-10022 ',
        supplier: '  ABC   Trading ',
        note: '   ',
      }),
    ).toEqual({
      invoiceNumber: 'INV-10022',
      supplier: 'ABC Trading',
      invoiceDate: '2026-11-09',
      total: 500000,
      lines: [
        { productId: 'A', quantity: 10 },
        { productId: 'B', quantity: 5 },
      ],
      note: undefined,
    })
  })

  it('keeps a typed note, trimmed', () => {
    expect(toReceiveInvoiceInput({ ...VALID, note: ' Two sacks torn ' }).note).toBe(
      'Two sacks torn',
    )
  })
})

describe('adding lines', () => {
  const lines = [{ productId: 'A', quantity: '10' }]

  it('offers only products not already on the invoice', () => {
    expect(productsNotOnInvoice(CONTEXT.products, lines).map((p) => p.id)).toEqual(['B', 'C'])
  })

  it('adds a chosen product with a whole quantity', () => {
    expect(validateLineToAdd('B', ' 7 ', lines)).toEqual({
      ok: true,
      line: { productId: 'B', quantity: '7' },
    })
  })

  it('asks for a product first, then a quantity', () => {
    expect(validateLineToAdd('', '7', lines)).toMatchObject({ ok: false, field: 'productId' })
    expect(validateLineToAdd('B', '0', lines)).toEqual({
      ok: false,
      field: 'quantity',
      message: 'Enter a whole number of units greater than zero.',
    })
  })

  it('does not add a product twice', () => {
    expect(validateLineToAdd('A', '3', lines)).toMatchObject({ ok: false, field: 'productId' })
  })
})

describe('line summaries', () => {
  it('counts products and valid units', () => {
    expect(
      describeInvoiceLines([
        { productId: 'A', quantity: '100' },
        { productId: 'B', quantity: '20' },
        { productId: 'C', quantity: '' },
      ]),
    ).toBe('3 products, 120 units')
    expect(describeInvoiceLines([{ productId: 'A', quantity: '1' }])).toBe('1 product, 1 unit')
    expect(describeInvoiceLines([])).toBe('0 products, 0 units')
  })

  it('describes a saved invoice', () => {
    expect(describeSavedLines(SAVED)).toBe('2 products, 151 units')
  })
})

describe('stockAfterInvoice', () => {
  it('reads each invoiced product from the products after the save', () => {
    const after = stockAfterInvoice(SAVED, [product('A', 160), product('C', 4)])

    expect([...after]).toEqual([['A', 160]])
  })
})
