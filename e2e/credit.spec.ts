import { expect, test, type Page } from '@playwright/test'

import {
  addToCart,
  cartPanel,
  customerBalance,
  dashboardOutstanding,
  definition,
  gotoRoute,
  reportsOutstanding,
  toAmountInput,
  toCentavos,
} from './support'

const CUSTOMER_ID = 'CUS-008'
const CUSTOMER_NAME = 'Rosa Mendoza'

type Balances = { ledger: number; dashboard: number; reports: number }

async function readBalances(page: Page): Promise<Balances> {
  return {
    ledger: await customerBalance(page, CUSTOMER_ID),
    dashboard: await dashboardOutstanding(page),
    reports: await reportsOutstanding(page),
  }
}

test('credit sale needs a customer and moves the ledger, dashboard and reports together', async ({
  page,
}) => {
  const before = await readBalances(page)
  // The three figures describe the same store-wide balance.
  expect(before.dashboard).toBe(before.reports)

  await gotoRoute(page, '/sales/new')
  await addToCart(page, 'Measuring Tape 5m', 2)
  await cartPanel(page).getByRole('button', { name: 'Proceed to Checkout' }).click()

  await page.getByRole('button', { name: /^Credit/ }).click()
  const confirm = page.getByRole('button', { name: 'Confirm Sale' })
  const customer = page.getByRole('combobox', { name: 'Customer' })

  // Walk-in is blocked for credit (E5).
  await expect(customer).toHaveValue('walk-in')
  await expect(page.getByText(/Choose a customer/)).toBeVisible()
  await expect(confirm).toBeDisabled()

  await customer.selectOption({ label: CUSTOMER_NAME })
  await expect(page.getByText(/Choose a customer/)).toHaveCount(0)
  await expect(confirm).toBeEnabled()
  await confirm.click()

  await expect(page.getByRole('heading', { name: 'Sale Completed' })).toBeVisible()
  const total = toCentavos(
    await page
      .getByText('Total Sale', { exact: true })
      .locator('xpath=following-sibling::p[1]')
      .innerText(),
  )
  const receipt = page.locator('section.receipt')
  expect(toCentavos(await definition(receipt, 'Balance at time of sale').innerText())).toBe(total)

  const afterSale = await readBalances(page)
  expect(afterSale).toEqual({
    ledger: before.ledger + total,
    dashboard: before.dashboard + total,
    reports: before.reports + total,
  })

  // Collect the same amount; every figure comes back down.
  await gotoRoute(page, `/customers/${CUSTOMER_ID}`)
  await page.getByRole('main').getByRole('button', { name: 'Record Payment' }).click()
  const dialog = page.getByRole('dialog', { name: 'Record Payment' })
  await dialog.getByLabel('Amount received').fill(toAmountInput(total))
  await dialog.getByRole('button', { name: /^Record (₱|PHP)/ }).click()
  await expect(dialog).toBeHidden()

  const afterPayment = await readBalances(page)
  expect(afterPayment).toEqual(before)
})
