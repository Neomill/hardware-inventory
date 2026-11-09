import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  addToCart,
  customerBalance,
  gotoRoute,
  proceedToCheckout,
  productStock,
  statValue,
  toAmountInput,
  toCentavos,
} from './support'

/**
 * Sale cancellation, spec 04 s.10.5 (B1 to B5). Every figure is read from the
 * screen and compared as centavos; nothing is copied from the seed (E3, E4).
 */

const HAMMER = 'Claw Hammer 16oz'
const HAMMER_ID = 'HAM-016'
const CUSTOMER_ID = 'CUS-008'
const CUSTOMER_NAME = 'Rosa Mendoza'

type RecordedSale = { saleId: string; saleNumber: string; total: number }

/** Sell `quantity` hammers and land on the sale page. Credit needs the customer (E5). */
async function sellHammers(
  page: Page,
  quantity: number,
  method: 'cash' | 'credit' = 'cash',
): Promise<RecordedSale> {
  await gotoRoute(page, '/sales/new')
  await addToCart(page, HAMMER, quantity)
  await proceedToCheckout(page)

  if (method === 'credit') {
    await page.getByRole('button', { name: /^Credit/ }).click()
    await page.getByRole('combobox', { name: 'Customer' }).selectOption({ label: CUSTOMER_NAME })
  }

  await page.getByRole('button', { name: 'Confirm Sale' }).click()
  await expect(page.getByRole('heading', { name: 'Sale Completed' })).toBeVisible()

  const saleId = decodeURIComponent(page.url().split('#/sales/')[1] ?? '')
  expect(saleId).not.toBe('')

  const saleNumber = (await summaryValue(page, 'Sale No.').innerText()).trim()
  const total = toCentavos(await summaryValue(page, 'Total Sale').innerText())

  return { saleId, saleNumber, total }
}

function summaryValue(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).first().locator('xpath=following-sibling::p[1]')
}

function cancelButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'Cancel Sale', exact: true })
}

async function openCancelDialog(page: Page, saleNumber: string): Promise<Locator> {
  await cancelButton(page).click()
  const dialog = page.getByRole('dialog', { name: `Cancel sale ${saleNumber}?` })
  await expect(dialog).toBeVisible()

  return dialog
}

async function cancelWithReason(page: Page, saleNumber: string, reason: string): Promise<void> {
  const dialog = await openCancelDialog(page, saleNumber)
  await dialog.getByLabel('Reason').fill(reason)
  await dialog.getByRole('button', { name: 'Cancel Sale', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Cancelled', exact: true })).toBeVisible()
}

async function dashboardTodaysSales(page: Page): Promise<number> {
  await gotoRoute(page, '/')

  return toCentavos(await statValue(page, "Today's Sales").innerText())
}

test.describe('Cancel a sale (spec 04 sale cancellation)', () => {
  test('B1: Keep Sale changes nothing', async ({ page }) => {
    const stockBefore = await productStock(page, HAMMER)
    const sale = await sellHammers(page, 2)

    const dialog = await openCancelDialog(page, sale.saleNumber)
    await dialog.getByRole('button', { name: 'Keep Sale' }).click()
    await expect(dialog).toBeHidden()

    await expect(page.getByRole('heading', { name: 'Cancelled', exact: true })).toHaveCount(0)
    await expect(cancelButton(page)).toBeEnabled()
    expect(await productStock(page, HAMMER)).toBe(stockBefore - 2)
  })

  test('B2: a reason is required; cancelling returns stock and leaves the day’s sales', async ({
    page,
  }) => {
    const stockBefore = await productStock(page, HAMMER)
    const todaysSalesBefore = await dashboardTodaysSales(page)
    const sale = await sellHammers(page, 2)

    // Empty reason: refused, the dialog stays open.
    const dialog = await openCancelDialog(page, sale.saleNumber)
    await dialog.getByRole('button', { name: 'Cancel Sale', exact: true }).click()
    await expect(dialog.getByText('Give a reason for cancelling this sale.')).toBeVisible()
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Reason').fill('Wrong item')
    await dialog.getByRole('button', { name: 'Cancel Sale', exact: true }).click()
    await expect(dialog).toBeHidden()

    await expect(page.getByRole('heading', { name: 'Cancelled', exact: true })).toBeVisible()
    await expect(page.getByText('Reason: Wrong item.')).toBeVisible()
    await expect(page.getByText('Sale cancelled. Stock returned.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sale Completed' })).toHaveCount(0)
    await expect(cancelButton(page)).toHaveCount(0)

    // Stock is back on Products.
    expect(await productStock(page, HAMMER)).toBe(stockBefore)

    // A Reversal row with the sale number in Stock Movements.
    await gotoRoute(page, `/inventory/movements?product=${HAMMER_ID}`)
    const reversal = page
      .getByRole('row')
      .filter({ hasText: sale.saleNumber })
      .filter({ hasText: 'Sale Cancelled' })
    await expect(reversal).toHaveCount(1)
    await expect(reversal).toContainText(/\+2\b/)

    // Today's Sales is back to before.
    expect(await dashboardTodaysSales(page)).toBe(todaysSalesBefore)
  })

  test('B3: cancelling a credit sale brings the customer’s balance back', async ({ page }) => {
    const balanceBefore = await customerBalance(page, CUSTOMER_ID)
    const sale = await sellHammers(page, 1, 'credit')
    expect(await customerBalance(page, CUSTOMER_ID)).toBe(balanceBefore + sale.total)

    await gotoRoute(page, `/sales/${sale.saleId}`)
    await cancelWithReason(page, sale.saleNumber, 'Keyed in twice')

    expect(await customerBalance(page, CUSTOMER_ID)).toBe(balanceBefore)
  })

  test('B4: a credit sale with a payment applied cannot be cancelled', async ({ page }) => {
    const sale = await sellHammers(page, 1, 'credit')

    // Pay the customer's whole balance, so this sale is certainly covered.
    const balance = await customerBalance(page, CUSTOMER_ID)
    await page.getByRole('main').getByRole('button', { name: 'Record Payment' }).click()
    const payment = page.getByRole('dialog', { name: 'Record Payment' })
    await payment.getByLabel('Amount received').fill(toAmountInput(balance))
    await payment.getByRole('button', { name: /^Record (₱|PHP)/ }).click()
    await expect(payment).toBeHidden()

    await gotoRoute(page, `/sales/${sale.saleId}`)
    await expect(cancelButton(page)).toBeDisabled()

    const message = page.getByText(/You can't cancel this sale\./)
    await expect(message).toBeVisible()
    const text = await message.innerText()
    expect(text).toContain(CUSTOMER_NAME)
    const [, paid] = text.match(/has already paid (.+?) toward it/) ?? []
    expect(toCentavos(paid ?? '')).toBe(sale.total)
  })

  test('B5: a cancelled sale stays cancelled after reload and leaves the dashboard list', async ({
    page,
  }) => {
    const sale = await sellHammers(page, 1)
    await cancelWithReason(page, sale.saleNumber, 'Customer changed his mind')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Cancelled', exact: true })).toBeVisible()
    await expect(page.getByText('Reason: Customer changed his mind.')).toBeVisible()

    await gotoRoute(page, '/sales')
    await page.getByRole('searchbox', { name: 'Search sales' }).fill(sale.saleNumber)
    const row = page.getByRole('row').filter({ hasText: sale.saleNumber })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('Cancelled')
    await expect(row).not.toContainText('Paid')

    await gotoRoute(page, '/')
    const recentSales = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Recent Sales' }) })
    await expect(recentSales.getByText(sale.saleNumber)).toHaveCount(0)
  })
})
