import { toDayKey } from '@/domain/dates'
import { isWholePositiveQuantity, normalizeSupplierInvoice } from '@/domain/inventory'
import type { Centavos } from '@/domain/money'
import { mergeCartLines } from '@/domain/sale'
import type {
  Product,
  StockMovement,
  SupplierInvoice,
  SupplierInvoiceLine,
  ValidationResult,
} from '@/domain/types'

/**
 * Receiving a delivery as one supplier invoice covering many products (spec 04
 * supplier invoices, D10). Every delivery has an invoice; a delivery without
 * paper goes through Adjust Stock.
 */

export const SUPPLIER_NAME_MAX = 80
export const INVOICE_NOTE_MAX = 200

/** What the Receive Stock form sends. */
export type ReceiveInvoiceInput = {
  /** "INV-10021" (E6). Case and surrounding spaces are forgiven. */
  invoiceNumber: string
  supplier: string
  /** DayKey, "2026-11-01": the date printed on the invoice. Not after today. */
  invoiceDate: string
  /** Integer centavos from the paper, more than zero. */
  total: Centavos
  /** At least one. A product listed twice is merged into one line. */
  lines: { productId: string; quantity: number }[]
  note?: string
}

export type InvoiceValidationContext = {
  invoices: SupplierInvoice[]
  movements: StockMovement[]
  products: Product[]
  /** The store clock; the invoice date may not be after its local day. */
  today: Date
}

const OK: ValidationResult = { ok: true, message: null }

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/** "Ram  Hardware " -> "Ram Hardware". */
export function normalizeSupplierName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** True for a real calendar day written as "YYYY-MM-DD". */
export function isValidDayKey(value: string): boolean {
  const match = DAY_KEY.exec(value)

  if (!match) {
    return false
  }

  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day)

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/**
 * True when the number is on a saved invoice or is any stock movement's
 * reference -- receipts saved before invoices existed keep their numbers
 * reserved. Compared after normalizing, so "inv-10021 " is taken too.
 */
export function isInvoiceNumberTaken(
  invoiceNumber: string,
  invoices: SupplierInvoice[],
  movements: StockMovement[],
): boolean {
  const number = normalizeSupplierInvoice(invoiceNumber) ?? invoiceNumber.trim().toUpperCase()

  if (number === '') {
    return false
  }

  return (
    invoices.some((invoice) => invoice.invoiceNumber.toUpperCase() === number) ||
    movements.some((movement) => movement.reference.trim().toUpperCase() === number)
  )
}

/** Every rule of spec s.5.2, first failure wins, in form order. */
export function validateSupplierInvoice(
  input: ReceiveInvoiceInput,
  context: InvoiceValidationContext,
): ValidationResult {
  const invoiceNumber = normalizeSupplierInvoice(input.invoiceNumber)

  if (invoiceNumber === null) {
    return { ok: false, message: 'Supplier invoice numbers look like INV-10021.' }
  }

  if (isInvoiceNumberTaken(invoiceNumber, context.invoices, context.movements)) {
    return { ok: false, message: `${invoiceNumber} is already recorded.` }
  }

  const supplier = normalizeSupplierName(input.supplier)

  if (supplier === '') {
    return { ok: false, message: 'Enter the supplier.' }
  }

  if (supplier.length > SUPPLIER_NAME_MAX) {
    return {
      ok: false,
      message: `Keep the supplier name under ${SUPPLIER_NAME_MAX} characters.`,
    }
  }

  if (!isValidDayKey(input.invoiceDate)) {
    return { ok: false, message: 'Enter the invoice date.' }
  }

  if (input.invoiceDate > toDayKey(context.today)) {
    return { ok: false, message: 'The invoice date cannot be in the future.' }
  }

  if (!Number.isSafeInteger(input.total) || input.total <= 0) {
    return { ok: false, message: 'Enter the total from the invoice.' }
  }

  if (input.lines.length === 0) {
    return { ok: false, message: 'Add at least one product.' }
  }

  for (const line of input.lines) {
    if (!context.products.some((product) => product.id === line.productId)) {
      return { ok: false, message: 'A product on this invoice no longer exists.' }
    }

    if (!isWholePositiveQuantity(line.quantity)) {
      return { ok: false, message: 'Enter a whole number of units greater than zero.' }
    }
  }

  // Merged lines must still be safe whole numbers.
  if (!mergeCartLines(input.lines).every((line) => isWholePositiveQuantity(line.quantity))) {
    return { ok: false, message: 'Enter a whole number of units greater than zero.' }
  }

  if ((input.note?.trim().length ?? 0) > INVOICE_NOTE_MAX) {
    return { ok: false, message: `Keep the note under ${INVOICE_NOTE_MAX} characters.` }
  }

  return OK
}

/**
 * The invoice record a valid input becomes: number normalized, supplier
 * tidied, one line per product (repeats added together) with name, SKU and
 * unit copied from the product. Null when the input is not valid.
 */
export function buildSupplierInvoice(
  input: ReceiveInvoiceInput,
  context: InvoiceValidationContext & { receivedBy: string },
): SupplierInvoice | null {
  const invoiceNumber = normalizeSupplierInvoice(input.invoiceNumber)

  if (!validateSupplierInvoice(input, context).ok || invoiceNumber === null) {
    return null
  }

  const lines: SupplierInvoiceLine[] = []

  for (const line of mergeCartLines(input.lines)) {
    const product = context.products.find((candidate) => candidate.id === line.productId)

    if (!product) {
      return null
    }

    lines.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity: line.quantity,
    })
  }

  const note = input.note?.trim() ?? ''

  return {
    invoiceNumber,
    supplier: normalizeSupplierName(input.supplier),
    invoiceDate: input.invoiceDate,
    total: input.total,
    lines,
    note: note === '' ? null : note,
    receivedBy: context.receivedBy,
    recordedAt: context.today.toISOString(),
  }
}

/** One stock_in per line (spec s.5.3), dated when the invoice was saved. */
export function buildInvoiceMovements(invoice: SupplierInvoice): StockMovement[] {
  return invoice.lines.map((line) => ({
    id: `MOV-${invoice.invoiceNumber}-${line.productId}`,
    productId: line.productId,
    type: 'stock_in',
    quantityDelta: line.quantity,
    reference: invoice.invoiceNumber,
    description: `Received from ${invoice.supplier}`,
    reason: null,
    note: null,
    recordedBy: invoice.receivedBy,
    occurredAt: invoice.recordedAt,
  }))
}

/** Distinct supplier names from saved invoices, A to Z, for the Supplier suggestions. */
export function knownSuppliers(invoices: SupplierInvoice[]): string[] {
  const names = new Map<string, string>()

  for (const invoice of invoices) {
    const name = normalizeSupplierName(invoice.supplier)
    const key = name.toLowerCase()

    if (name !== '' && !names.has(key)) {
      names.set(key, name)
    }
  }

  return [...names.values()].sort((a, b) => a.localeCompare(b))
}

/** Total units on the invoice, across every line. */
export function invoiceUnitCount(invoice: SupplierInvoice): number {
  return invoice.lines.reduce((sum, line) => sum + line.quantity, 0)
}

/** The Invoices list order (spec s.5.5): newest invoice date first, then newest recordedAt. */
export function sortInvoicesNewestFirst(invoices: SupplierInvoice[]): SupplierInvoice[] {
  return [...invoices].sort(
    (a, b) =>
      b.invoiceDate.localeCompare(a.invoiceDate) ||
      Date.parse(b.recordedAt) - Date.parse(a.recordedAt),
  )
}

/** The saved invoice with this number (case and spaces forgiven), or null. */
export function findInvoice(
  invoices: SupplierInvoice[],
  invoiceNumber: string,
): SupplierInvoice | null {
  const number = normalizeSupplierInvoice(invoiceNumber)

  return number === null
    ? null
    : (invoices.find((invoice) => invoice.invoiceNumber === number) ?? null)
}
