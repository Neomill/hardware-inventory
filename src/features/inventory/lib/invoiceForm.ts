import { z } from 'zod'

import { toDayKey, type DayKey } from '@/domain/dates'
import { normalizeSupplierInvoice } from '@/domain/inventory'
import { parseAmountInput } from '@/domain/money'
import {
  INVOICE_NOTE_MAX,
  SUPPLIER_NAME_MAX,
  invoiceUnitCount,
  isInvoiceNumberTaken,
  isValidDayKey,
  normalizeSupplierName,
  type ReceiveInvoiceInput,
} from '@/domain/supplierInvoice'
import type { Product, StockMovement, SupplierInvoice } from '@/domain/types'
import { QUANTITY_MESSAGE, parseWholeQuantity } from '@/features/inventory/lib/stockForms'
import { formatNumber } from '@/lib/format'

/**
 * The Receive Stock form: one supplier invoice, many products (spec 04
 * supplier invoices, s.5.2 and s.7.3). Values stay strings so a blank field
 * is "", never NaN; the store checks every rule again on save.
 */

export type InvoiceLineValues = {
  productId: string
  /** Whole units, typed. */
  quantity: string
}

export type InvoiceFormValues = {
  invoiceNumber: string
  supplier: string
  /** "YYYY-MM-DD" from the date input. */
  invoiceDate: DayKey
  /** Pesos as typed: "5,000" or "706.50". */
  total: string
  lines: InvoiceLineValues[]
  note: string
}

export type InvoiceFormContext = {
  invoices: SupplierInvoice[]
  movements: StockMovement[]
  products: Product[]
  /** Read at validation time, so a form left open past midnight uses the new day. */
  now: () => Date
}

export type InvoiceFormIssue = {
  path: (string | number)[]
  message: string
}

export const INVOICE_FORMAT_MESSAGE = 'Supplier invoice numbers look like INV-10021.'
export const NO_LINES_MESSAGE = 'Add at least one product.'
export const CHOOSE_PRODUCT_MESSAGE = 'Choose the product that was delivered.'

/** A fresh form dated today; a "?product=" link becomes the first line. */
export function emptyInvoiceValues(today: DayKey, firstProductId = ''): InvoiceFormValues {
  return {
    invoiceNumber: '',
    supplier: '',
    invoiceDate: today,
    total: '',
    lines: firstProductId ? [{ productId: firstProductId, quantity: '' }] : [],
    note: '',
  }
}

/** Positive integer centavos, or null when the total is blank, zero or not an amount. */
export function parseInvoiceTotal(raw: string): number | null {
  const total = parseAmountInput(raw)

  return total !== null && Number.isSafeInteger(total) && total > 0 ? total : null
}

/**
 * Every problem with the form at once, each on its field, with the wording of
 * spec s.5.2. The domain's validateSupplierInvoice stops at the first problem;
 * the form shows them all so one save attempt shows everything to fix.
 */
export function invoiceFormIssues(
  values: InvoiceFormValues,
  context: InvoiceFormContext,
): InvoiceFormIssue[] {
  const issues: InvoiceFormIssue[] = []
  const add = (path: InvoiceFormIssue['path'], message: string) => issues.push({ path, message })

  const invoiceNumber = normalizeSupplierInvoice(values.invoiceNumber)

  if (invoiceNumber === null) {
    add(['invoiceNumber'], INVOICE_FORMAT_MESSAGE)
  } else if (isInvoiceNumberTaken(invoiceNumber, context.invoices, context.movements)) {
    add(['invoiceNumber'], `${invoiceNumber} is already recorded.`)
  }

  const supplier = normalizeSupplierName(values.supplier)

  if (supplier === '') {
    add(['supplier'], 'Enter the supplier.')
  } else if (supplier.length > SUPPLIER_NAME_MAX) {
    add(['supplier'], `Keep the supplier name under ${SUPPLIER_NAME_MAX} characters.`)
  }

  if (!isValidDayKey(values.invoiceDate)) {
    add(['invoiceDate'], 'Enter the invoice date.')
  } else if (values.invoiceDate > toDayKey(context.now())) {
    add(['invoiceDate'], 'The invoice date cannot be in the future.')
  }

  if (parseInvoiceTotal(values.total) === null) {
    add(['total'], 'Enter the total from the invoice.')
  }

  if (values.lines.length === 0) {
    add(['lines'], NO_LINES_MESSAGE)
  }

  values.lines.forEach((line, index) => {
    if (!context.products.some((product) => product.id === line.productId)) {
      add(['lines'], 'A product on this invoice no longer exists.')
    } else if (parseWholeQuantity(line.quantity) === null) {
      add(['lines', index, 'quantity'], QUANTITY_MESSAGE)
    }
  })

  if (values.note.trim().length > INVOICE_NOTE_MAX) {
    add(['note'], `Keep the note under ${INVOICE_NOTE_MAX} characters.`)
  }

  return issues
}

/** Built per form, because uniqueness and "not in the future" depend on store data and the clock. */
export function makeInvoiceFormSchema(context: InvoiceFormContext) {
  return z
    .object({
      invoiceNumber: z.string(),
      supplier: z.string(),
      invoiceDate: z.string(),
      total: z.string(),
      lines: z.array(z.object({ productId: z.string(), quantity: z.string() })),
      note: z.string(),
    })
    .superRefine((values, refinement) => {
      for (const issue of invoiceFormIssues(values, context)) {
        refinement.addIssue({ code: z.ZodIssueCode.custom, ...issue })
      }
    })
}

/** Validated form values to the store's input. Blank note is omitted. */
export function toReceiveInvoiceInput(values: InvoiceFormValues): ReceiveInvoiceInput {
  const note = values.note.trim()

  return {
    invoiceNumber: normalizeSupplierInvoice(values.invoiceNumber) ?? values.invoiceNumber.trim(),
    supplier: normalizeSupplierName(values.supplier),
    invoiceDate: values.invoiceDate,
    total: parseInvoiceTotal(values.total) ?? 0,
    lines: values.lines.map((line) => ({
      productId: line.productId,
      quantity: parseWholeQuantity(line.quantity) ?? 0,
    })),
    note: note === '' ? undefined : note,
  }
}

/** What the picker offers: every product not already on the invoice (spec s.7.3). */
export function productsNotOnInvoice(products: Product[], lines: InvoiceLineValues[]): Product[] {
  const onInvoice = new Set(lines.map((line) => line.productId))

  return products.filter((product) => !onInvoice.has(product.id))
}

export type LineToAddResult =
  | { ok: true; line: InvoiceLineValues }
  | { ok: false; field: 'productId' | 'quantity'; message: string }

/** Checks the picker and its Quantity before "Add to invoice". */
export function validateLineToAdd(
  productId: string,
  quantity: string,
  lines: InvoiceLineValues[],
): LineToAddResult {
  if (productId === '') {
    return { ok: false, field: 'productId', message: CHOOSE_PRODUCT_MESSAGE }
  }

  if (lines.some((line) => line.productId === productId)) {
    return { ok: false, field: 'productId', message: 'That product is already on this invoice.' }
  }

  const parsed = parseWholeQuantity(quantity)

  if (parsed === null) {
    return { ok: false, field: 'quantity', message: QUANTITY_MESSAGE }
  }

  return { ok: true, line: { productId, quantity: String(parsed) } }
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`
}

/** "3 products, 120 units". Quantities not yet valid count as nothing. */
export function describeInvoiceLines(lines: InvoiceLineValues[]): string {
  const units = lines.reduce((sum, line) => sum + (parseWholeQuantity(line.quantity) ?? 0), 0)

  return `${plural(lines.length, 'product')}, ${plural(units, 'unit')}`
}

/** "2 products, 15 units" for a saved invoice. */
export function describeSavedLines(invoice: SupplierInvoice): string {
  return `${plural(invoice.lines.length, 'product')}, ${plural(invoiceUnitCount(invoice), 'unit')}`
}

/** Each invoiced product's stock on hand, read from the products after the save. */
export function stockAfterInvoice(
  invoice: SupplierInvoice,
  products: Product[],
): Map<string, number> {
  const stock = new Map<string, number>()

  for (const line of invoice.lines) {
    const product = products.find((candidate) => candidate.id === line.productId)

    if (product) {
      stock.set(line.productId, product.stock)
    }
  }

  return stock
}
