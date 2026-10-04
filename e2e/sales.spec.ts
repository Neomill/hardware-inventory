import { expect, test } from '@playwright/test'

import {
  addToCart,
  cartPanel,
  cartTotal,
  definition,
  gotoRoute,
  openAddDialog,
  posCard,
  productStock,
  toAmountInput,
  toCentavos,
  toCount,
} from './support'

const HAMMER = 'Claw Hammer 16oz'
const HAMMER_ID = 'HAM-016'

test.describe('Cash sale', () => {
  test('completes with correct change, lowers stock and logs a Sale movement', async ({ page }) => {
    const stockBefore = await productStock(page, HAMMER)
    expect(stockBefore).toBeGreaterThanOrEqual(2)

    await gotoRoute(page, '/sales/new')
    await addToCart(page, HAMMER, 2)

    const cart = cartPanel(page)
    const total = toCentavos(await cartTotal(cart).innerText())
    await cart.getByRole('button', { name: 'Proceed to Checkout' }).click()
    await expect(page).toHaveURL(/#\/sales\/checkout$/)

    // Cash is the default method, and the customer is optional for cash (E5).
    await expect(page.getByRole('button', { name: /^Cash/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const tendered = Math.ceil((total + 1) / 100_000) * 100_000 // next round thousand
    await page.getByLabel(/Cash received/).fill(toAmountInput(tendered))
    await page.getByRole('button', { name: 'Confirm Sale' }).click()

    await expect(page.getByRole('heading', { name: 'Sale Completed' })).toBeVisible()

    const totalSale = page
      .getByText('Total Sale', { exact: true })
      .locator('xpath=following-sibling::p[1]')
    expect(toCentavos(await totalSale.innerText())).toBe(total)

    const receipt = page.locator('section.receipt')
    expect(toCentavos(await definition(receipt, /^Paid by Cash$/).innerText())).toBe(tendered)
    expect(toCentavos(await definition(receipt, 'Change').innerText())).toBe(tendered - total)

    const saleNumber = (
      await page
        .getByText('Sale No.', { exact: true })
        .locator('xpath=following-sibling::p[1]')
        .innerText()
    ).trim()
    expect(saleNumber).toMatch(/^#\d{8}-\d{4}$/)

    // Stock decreased by exactly the quantity sold.
    expect(await productStock(page, HAMMER)).toBe(stockBefore - 2)

    // And the sale is in the movement log for that product.
    await gotoRoute(page, `/inventory/movements?product=${HAMMER_ID}`)
    const movement = page.getByRole('row').filter({ hasText: saleNumber })
    await expect(movement).toHaveCount(1)
    await expect(movement.getByRole('cell').nth(1)).toHaveText('Sale')
    await expect(movement).toContainText(/-2\b/)
  })

  test('checkout pre-fills Cash received with the exact total', async ({ page }) => {
    await gotoRoute(page, '/sales/new')
    await addToCart(page, HAMMER, 1)

    const total = toCentavos(await cartTotal(cartPanel(page)).innerText())
    await cartPanel(page).getByRole('button', { name: 'Proceed to Checkout' }).click()

    // Cash is selected on arrival, so the most common case is one tap (exact amount, no change).
    const cash = page.getByLabel(/Cash received/)
    await expect(cash).toHaveValue(toAmountInput(total))

    const change = page
      .getByText('Change', { exact: true })
      .locator('xpath=following-sibling::span[1]')
    expect(toCentavos(await change.innerText())).toBe(0)
    await expect(page.getByRole('button', { name: 'Confirm Sale' })).toBeEnabled()
  })
})

test.describe('Stock limits at the counter (E7)', () => {
  test('a zero-stock product cannot be added', async ({ page }) => {
    await gotoRoute(page, '/sales/new')
    await page.getByRole('searchbox', { name: 'Search products' }).fill('Door Knob')

    const card = posCard(page, 'Door Knob (Stainless)')
    await expect(card.getByText(/^0 pcs$/)).toBeVisible()
    await expect(card.getByRole('button', { name: /out of stock/i })).toBeDisabled()
    await expect(card.getByRole('button', { name: /^add$/i })).toHaveCount(0)
  })

  test('quantity is capped at the stock on hand', async ({ page }) => {
    const product = 'Adjustable Wrench 10"'

    await gotoRoute(page, '/sales/new')
    await page.getByRole('searchbox', { name: 'Search products' }).fill(product)
    const stock = toCount(
      await posCard(page, product)
        .getByText(/\d+ pcs/)
        .innerText(),
    )
    expect(stock).toBeGreaterThan(0)

    // Dialog: the stepper stops at stock.
    let dialog = await openAddDialog(page, product)
    const increase = dialog.getByRole('button', { name: 'Increase quantity' })
    for (let step = 1; step < stock; step += 1) {
      await increase.click()
    }
    await expect(dialog.getByRole('group', { name: 'quantity' }).locator('output')).toHaveText(
      String(stock),
    )
    await expect(increase).toBeDisabled()
    await dialog.getByRole('button', { name: 'Add to Cart', exact: true }).click()
    await expect(dialog).toBeHidden()

    // Cart: the line cannot go above stock either.
    const cart = cartPanel(page)
    const lineGroup = cart.getByRole('group', { name: `${product} quantity` })
    await expect(lineGroup.locator('output')).toHaveText(String(stock))
    await expect(lineGroup.getByRole('button', { name: /^Increase/ })).toBeDisabled()

    // Adding the same product again offers nothing more.
    dialog = await openAddDialog(page, product)
    await expect(dialog.getByText(/already in this sale/)).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Add to Cart', exact: true })).toBeDisabled()
  })
})

test.describe('VAT is inclusive (D1, E2)', () => {
  test('the total is the sum of the lines and VAT is only shown as included', async ({ page }) => {
    await gotoRoute(page, '/sales/new')
    await addToCart(page, HAMMER, 1)
    await addToCart(page, 'Masking Tape 2"', 3)

    const cart = cartPanel(page)
    const lineAmounts = await cart
      .getByRole('listitem')
      .locator('span.shrink-0, span.tabular-nums')
      .filter({ hasText: /₱|PHP/ })
      .allInnerTexts()
    const lineSum = lineAmounts.map(toCentavos).reduce((sum, value) => sum + value, 0)
    expect(lineAmounts).toHaveLength(2)

    const total = toCentavos(await cartTotal(cart).innerText())
    expect(total).toBe(lineSum)
    expect(toCentavos(await definition(cart, /^Subtotal/).innerText())).toBe(total)

    const vatNote = cart.getByText(/Includes VAT \((\d+(\.\d+)?)%\) of/)
    await expect(vatNote).toBeVisible()
    const [, ratePercent] = (await vatNote.innerText()).match(/\((\d+(?:\.\d+)?)%\)/) ?? []
    const rate = Number(ratePercent) / 100
    const shownVat = toCentavos((await vatNote.innerText()).split(' of ')[1])
    expect(shownVat).toBe(total - Math.round(total / (1 + rate)))

    // No "+ Tax" line anywhere on checkout, and the total is unchanged there.
    await cart.getByRole('button', { name: 'Proceed to Checkout' }).click()
    const main = page.getByRole('main')
    await expect(main.getByText(/^Tax\b/)).toHaveCount(0)
    expect(toCentavos(await cartTotal(main).innerText())).toBe(lineSum)
    await expect(main.getByText(/Includes VAT/)).toBeVisible()

    // The receipt keeps Subtotal = Total, VAT listed as included.
    await page.getByLabel(/Cash received/).fill(toAmountInput(total))
    await page.getByRole('button', { name: 'Confirm Sale' }).click()
    const receipt = page.locator('section.receipt')
    expect(toCentavos(await definition(receipt, 'Total').innerText())).toBe(lineSum)
    expect(toCentavos(await definition(receipt, /^Subtotal/).innerText())).toBe(lineSum)
    await expect(receipt.getByText(/^Includes VAT/)).toBeVisible()
  })
})
