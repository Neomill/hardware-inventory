import { expect, test, type Page } from '@playwright/test'

import { gotoRoute, toCount } from './support'

const TAPE = 'Masking Tape 2"'
const TAPE_ID = 'TAP-002'

async function onHand(page: Page, productName: string): Promise<number> {
  await gotoRoute(page, '/inventory')
  await page.getByRole('searchbox', { name: 'Search inventory' }).fill(productName)

  const row = page.getByRole('row').filter({ has: page.getByText(productName, { exact: true }) })
  await expect(row).toHaveCount(1)

  const headers = await page.getByRole('columnheader').allInnerTexts()
  const column = headers.findIndex((header) => /^on hand$/i.test(header.trim()))
  expect(column, 'Inventory table has an On Hand column').toBeGreaterThanOrEqual(0)

  return toCount(await row.getByRole('cell').nth(column).innerText())
}

test('receiving stock raises stock and logs a Stock In movement', async ({ page }) => {
  const before = await onHand(page, TAPE)

  await gotoRoute(page, `/inventory/receive?product=${TAPE_ID}`)
  await expect(page.getByText(TAPE, { exact: true })).toBeVisible()
  await page.getByLabel(/^Quantity received/).fill('12')
  await page.getByRole('textbox', { name: /^Supplier(\s*\(?optional\)?)?$/i }).fill('Wilcon Depot')
  await page.getByLabel(/^Supplier invoice/).fill('INV-10999')
  await page.getByRole('button', { name: 'Receive Stock' }).click()

  await expect(page.getByRole('heading', { name: 'Stock Received' })).toBeVisible()
  await expect(page.getByRole('main')).toContainText(`${before + 12}`)

  expect(await onHand(page, TAPE)).toBe(before + 12)

  await gotoRoute(page, `/inventory/movements?product=${TAPE_ID}`)
  const movement = page.getByRole('row').filter({ hasText: 'INV-10999' })
  await expect(movement).toHaveCount(1)
  await expect(movement.getByRole('cell').nth(1)).toHaveText('Stock In')
  await expect(movement).toContainText('+12')
})

test('an adjustment that would take stock below zero is blocked', async ({ page }) => {
  const before = await onHand(page, TAPE)

  const row = page.getByRole('row').filter({ has: page.getByText(TAPE, { exact: true }) })
  await row.getByRole('button', { name: 'Adjust' }).click()

  const dialog = page.getByRole('dialog', { name: 'Adjust Stock' })
  await dialog.getByRole('radio', { name: 'Remove stock' }).click()
  await dialog.getByLabel(/^Quantity/).fill(String(before + 1))
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Physical count')

  await expect(dialog.getByText(/cannot go below zero/i)).toBeVisible()
  const save = dialog.getByRole('button', { name: 'Save Adjustment' })
  await expect(save).toBeDisabled()

  // Pressing Enter in the field must not sneak it through either.
  await dialog.getByRole('textbox', { name: 'Reason' }).press('Enter')
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  expect(await onHand(page, TAPE)).toBe(before)
})
