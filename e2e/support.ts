import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Shared helpers for the e2e specs. Every test runs in a fresh browser context,
 * so localStorage is empty and the app boots from its seed data.
 *
 * Figures are always read from the screen and compared as integer centavos;
 * no number is hardcoded from the seed (DESIGN-ERRATA E3, E4).
 */

/** "₱1,234.56", "PHP 1,234.56", "-₱5.00" or "1234.56" as integer centavos. */
export function toCentavos(text: string): number {
  const negative = /-/.test(text)
  const cleaned = text.replace(/[^\d.]/g, '')

  if (cleaned === '') {
    throw new Error(`No amount in "${text}"`)
  }

  const [whole, fraction = ''] = cleaned.split('.')
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2))

  return negative ? -value : value
}

/** "1,500" or "18 pcs" as a whole number. */
export function toCount(text: string): number {
  const match = text.replace(/,/g, '').match(/-?\d+/)

  if (!match) {
    throw new Error(`No count in "${text}"`)
  }

  return Number(match[0])
}

/** Centavos to the plain input form the app's amount fields accept: "640.00". */
export function toAmountInput(centavos: number): string {
  return (centavos / 100).toFixed(2)
}

/** Navigate to a HashRouter route such as '/sales/new'. */
export async function gotoRoute(page: Page, route: string): Promise<void> {
  await page.goto(`#${route}`)
  // Generous: the first request to a cold Vite dev server compiles on demand.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
}

/** The value line of a KPI tile (StatCard) identified by its label. */
export function statValue(page: Page, label: string): Locator {
  return page
    .locator('article')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('p')
    .nth(1)
}

/** The <dd> paired with a <dt> whose text matches exactly. */
export function definition(scope: Page | Locator, term: string | RegExp): Locator {
  return scope
    .locator('dt')
    .filter({ hasText: typeof term === 'string' ? new RegExp(`^${escape(term)}$`) : term })
    .locator('xpath=following-sibling::dd[1]')
}

/** A product tile on the POS screen. */
export function posCard(page: Page, productName: string): Locator {
  return page.getByRole('listitem').filter({ has: page.getByText(productName, { exact: true }) })
}

/** Search the POS catalogue and open the Add to Cart dialog for one product. */
export async function openAddDialog(page: Page, productName: string): Promise<Locator> {
  await page.getByRole('searchbox', { name: 'Search products' }).fill(productName)
  await posCard(page, productName).getByRole('button', { name: /add/i }).click()

  const dialog = page.getByRole('dialog', { name: 'Add to Cart' })
  await expect(dialog).toBeVisible()

  return dialog
}

/** Add `quantity` of a product to the cart through the dialog. */
export async function addToCart(page: Page, productName: string, quantity = 1): Promise<void> {
  const dialog = await openAddDialog(page, productName)
  const increase = dialog.getByRole('button', { name: 'Increase quantity' })

  for (let current = 1; current < quantity; current += 1) {
    await increase.click()
  }

  await expect(dialog.getByRole('group', { name: 'quantity' }).locator('output')).toHaveText(
    String(quantity),
  )
  await dialog.getByRole('button', { name: 'Add to Cart', exact: true }).click()
  await expect(dialog).toBeHidden()
}

/** The "Current Sale" cart panel on the POS screen. */
export function cartPanel(page: Page): Locator {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: /^Current Sale/ }) })
}

/** The TOTAL figure in a CartTotals block inside `scope`. */
export function cartTotal(scope: Locator): Locator {
  return scope.getByText(/^Total$/i).locator('xpath=following-sibling::span[1]')
}

/** On hand stock for one product, read from the Products list. */
export async function productStock(page: Page, productName: string): Promise<number> {
  await gotoRoute(page, '/products')
  await page.getByRole('searchbox', { name: 'Search products' }).fill(productName)

  const row = page.getByRole('row').filter({ has: page.getByText(productName, { exact: true }) })
  await expect(row).toHaveCount(1)

  const headers = await page.getByRole('columnheader').allInnerTexts()
  const stockColumn = headers.findIndex((header) => /^stock$/i.test(header.trim()))
  expect(stockColumn, 'Products table has a Stock column').toBeGreaterThanOrEqual(0)

  return toCount(await row.getByRole('cell').nth(stockColumn).innerText())
}

/** A customer's ledger balance, from their ledger page. */
export async function customerBalance(page: Page, customerId: string): Promise<number> {
  await gotoRoute(page, `/customers/${customerId}`)

  const value = page
    .getByRole('main')
    .getByText('Outstanding balance', { exact: true })
    .locator('xpath=following-sibling::p[1]')

  return toCentavos(await value.innerText())
}

export async function dashboardOutstanding(page: Page): Promise<number> {
  await gotoRoute(page, '/')

  return toCentavos(await statValue(page, 'Outstanding Credit').innerText())
}

export async function reportsOutstanding(page: Page): Promise<number> {
  await gotoRoute(page, '/reports')

  return toCentavos(await statValue(page, 'Total Outstanding').innerText())
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
