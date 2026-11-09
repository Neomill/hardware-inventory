import { expect, test, type Page } from '@playwright/test'

import { definition, gotoRoute, productStock, toCentavos, toCount } from './support'

const TAPE = 'Masking Tape 2"'

async function onHand(page: Page, productName: string): Promise<number> {
  await gotoRoute(page, '/inventory')
  await page.getByRole('searchbox', { name: 'Search inventory' }).fill(productName)

  const row = page.getByRole('row').filter({ has: page.getByText(productName, { exact: true }) })
  await expect(row).toHaveCount(1)

  const headers = await page.getByRole('columnheader').allInnerTexts()
  const column = headers.findIndex((header) => /^stock$/i.test(header.trim()))
  expect(column, 'Inventory table has a Stock column').toBeGreaterThanOrEqual(0)

  return toCount(await row.getByRole('cell').nth(column).innerText())
}

const PIPE = 'PVC Pipe 1/2"'
const CEMENT = 'Cement (Holcim)'

/** "YYYY-MM-DD" for the local day `offset` days from today, as a date input takes it. */
function dayKey(offset = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

async function fillInvoice(
  page: Page,
  invoice: { number: string; supplier: string; total: string; date?: string },
): Promise<void> {
  await page.getByLabel('Invoice number').fill(invoice.number)
  await page.getByLabel('Supplier', { exact: true }).fill(invoice.supplier)
  await page.getByLabel('Invoice date').fill(invoice.date ?? dayKey())
  await page.getByLabel('Invoice total (PHP)').fill(invoice.total)
}

async function addLine(page: Page, productName: string, quantity: number): Promise<void> {
  await page.getByRole('searchbox', { name: /Search for the delivered product/ }).fill(productName)
  await page
    .getByRole('list', { name: 'Matching products' })
    .getByRole('button')
    .filter({ has: page.getByText(productName, { exact: true }) })
    .click()
  await page.getByRole('textbox', { name: /^Quantity( \(.+\))?$/ }).fill(String(quantity))
  await page.getByRole('button', { name: 'Add to invoice' }).click()
  await expect(
    page.getByRole('list', { name: 'Products on this invoice' }).getByText(productName, {
      exact: true,
    }),
  ).toBeVisible()
}

async function submitInvoice(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Receive Stock', exact: true }).click()
}

test('B1: one supplier invoice raises stock for every product on it', async ({ page }) => {
  const pipeBefore = await productStock(page, PIPE)
  const cementBefore = await productStock(page, CEMENT)

  await gotoRoute(page, '/inventory/receive')
  await fillInvoice(page, { number: 'INV-10050', supplier: 'ABC Trading', total: '5,000' })
  await addLine(page, PIPE, 10)
  await addLine(page, CEMENT, 5)
  await expect(page.getByText('2 products, 15 units')).toBeVisible()
  await submitInvoice(page)

  await expect(page.getByRole('heading', { name: 'Stock Received' })).toBeVisible()
  const received = page.getByRole('list', { name: 'Products received' })
  await expect(received.getByRole('listitem')).toHaveCount(2)
  await expect(received.getByRole('listitem').filter({ hasText: PIPE })).toContainText('+10')
  await expect(received.getByRole('listitem').filter({ hasText: CEMENT })).toContainText('+5')

  // The Receive Stock tab always opens a blank form, never the old confirmation.
  await page
    .getByRole('navigation', { name: 'Inventory views' })
    .getByRole('link', { name: /Receive/ })
    .click()
  await expect(page.getByRole('heading', { name: 'Stock Received' })).toBeHidden()
  await expect(page.getByLabel('Invoice number')).toHaveValue('')

  expect(await productStock(page, PIPE)).toBe(pipeBefore + 10)
  expect(await productStock(page, CEMENT)).toBe(cementBefore + 5)

  await gotoRoute(page, '/inventory/movements')
  const movements = page.getByRole('row').filter({ hasText: 'INV-10050' })
  await expect(movements).toHaveCount(2)
  for (const row of await movements.all()) {
    await expect(row.getByRole('cell').nth(1)).toHaveText('Stock In')
  }
  await expect(movements.filter({ hasText: PIPE })).toContainText('+10')
  await expect(movements.filter({ hasText: CEMENT })).toContainText('+5')

  // B2: the Invoices tab lists it and opens its page.
  await page
    .getByRole('navigation', { name: 'Inventory views' })
    .getByRole('link', { name: /Invoices/ })
    .click()
  await page.getByRole('link', { name: 'INV-10050', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'INV-10050' })).toBeVisible()
  await expect(definition(page.getByRole('main'), 'Supplier')).toHaveText('ABC Trading')
  const total = page
    .getByText('Invoice total', { exact: true })
    .locator('xpath=following-sibling::p[1]')
  expect(toCentavos(await total.innerText())).toBe(500000)
  const lines = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Products received' }) })
    .getByRole('row')
  // Header row plus one per product.
  await expect(lines).toHaveCount(3)
  await expect(lines.filter({ hasText: PIPE })).toContainText('10')
  await expect(lines.filter({ hasText: CEMENT })).toContainText('5')
})

test('B3: a duplicate number, a future date and no lines are each refused', async ({ page }) => {
  const pipeBefore = await productStock(page, PIPE)

  await gotoRoute(page, '/inventory/receive')
  await fillInvoice(page, { number: 'INV-10021', supplier: 'ABC Trading', total: '1,000' })
  await addLine(page, PIPE, 3)
  await submitInvoice(page)
  await expect(page.getByText('INV-10021 is already recorded.')).toBeVisible()

  await page.getByLabel('Invoice number').fill('INV-10051')
  await page.getByLabel('Invoice date').fill(dayKey(1))
  await submitInvoice(page)
  await expect(page.getByText('The invoice date cannot be in the future.')).toBeVisible()
  await expect(page.getByText('INV-10021 is already recorded.')).toBeHidden()

  await page.getByLabel('Invoice date').fill(dayKey())
  await page.getByRole('button', { name: `Remove ${PIPE}` }).click()
  await submitInvoice(page)
  await expect(page.getByText('Add at least one product.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Stock Received' })).toBeHidden()

  // Nothing was written.
  await gotoRoute(page, '/inventory/invoices')
  await page.getByRole('searchbox', { name: 'Search invoices' }).fill('INV-10051')
  await expect(page.getByText('No invoices match your search.')).toBeVisible()
  expect(await productStock(page, PIPE)).toBe(pipeBefore)
})

test('B4: Receive stock from a product row opens the invoice with that product', async ({
  page,
}) => {
  await gotoRoute(page, '/products')
  await page.getByRole('searchbox', { name: 'Search products' }).fill(CEMENT)
  await expect(page.getByText('1-1 of 1')).toBeVisible()
  await page.getByRole('link', { name: `Receive stock for ${CEMENT}` }).click()

  await expect(page.getByRole('heading', { name: 'Receive Stock' })).toBeVisible()
  const lines = page.getByRole('list', { name: 'Products on this invoice' })
  await expect(lines.getByRole('listitem')).toHaveCount(1)
  await expect(lines).toContainText(CEMENT)
})

test('an adjustment that would take stock below zero is blocked', async ({ page }) => {
  const before = await onHand(page, TAPE)

  const row = page.getByRole('row').filter({ has: page.getByText(TAPE, { exact: true }) })
  await row.getByRole('button', { name: 'Correct Stock' }).click()

  const dialog = page.getByRole('dialog', { name: 'Correct Stock' })
  await dialog.getByRole('radio', { name: 'Remove stock' }).click()
  await dialog.getByLabel(/^Quantity/).fill(String(before + 1))
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Physical count')

  await expect(dialog.getByText(/cannot go below zero/i)).toBeVisible()
  const save = dialog.getByRole('button', { name: 'Save Correction' })
  await expect(save).toBeDisabled()

  // Pressing Enter in the field must not sneak it through either.
  await dialog.getByRole('textbox', { name: 'Reason' }).press('Enter')
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  expect(await onHand(page, TAPE)).toBe(before)
})
