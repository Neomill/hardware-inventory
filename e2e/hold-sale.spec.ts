import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  addToCart,
  cartPanel,
  cartSheet,
  closeCart,
  gotoRoute,
  openCart,
  posCard,
  proceedToCheckout,
  productStock,
  toCentavos,
  toCount,
} from './support'

/**
 * Hold Sale, spec 03 s.10.4 (B1 to B12) and AC16. Every figure is read from
 * the screen or the saved data; nothing is copied from the seed (E3, E4).
 */

const HAMMER = 'Claw Hammer 16oz'
const TAPE = 'Masking Tape 2"'
const MEASURE = 'Measuring Tape 5m'
const WRENCH = 'Adjustable Wrench 10"'

/** Where the app keeps its data (src/stores/shopPersistence.ts). */
const SHOP_STORAGE_KEY = 'olaer-store:shop'

/** At xl the cart sits beside the grid; below it, in a bottom sheet. */
function isCartBesideGrid(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 1280
}

/** Hold the current cart from the POS page; lands on the Sales root. */
async function holdCart(page: Page, label: string): Promise<void> {
  const cart = await openCart(page)
  await cart.getByRole('button', { name: 'Hold Sale', exact: true }).click()

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

/** The Held Sales button, on the Sales root or the POS page. */
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

/** The quantity stepper for one product in the POS cart. */
function cartLine(cart: Locator, product: string): Locator {
  return cart.getByRole('group', { name: `${product} quantity` })
}

/**
 * Checks the POS cart holds `quantity` of a product (0: not in the cart), then
 * closes the sheet again below xl so the page stays usable.
 */
async function expectInCart(page: Page, product: string, quantity: number): Promise<void> {
  const cart = await openCart(page)

  if (quantity === 0) {
    await expect(cartLine(cart, product)).toHaveCount(0)
  } else {
    await expect(cartLine(cart, product).locator('output')).toHaveText(String(quantity))
  }

  await closeCart(page)
}

/** The POS cart is empty: "0 items" beside the grid, no cart bar below xl. */
async function expectEmptyCart(page: Page): Promise<void> {
  if (isCartBesideGrid(page)) {
    await expect(page.getByRole('heading', { name: /^Current Sale \(0 items\)/ })).toBeVisible()
  } else {
    await expect(page.getByRole('region', { name: 'Cart summary' })).toHaveCount(0)
  }
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

/** No sideways scroll on the page or in the app's scrolling column. */
async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const scroller = document.querySelector('main')?.parentElement
    const pageOverflow = document.documentElement.scrollWidth - window.innerWidth
    const columnOverflow = scroller ? scroller.scrollWidth - scroller.clientWidth : 0

    return Math.max(pageOverflow, columnOverflow)
  })
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0)
}

/** Press Tab until `target` has focus, as a keyboard-only user would. */
async function tabTo(page: Page, target: Locator, maxPresses = 150): Promise<void> {
  for (let press = 0; press < maxPresses; press += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      return
    }

    await page.keyboard.press('Tab')
  }

  throw new Error(`Could not reach ${target.toString()} with Tab`)
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
    await expectEmptyCart(page)

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
    await expectInCart(page, HAMMER, 2)
    await expectInCart(page, TAPE, 0)

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
    await expectInCart(page, HAMMER, 1)
    await expectInCart(page, MEASURE, 0)

    // One went out, one came in: the count is unchanged.
    await gotoRoute(page, '/sales')
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 1 waiting')
    const list = await openHeldSales(page)
    await expect(heldRow(list, 'Swapped out')).toContainText('2 items')
  })

  test('Held Sales on the POS page: resume and swap stay on the POS page', async ({ page }) => {
    // At zero the list opens from POS too, and says where Hold Sale is.
    await gotoRoute(page, '/sales/new')
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, none waiting')
    let dialog = await openHeldSales(page)
    await expect(dialog.getByText(/Use Hold Sale in the cart/)).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'New Sale' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(heldSalesButton(page)).toBeFocused()

    await holdNewSale(page, 'Morning', [[TAPE, 2]])
    await holdNewSale(page, 'Later', [[HAMMER, 1]])

    // Resume with an empty cart.
    await gotoRoute(page, '/sales/new')
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 2 waiting')
    dialog = await openHeldSales(page)
    await heldRow(dialog, 'Morning')
      .getByRole('button', { name: /^Resume Morning, held / })
      .click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/#\/sales\/new$/)
    await expect(page.getByRole('status').filter({ hasText: 'Held sale resumed.' })).toBeVisible()
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 1 waiting')
    await expectInCart(page, TAPE, 2)

    // With a sale in progress: hold it and resume the other, still on POS.
    dialog = await openHeldSales(page)
    await heldRow(dialog, 'Later')
      .getByRole('button', { name: /^Hold current and resume Later, held / })
      .click()
    await dialog.getByLabel('Label for the sale in progress').fill('Was in progress')
    await dialog.getByRole('button', { name: 'Hold current and resume', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/#\/sales\/new$/)
    await expectInCart(page, HAMMER, 1)
    await expectInCart(page, TAPE, 0)
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 1 waiting')

    const list = await openHeldSales(page)
    await expect(heldRow(list, 'Was in progress')).toContainText('2 items')
  })
})

test.describe('Limits and reset', () => {
  test('B8: with 10 held sales Hold Sale is disabled and says why', async ({ page }) => {
    test.setTimeout(180_000)

    for (let index = 1; index <= 10; index += 1) {
      await holdNewSale(page, `Held ${index}`, [[TAPE, 1]])
    }
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 10 waiting')

    await gotoRoute(page, '/sales/new')
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 10 waiting')
    await addToCart(page, HAMMER, 1)

    const cart = await openCart(page)
    const hold = cart.getByRole('button', { name: 'Hold Sale', exact: true })
    await expect(hold).toBeDisabled()
    await expect(hold).toHaveAccessibleDescription(/already have 10 held sales/)
    await expect(cart.getByText(/already have 10 held sales/)).toBeVisible()

    // Checkout is still possible; nothing else is blocked by the limit.
    await expect(cart.getByRole('button', { name: 'Proceed to Checkout' })).toBeEnabled()
  })

  test('B10: Reset demo data clears held sales and hides the badge', async ({ page }) => {
    await holdNewSale(page, 'Before reset', [[HAMMER, 1]])
    await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, 1 waiting')
    await expect(heldSalesButton(page)).toHaveText(/1$/)

    await gotoRoute(page, '/settings')
    await page.getByRole('button', { name: 'Reset demo data' }).click()
    const dialog = page.getByRole('dialog', { name: 'Reset demo data?' })
    await dialog.getByRole('button', { name: 'Reset data' }).click()
    await expect(dialog).toBeHidden()

    for (const route of ['/sales', '/sales/new']) {
      await gotoRoute(page, route)
      await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, none waiting')
      // No count badge, only the label.
      await expect(heldSalesButton(page)).toHaveText('Held Sales')
    }

    const list = await openHeldSales(page)
    await expect(list.getByRole('listitem')).toHaveCount(0)
    await expect(list.getByText(/^No held sales\./)).toBeVisible()
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
    await proceedToCheckout(page)
    await page.getByRole('button', { name: 'Confirm Sale' }).click()
    await expect(page.getByRole('heading', { name: 'Sale Completed' })).toBeVisible()

    await gotoRoute(page, '/sales')
    const dialog = await openHeldSales(page)
    const row = heldRow(dialog, 'All wrenches')
    await expect(row.getByText('Stock changed', { exact: true })).toBeVisible()

    await row.getByRole('button', { name: /^Resume All wrenches, held / }).click()
    await expect(page).toHaveURL(/#\/sales\/new$/)

    const notice = page.getByRole('status').filter({ hasText: 'changed since it was held' })
    await expect(notice).toContainText(WRENCH)
    await expect(notice).toContainText(String(stock))
    await expect(notice).toContainText(String(stock - 1))

    await expectInCart(page, WRENCH, stock - 1)

    // Selling what is left takes stock to zero, not below.
    await proceedToCheckout(page)
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
    const line = (await openCart(page)).getByRole('listitem').filter({ hasText: MEASURE })
    expect(toCentavos(await line.getByText(/\/ \w+$/).innerText())).toBe(prices.after)
  })
})

test.describe('Clearing the cart asks first', () => {
  test('Keep Items leaves the cart; Clear Cart empties it', async ({ page }) => {
    await gotoRoute(page, '/sales/new')
    const wide = isCartBesideGrid(page)

    if (wide) {
      await expect(cartPanel(page).getByRole('button', { name: 'Clear', exact: true })).toHaveCount(
        0,
      )
    }

    await addToCart(page, HAMMER, 2)
    const cart = await openCart(page)
    const clear = cart.getByRole('button', { name: 'Clear', exact: true })
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
    await expect(cartLine(cart, HAMMER).locator('output')).toHaveText('2')

    await clear.click()
    await page
      .getByRole('dialog', { name: 'Clear this sale?' })
      .getByRole('button', { name: 'Clear Cart' })
      .click()

    if (wide) {
      const heading = page.getByRole('heading', { name: /^Current Sale \(0 items\)/ })
      await expect(heading).toBeVisible()
      await expect(heading).toBeFocused()
      await expect(clear).toHaveCount(0)
    } else {
      // The sheet closes with nothing left in it; focus is ready for the next sale.
      await expect(cartSheet(page)).toBeHidden()
      await expectEmptyCart(page)
      await expect(page.getByRole('searchbox', { name: 'Search products' })).toBeFocused()
    }
  })
})

test.describe('Keyboard only, at phone, tablet and desktop widths (B11)', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    test(`at ${viewport.width}px: add, hold, list, discard and resume`, async ({ page }) => {
      test.skip(test.info().project.name !== 'desktop', 'Viewport is set by the test')
      test.setTimeout(120_000)
      await page.setViewportSize(viewport)

      /** Add one of a product and hold the sale, all from the keyboard. */
      async function holdWithKeyboard(product: string, label: string): Promise<void> {
        await gotoRoute(page, '/sales/new')
        const search = page.getByRole('searchbox', { name: 'Search products' })
        await search.focus()
        await page.keyboard.type(product)

        await tabTo(page, posCard(page, product).getByRole('button', { name: /^add/i }))
        await page.keyboard.press('Enter')
        const add = page.getByRole('dialog', { name: 'Add to Cart' })
        await expect(add).toBeVisible()
        await tabTo(page, add.getByRole('button', { name: 'Add to Cart', exact: true }))
        await page.keyboard.press('Enter')
        await expect(add).toBeHidden()

        if (!isCartBesideGrid(page)) {
          await tabTo(page, page.getByRole('button', { name: /^View cart/ }))
          await page.keyboard.press('Enter')
          await expect(cartSheet(page)).toBeVisible()
          await expect(
            cartSheet(page).getByRole('heading', { name: /^Current Sale/ }),
          ).toBeFocused()
          await expectNoSidewaysScroll(page)
        }

        await tabTo(page, cartPanel(page).getByRole('button', { name: 'Hold Sale', exact: true }))
        await page.keyboard.press('Enter')
        const hold = page.getByRole('dialog', { name: 'Hold Sale' })
        await expect(hold.getByLabel('Label')).toBeFocused()
        await page.keyboard.type(label)
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(/#\/sales$/)
        await expect(page.getByText('Sale held.')).toBeVisible()
      }

      await holdWithKeyboard(HAMMER, 'Keyboard A')
      await holdWithKeyboard(TAPE, 'Keyboard B')
      await expectNoSidewaysScroll(page)

      // Open the list; focus stays inside; Escape closes back to the button.
      const button = heldSalesButton(page)
      await tabTo(page, button)
      await page.keyboard.press('Enter')
      let dialog = page.getByRole('dialog', { name: 'Held Sales' })
      await expect(dialog).toBeVisible()
      await expectNoSidewaysScroll(page)
      for (let step = 0; step < 15; step += 1) {
        await page.keyboard.press('Tab')
        expect(
          await dialog.evaluate((element) => element.contains(document.activeElement)),
          `focus inside after Tab #${step + 1}`,
        ).toBe(true)
      }
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(button).toBeFocused()

      // Discard B: Keep has focus first, then the confirm.
      await page.keyboard.press('Enter')
      dialog = page.getByRole('dialog', { name: 'Held Sales' })
      await tabTo(page, dialog.getByRole('button', { name: /^Discard Keyboard B, held / }))
      await page.keyboard.press('Enter')
      const rowB = heldRow(dialog, 'Keyboard B')
      await expect(rowB.getByRole('button', { name: 'Keep', exact: true })).toBeFocused()
      await tabTo(page, rowB.getByRole('button', { name: 'Discard', exact: true }))
      await page.keyboard.press('Enter')
      await expect(rowB).toHaveCount(0)

      // Resume A: lands on the POS page with its line in the cart.
      await tabTo(page, dialog.getByRole('button', { name: /^Resume Keyboard A, held / }))
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/#\/sales\/new$/)
      await expectInCart(page, HAMMER, 1)
      await expect(heldSalesButton(page)).toHaveAccessibleName('Held Sales, none waiting')
      await expectNoSidewaysScroll(page)
    })
  }
})

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
