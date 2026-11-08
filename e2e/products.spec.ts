import { expect, test, type Page } from '@playwright/test'

import {
  addToCart,
  cartPanel,
  cartTotal,
  definition,
  gotoRoute,
  posCard,
  toAmountInput,
  toCentavos,
  toCount,
} from './support'

/**
 * Add Product and Product Details (specs/04/04-add-product-and-details-spec.md
 * s.10.4, B1 to B5). Figures are read from the screen, never from the seed.
 */

const HAMMER = 'Claw Hammer 16oz'

type NewProduct = {
  name: string
  category: { existing: string } | { typed: string }
  unit: string
  price: string
  reorderAt: string
  openingStock: string
}

async function fillAddProduct(page: Page, product: NewProduct): Promise<void> {
  await page.getByLabel('Product name').fill(product.name)

  const category = page.getByLabel('Category', { exact: true })

  if ('typed' in product.category) {
    await category.selectOption({ label: 'New category...' })
    await page.getByLabel('New category name').fill(product.category.typed)
  } else {
    await category.selectOption({ label: product.category.existing })
  }

  await page.getByLabel('Unit', { exact: true }).selectOption({ label: product.unit })
  await page.getByLabel('Price', { exact: true }).fill(product.price)
  await page.getByLabel('Reorder At').fill(product.reorderAt)
  await page.getByLabel(/^Opening stock/).fill(product.openingStock)
}

function currentStock(page: Page) {
  return page.getByText('Current Stock', { exact: true }).locator('xpath=following-sibling::p[1]')
}

function card(page: Page, title: string) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
}

/** Sells `quantity` of a product for exact cash and returns the sale number. */
async function sellForCash(page: Page, productName: string, quantity: number): Promise<string> {
  await gotoRoute(page, '/sales/new')
  await addToCart(page, productName, quantity)

  const total = toCentavos(await cartTotal(cartPanel(page)).innerText())
  await cartPanel(page).getByRole('button', { name: 'Proceed to Checkout' }).click()
  await page.getByLabel(/Cash received/).fill(toAmountInput(total))
  await page.getByRole('button', { name: 'Confirm Sale' }).click()
  await expect(page.getByRole('heading', { name: 'Sale Completed' })).toBeVisible()

  return (
    await page
      .getByText('Sale No.', { exact: true })
      .locator('xpath=following-sibling::p[1]')
      .innerText()
  ).trim()
}

test('B1: adds a product in a new category with opening stock', async ({ page }) => {
  await gotoRoute(page, '/products')
  await page.getByRole('link', { name: /Add Product/ }).click()
  await expect(page).toHaveURL(/#\/products\/new$/)

  await fillAddProduct(page, {
    name: 'Garden Hose 10m',
    category: { typed: 'Garden' },
    unit: 'pcs',
    price: '150',
    reorderAt: '5',
    openingStock: '12',
  })

  await expect(page.getByText(/SKU: GAR-001, assigned when you save\./)).toBeVisible()
  await expect(page.getByLabel('Opening stock (pcs)')).toBeVisible()

  await page.getByRole('button', { name: 'Add Product' }).click()

  await expect(page).toHaveURL(/#\/products\/GAR-001$/)
  await expect(page.getByText('Product added. Opening stock: 12 pcs.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Garden Hose 10m' })).toBeVisible()
  expect(toCount(await currentStock(page).innerText())).toBe(12)
  await expect(card(page, 'Stock')).toContainText('In Stock')

  const movements = card(page, 'Stock Movements').getByRole('row').filter({ hasText: 'OPENING' })
  await expect(movements).toHaveCount(1)
  await expect(movements).toContainText('Opening stock')
  await expect(movements).toContainText('+12')
  await expect(card(page, 'Recent Sales')).toContainText('Not sold yet.')

  // Enter submits too: a second product in the same category gets the next number.
  await gotoRoute(page, '/products/new')
  await fillAddProduct(page, {
    name: 'Garden Rake',
    category: { existing: 'Garden' },
    unit: 'pcs',
    price: '220.50',
    reorderAt: '2',
    openingStock: '0',
  })
  await expect(page.getByText(/SKU: GAR-002/)).toBeVisible()
  await page.getByLabel(/^Opening stock/).press('Enter')
  await expect(page).toHaveURL(/#\/products\/GAR-002$/)
  await expect(card(page, 'Stock')).toContainText('Out of Stock')
})

test('B2: refuses a duplicate name and a zero price, adding nothing', async ({ page }) => {
  await gotoRoute(page, '/products/new')

  await fillAddProduct(page, {
    name: HAMMER.toUpperCase(),
    category: { existing: 'Tools' },
    unit: 'pcs',
    price: '0',
    reorderAt: '1',
    openingStock: '1',
  })
  await page.getByRole('button', { name: 'Add Product' }).click()

  await expect(
    page.getByText(`${HAMMER.toUpperCase()} is already in the product list.`),
  ).toBeVisible()
  await expect(page.getByText('Enter a price greater than zero.')).toBeVisible()
  await expect(page).toHaveURL(/#\/products\/new$/)
  // Everything typed is kept.
  await expect(page.getByLabel('Product name')).toHaveValue(HAMMER.toUpperCase())

  await gotoRoute(page, '/products')
  await page.getByRole('searchbox', { name: 'Search products' }).fill(HAMMER)
  await expect(
    page.getByRole('row').filter({ has: page.getByText(new RegExp(`^${HAMMER}$`, 'i')) }),
  ).toHaveCount(1)
})

test('B3: a product name opens its details, which follow a sale', async ({ page }) => {
  await gotoRoute(page, '/products')
  await page.getByRole('searchbox', { name: 'Search products' }).fill(HAMMER)
  await page.getByRole('link', { name: HAMMER, exact: true }).click()

  await expect(page.getByRole('heading', { name: HAMMER })).toBeVisible()
  const detailUrl = page.url()
  const before = toCount(await currentStock(page).innerText())
  expect(before).toBeGreaterThanOrEqual(2)

  const saleNumber = await sellForCash(page, HAMMER, 2)

  await page.goto(detailUrl)
  await expect(page.getByRole('heading', { name: HAMMER })).toBeVisible()
  expect(toCount(await currentStock(page).innerText())).toBe(before - 2)

  const saleRow = card(page, 'Recent Sales').getByRole('row').filter({ hasText: saleNumber })
  await expect(saleRow).toHaveCount(1)
  await expect(saleRow.getByRole('link', { name: saleNumber })).toBeVisible()
  await expect(
    card(page, 'Stock Movements').getByRole('row').filter({ hasText: saleNumber }),
  ).toContainText('-2')
})

test('B4: a new product survives a reload and is sellable at the POS', async ({ page }) => {
  await gotoRoute(page, '/products/new')
  await fillAddProduct(page, {
    name: 'Pruning Shears',
    category: { typed: 'Garden' },
    unit: 'pcs',
    price: '345',
    reorderAt: '3',
    openingStock: '8',
  })
  await page.getByRole('button', { name: 'Add Product' }).click()
  await expect(page.getByRole('heading', { name: 'Pruning Shears' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pruning Shears' })).toBeVisible()
  expect(toCount(await currentStock(page).innerText())).toBe(8)
  await expect(
    card(page, 'Stock Movements').getByRole('row').filter({ hasText: 'OPENING' }),
  ).toHaveCount(1)

  await gotoRoute(page, '/sales/new')
  await page.getByRole('searchbox', { name: 'Search products' }).fill('Pruning Shears')
  const tile = posCard(page, 'Pruning Shears')
  await expect(tile).toBeVisible()
  await expect(tile.getByRole('button', { name: /add/i })).toBeEnabled()

  await addToCart(page, 'Pruning Shears', 1)
  await expect(cartPanel(page)).toContainText('Pruning Shears')
})

test('B5: editing the price leaves earlier sales at their price', async ({ page }) => {
  const saleNumber = await sellForCash(page, HAMMER, 1)

  await gotoRoute(page, '/products')
  await page.getByRole('searchbox', { name: 'Search products' }).fill(HAMMER)
  await page.getByRole('link', { name: HAMMER, exact: true }).click()
  await expect(page.getByRole('heading', { name: HAMMER })).toBeVisible()

  const oldPriceText = (await definition(page, 'Price').innerText()).trim()
  const oldPrice = toCentavos(oldPriceText)
  const newPrice = oldPrice + 10_000

  await page.getByRole('button', { name: 'Edit Product' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit Product' })
  await expect(dialog).toBeVisible()

  // SKU and unit are shown, not editable; there is no stock field at all.
  await expect(dialog.getByText('SKU (cannot change)')).toBeVisible()
  await expect(dialog.getByText('Unit (cannot change)')).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: /SKU|Unit|Stock/ })).toHaveCount(0)

  await dialog.getByRole('textbox', { name: 'Price' }).fill(toAmountInput(newPrice))
  await dialog.getByRole('button', { name: 'Save Changes' }).click()
  await expect(dialog).toBeHidden()

  await expect(page.getByText('Product saved.')).toBeVisible()
  expect(toCentavos(await definition(page, 'Price').innerText())).toBe(newPrice)

  // The earlier sale keeps the price it was sold at.
  const saleRow = card(page, 'Recent Sales').getByRole('row').filter({ hasText: saleNumber })
  await expect(saleRow).toContainText(oldPriceText)
  await saleRow.getByRole('link', { name: saleNumber }).click()
  await expect(page.locator('section.receipt')).toContainText(oldPriceText)
})
