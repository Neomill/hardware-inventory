import { ROUTES } from '@/app/routes'
import type { Centavos } from '@/domain/money'
import { isSaleCancelled } from '@/domain/saleCancellation'
import { findInvoice } from '@/domain/supplierInvoice'
import type { Sale, StockMovement, SupplierInvoice } from '@/domain/types'
import { formatNumber } from '@/lib/format'

/** Product Details (spec 04 s.5.4). Everything is read from store data at render time. */

/** How many movements and sales the details page lists before "View all". */
export const DETAIL_LIST_LIMIT = 10

/** One sale the product appeared in, as it was sold. */
export type ProductSaleRow = {
  saleId: string
  saleNumber: string
  occurredAt: string
  customerName: string
  /** Units of this product on the sale. */
  quantity: number
  /** SaleLine.unitPrice: the price at the time of sale, never today's price. */
  unitPrice: Centavos
  /** Sum of this product's line totals on the sale. */
  amount: Centavos
  cancelled: boolean
}

/**
 * The latest `limit` sales containing the product, any status, newest first.
 * A sale with the product on more than one line counts it once, with the
 * quantities and amounts added up.
 */
export function productSalesHistory(
  sales: Sale[],
  productId: string,
  limit = DETAIL_LIST_LIMIT,
): ProductSaleRow[] {
  const rows: ProductSaleRow[] = []

  for (const sale of sales) {
    const lines = sale.lines.filter((line) => line.productId === productId)

    if (lines.length === 0) {
      continue
    }

    rows.push({
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      occurredAt: sale.occurredAt,
      customerName: sale.customerName,
      quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      unitPrice: lines[0].unitPrice,
      amount: lines.reduce((sum, line) => sum + line.lineTotal, 0),
      cancelled: isSaleCancelled(sale),
    })
  }

  return rows
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, Math.max(0, limit))
}

/**
 * Where a movement's reference leads: a sale number to that sale, an invoice
 * number to that saved invoice. Null for a reference with no target (opening
 * stock, adjustments, a blank or unknown reference), which shows as text.
 */
export function movementReferenceLink(
  movement: StockMovement,
  sales: Sale[],
  invoices: SupplierInvoice[],
): string | null {
  const reference = movement.reference.trim()

  if (reference === '') {
    return null
  }

  if (movement.type === 'sale' || movement.type === 'sale_reversal') {
    const sale = sales.find((candidate) => candidate.saleNumber === reference)

    return sale ? ROUTES.saleDetail(sale.id) : null
  }

  if (movement.type === 'stock_in') {
    const invoice = findInvoice(invoices, reference)

    return invoice ? ROUTES.invoiceDetail(invoice.invoiceNumber) : null
  }

  return null
}

/** Router state Add Product hands to Product Details after a save. */
export type ProductAddedState = { addedOpeningStock: number }

export function productAddedState(openingStock: number): ProductAddedState {
  return { addedOpeningStock: openingStock }
}

/** The opening stock from router state, or null when the page was not reached from Add Product. */
export function readProductAddedState(state: unknown): number | null {
  const value = (state as Partial<ProductAddedState> | null)?.addedOpeningStock

  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** "Product added. Opening stock: 25 sack." */
export function productAddedNotice(openingStock: number, unit: string): string {
  return `Product added. Opening stock: ${formatNumber(openingStock)} ${unit}.`
}
