import { expect, test, type Page } from '@playwright/test'

import {
  addToCart,
  cartPanel,
  cartTotal,
  gotoRoute,
  toAmountInput,
  toCentavos,
  toCount,
} from './support'

const NEW_NAME = 'Olaer Test Hardware'
const NEW_VAT = '10'

async function salesCount(page: Page): Promise<number> {
  const count = page.locator('dt', { hasText: /^Sales$/ }).locator('xpath=following-sibling::dd[1]')

  return toCount(await count.innerText())
}

test('store name and VAT persist, appear on the receipt, and Reset restores the seed', async ({
  page,
}) => {
  await gotoRoute(page, '/settings')
  const storeName = page.getByLabel('Store name')
  const vat = page.getByLabel('VAT rate')
  const seedName = await storeName.inputValue()
  const seedVat = await vat.inputValue()
  const seedSales = await salesCount(page)
  expect(seedName).not.toBe(NEW_NAME)

  await storeName.fill(NEW_NAME)
  await vat.fill(NEW_VAT)
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Settings saved' })).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Store name')).toHaveValue(NEW_NAME)
  await expect(page.getByLabel('VAT rate')).toHaveValue(NEW_VAT)

  // A new sale uses the new name on its receipt and records the new rate.
  await gotoRoute(page, '/sales/new')
  await addToCart(page, 'Claw Hammer 16oz', 1)
  const total = toCentavos(await cartTotal(cartPanel(page)).innerText())
  await expect(
    cartPanel(page).getByText(`Includes VAT (${NEW_VAT}%)`, { exact: false }),
  ).toBeVisible()
  await cartPanel(page).getByRole('button', { name: 'Proceed to Checkout' }).click()
  await page.getByLabel(/Cash received/).fill(toAmountInput(total))
  await page.getByRole('button', { name: 'Confirm Sale' }).click()

  const receipt = page.locator('section.receipt')
  await expect(receipt.getByRole('heading', { level: 2 })).toHaveText(NEW_NAME)
  await expect(receipt.getByText(`Includes VAT (${NEW_VAT}%)`)).toBeVisible()

  // Reset puts everything back to the demo data.
  await gotoRoute(page, '/settings')
  expect(await salesCount(page)).toBe(seedSales + 1)
  await page.getByRole('button', { name: 'Reset demo data' }).click()
  const dialog = page.getByRole('dialog', { name: 'Reset demo data?' })
  await dialog.getByRole('button', { name: 'Reset data' }).click()
  await expect(dialog).toBeHidden()

  await expect(page.getByLabel('Store name')).toHaveValue(seedName)
  await expect(page.getByLabel('VAT rate')).toHaveValue(seedVat)
  expect(await salesCount(page)).toBe(seedSales)

  await page.reload()
  await expect(page.getByLabel('Store name')).toHaveValue(seedName)
})
