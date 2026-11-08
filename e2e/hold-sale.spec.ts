import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  addToCart,
  cartPanel,
  gotoRoute,
  posCard,
  productStock,
  toCentavos,
  toCount,
} from './support'

/**
 * Hold Sale, spec 03 s.10.4 (B1 to B9, B12) and AC16. Every figure is read
 * from the screen or the saved data; nothing is copied from the seed (E3, E4).
 */

const HAMMER = 'Claw Hammer 16oz'
const TAPE = 'Masking Tape 2"'
const MEASURE = 'Measuring Tape 5m'
const WRENCH = 'Adjustable Wrench 10"'

/** Where the app keeps its data (src/stores/shopPersistence.ts). */
const SHOP_STORAGE_KEY = 'olaer-store:shop'

/** Hold the current cart from the POS page; lands on the Sales root. */
async function holdCart(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: 'Hold Sale', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Hold Sale' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Label').fill(label)
  await dialog.getByLabel('Label').press('Enter')

  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/#\/sales$/)
  await expect(page.getByText('Sale held.')).toBeVisible()
}

/** Start a sale with the given products and hold it under `label`. */
async function holdNewSale(
  page: Page,
  label: string,
  items: Array<[product: string, quantity: number]>,
): Promise<void> {
  await gotoRoute(page, '/sales/new')
  for (const [product, quantity] of items) {
    await addToCart(page, product, quantity)
  }
  await holdCart(page, label)
}

function heldSalesButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Held Sales, / })
}

async function openHeldSales(page: Page): Promise<Locator> {
  await heldSalesButton(page).click()

  const dialog = page.getByRole('dialog', { name: 'Held Sales' })
  await expect(dialog).toBeVisible()

  return dialog
}

/** One held sale in the list, found by its label. */
function heldRow(dialog: Locator, label: string): Locator {
  return dialog
    .getByRole('listitem')
    .filter({ has: dialog.page().getByRole('heading', { name: label, exact: true }) })
}

/** The quantity shown for one product in the POS cart. */
function cartQuantity(page: Page, product: string): Locator {
  return cartPanel(page)
    .getByRole('group', { name: `${product} quantity` })
    .locator('output')
}

/** On hand stock as the POS card shows it ("4 pcs"). */
async function posStock(page: Page, product: string): Promise<number> {
  await page.getByRole('searchbox', { name: 'Search products' }).fill(product)
  const stock = toCount(
    await posCard(page, product)
      .getByText(/^\d[\d,]* \w+$/)
      .innerText(),
  )
  await page.getByRole('searchbox', { name: 'Search products' }).fill('')

  return stock
}

test.describe('Holding and resuming', () => {
  test('B1, B9: a held sale is listed with its label and survives a reload', async ({ page }) => {
    await gotoRoute(page, '/sales')
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, none waiting')

    await holdNewSale(page, 'Pedro', [
      [HAMMER, 2],
      [TAPE, 1],
    ])

    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 1 waiting')

    let dialog = await openHeldSales(page)
    let row = heldRow(dialog, 'Pedro')
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('3 items')
    await expect(row).toContainText(HAMMER)
    await expect(row).toContainText(TAPE)
    const heldAt = (await row.getByText(/^Held /).innerText()).trim()

    // Holding emptied the cart.
    await dialog.getByRole('button', { name: 'Close Held Sales' }).click()
    await gotoRoute(page, '/sales/new')
    await expect(page.getByRole('heading', { name: /^Current Sale \(0 items\)/ })).toBeVisible()

    await page.reload()
    await gotoRoute(page, '/sales')
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 1 waiting')
    dialog = await openHeldSales(page)
    row = heldRow(dialog, 'Pedro')
    await expect(row).toContainText('3 items')
    await expect(row.getByText(/^Held /)).toHaveText(heldAt)
  })

  test('B2: any held sale can be resumed, not only the newest', async ({ page }) => {
    await holdNewSale(page, 'First', [[HAMMER, 2]])
    await holdNewSale(page, 'Second', [[TAPE, 3]])
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 2 waiting')

    const dialog = await openHeldSales(page)
    // Newest first.
    await expect(dialog.getByRole('listitem').first()).toContainText('Second')
    await heldRow(dialog, 'First')
      .getByRole('button', { name: /^Resume First, held / })
      .click()

    await expect(page).toHaveURL(/#\/sales\/new$/)
    await expect(cartQuantity(page, HAMMER)).toHaveText('2')
    await expect(cartPanel(page).getByRole('group', { name: `${TAPE} quantity` })).toHaveCount(0)

    await gotoRoute(page, '/sales')
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 1 waiting')
  })

  test('B7: with a sale in progress, hold it and resume another in one step', async ({ page }) => {
    await holdNewSale(page, 'Waiting', [[HAMMER, 1]])

    // A new sale in progress.
    await gotoRoute(page, '/sales/new')
    await addToCart(page, MEASURE, 2)
    await gotoRoute(page, '/sales')

    const dialog = await openHeldSales(page)
    await expect(dialog.getByText(/You have a sale in progress \(2 items\)/)).toBeVisible()

    await heldRow(dialog, 'Waiting')
      .getByRole('button', { name: /^Hold current and resume Waiting, held / })
      .click()
    const label = dialog.getByLabel('Label for the sale in progress')
    await expect(label).toBeFocused()
    await label.fill('Swapped out')
    await dialog.getByRole('button', { name: 'Hold current and resume', exact: true }).click()

    await expect(page).toHaveURL(/#\/sales\/new$/)
    await expect(cartQuantity(page, HAMMER)).toHaveText('1')
    await expect(cartPanel(page).getByRole('group', { name: `${MEASURE} quantity` })).toHaveCount(0)

    // One went out, one came in: the count is unchanged.
    await gotoRoute(page, '/sales')
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 1 waiting')
    const list = await openHeldSales(page)
    await expect(heldRow(list, 'Swapped out')).toContainText('2 items')
  })
})

test.describe('Discarding', () => {
  test('B6: Keep leaves it, Discard removes it, and stock is unchanged', async ({ page }) => {
    const stockBefore = await productStock(page, HAMMER)

    await holdNewSale(page, 'To discard', [[HAMMER, 2]])
    let dialog = await openHeldSales(page)
    const row = heldRow(dialog, 'To discard')

    await row.getByRole('button', { name: /^Discard To discard, held / }).click()
    await expect(row.getByText(/^Discard this held sale\?/)).toBeVisible()
    const keep = row.getByRole('button', { name: 'Keep', exact: true })
    await expect(keep).toBeFocused()
    await keep.click()
    await expect(row).toHaveCount(1)

    await row.getByRole('button', { name: /^Discard To discard, held / }).click()
    await row.getByRole('button', { name: 'Discard', exact: true }).click()
    await expect(dialog.getByRole('listitem')).toHaveCount(0)
    await expect(dialog.getByText(/^No held sales\./)).toBeVisible()

    await dialog.getByRole('button', { name: 'Close Held Sales' }).click()
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, none waiting')

    // Holding and discarding never touch stock (AC7).
    expect(await productStock(page, HAMMER)).toBe(stockBefore)

    await gotoRoute(page, '/sales')
    dialog = await openHeldSales(page)
    await expect(dialog.getByRole('listitem')).toHaveCount(0)
  })
})

test.describe('What changed while held', () => {
  test('B3 to B5: stock sold while held is flagged, clamped on resume, never negative', async ({
    page,
  }) => {
    await gotoRoute(page, '/sales/new')
    const stock = await posStock(page, WRENCH)
    expect(stock).toBeGreaterThanOrEqual(2)

    // Hold every wrench there is.
    await addToCart(page, WRENCH, stock)
    await holdCart(page, 'All wrenches')

    // Sell one in another sale.
    await gotoRoute(page, '/sales/new')
    await addToCart(page, WRENCH, 1)
    await cartPanel(page).getByRole('button', { name: 'Proceed to Checkout' }).click()
    await page.getByRole('button', { name: 'Confirm Sale' }).click()
    await expect(page.getByRole('heading', { name: 'Sale Completed' })).toBeVisible()

    await gotoRoute(page, '/sales')
    const dialog = await openHeldSales(page)
    const row = heldRow(dialog, 'All wrenches')
    await expect(row.getByText('Stock changed', { exact: true })).toBeVisible()

    await row.getByRole('button', { name: /^Resume All wrenches, held / }).click()
    await expect(page).toHaveURL(/#\/sales\/new$/)
    await expect(cartQuantity(page, WRENCH)).toHaveText(String(stock - 1))

    const notice = page.getByRole('status').filter({ hasText: 'changed since it was held' })
    await expect(notice).toContainText(WRENCH)
    await expect(notice).toContainText(String(stock))
    await expect(notice).toContainText(String(stock - 1))

    // Selling what is left takes stock to zero, not below.
    await cartPanel(page).getByRole('button', { name: 'Proceed to Checkout' }).click()
    await page.getByRole('button', { name: 'Confirm Sale' }).click()
    await expect(page.getByRole('heading', { name: 'Sale Completed' })).toBeVisible()
    expect(await productStock(page, WRENCH)).toBe(0)
  })

  test('B12: a price changed while held is flagged and the cart uses the new price', async ({
    page,
  }) => {
    await holdNewSale(page, 'Price check', [[MEASURE, 1]])

    // The app has no price editor yet, so change the saved price directly.
    const prices = await page.evaluate(
      ({ key, product }) => {
        const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null') as {
          state: { products: Array<{ name: string; price: number }> }
        }
        const target = saved.state.products.find((candidate) => candidate.name === product)

        if (!target) {
          throw new Error(`No saved product named ${product}`)
        }

        const before = target.price
        target.price = before + 500
        window.localStorage.setItem(key, JSON.stringify(saved))

        return { before, after: target.price }
      },
      { key: SHOP_STORAGE_KEY, product: MEASURE },
    )
    await page.reload()
    await gotoRoute(page, '/sales')

    const dialog = await openHeldSales(page)
    const row = heldRow(dialog, 'Price check')
    await expect(row.getByText('Prices changed', { exact: true })).toBeVisible()

    await row.getByRole('button', { name: /^Resume Price check, held / }).click()
    await expect(page).toHaveURL(/#\/sales\/new$/)

    const notice = page.getByRole('status').filter({ hasText: 'changed since it was held' })
    const sentence = notice.getByText(new RegExp(`^${escapeRegExp(MEASURE)} is now `))
    await expect(sentence).toBeVisible()
    const [, now, was] =
      (await sentence.innerText()).match(/is now (.+) \(was (.+) when held\)/) ?? []
    expect(toCentavos(now)).toBe(prices.after)
    expect(toCentavos(was)).toBe(prices.before)

    // The cart line is priced at today's price.
    const line = cartPanel(page).getByRole('listitem').filter({ hasText: MEASURE })
    expect(toCentavos(await line.getByText(/\/ \w+$/).innerText())).toBe(prices.after)
  })
})

test.describe('Clearing the cart asks first', () => {
  test('Keep Items leaves the cart; Clear Cart empties it', async ({ page }) => {
    await gotoRoute(page, '/sales/new')
    const clear = cartPanel(page).getByRole('button', { name: 'Clear', exact: true })
    await expect(clear).toHaveCount(0)

    await addToCart(page, HAMMER, 2)
    await clear.click()

    let dialog = page.getByRole('dialog', { name: 'Clear this sale?' })
    await expect(dialog).toContainText('2 items')
    await expect(dialog.getByRole('button', { name: 'Keep Items' })).toBeFocused()

    // Escape and Keep Items both leave everything as it was, focus back on Clear.
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(clear).toBeFocused()
    await clear.click()
    dialog = page.getByRole('dialog', { name: 'Clear this sale?' })
    await dialog.getByRole('button', { name: 'Keep Items' }).click()
    await expect(dialog).toBeHidden()
    await expect(cartQuantity(page, HAMMER)).toHaveText('2')

    await clear.click()
    await page
      .getByRole('dialog', { name: 'Clear this sale?' })
      .getByRole('button', { name: 'Clear Cart' })
      .click()
    const heading = page.getByRole('heading', { name: /^Current Sale \(0 items\)/ })
    await expect(heading).toBeVisible()
    await expect(heading).toBeFocused()
    await expect(clear).toHaveCount(0)
  })
})

test.describe('Sale page wording', () => {
  test('says Sale Completed only on arrival from checkout, not after a reload', async ({
    page,
  }) => {
    await gotoRoute(page, '/sales/new')
    await addToCart(page, HAMMER, 1)
    await cartPanel(page).getByRole('button', { name: 'Proceed to Checkout' }).click()
    await page.getByRole('button', { name: 'Confirm Sale' }).click()
    await expect(page.getByRole('heading', { name: 'Sale Completed' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('section.receipt')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sale Completed' })).toHaveCount(0)
    await expect(page.getByText(/^This sale reduced stock for 1 product/)).toBeVisible()
  })
})

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
