import { expect, test, type Locator, type Page } from '@playwright/test'

import { gotoRoute, posCard } from './support'

/** True when the focused element is inside `dialog`. */
async function focusIsInside(dialog: Locator): Promise<boolean> {
  return dialog.evaluate((element) => element.contains(document.activeElement))
}

async function expectModalFocusCycle(page: Page, trigger: Locator, dialogName: string) {
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: dialogName })
  await expect(dialog).toBeVisible()

  // Focus moves into the dialog on open.
  await expect.poll(() => focusIsInside(dialog), { message: 'focus moved into dialog' }).toBe(true)

  // Tab and Shift+Tab cycle inside it; focus never escapes to the page behind.
  for (let step = 0; step < 25; step += 1) {
    await page.keyboard.press('Tab')
    expect(await focusIsInside(dialog), `focus inside after Tab #${step + 1}`).toBe(true)
  }
  for (let step = 0; step < 10; step += 1) {
    await page.keyboard.press('Shift+Tab')
    expect(await focusIsInside(dialog), `focus inside after Shift+Tab #${step + 1}`).toBe(true)
  }

  // Escape closes and hands focus back to whatever opened it.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
}

test.describe('Dialog keyboard behaviour', () => {
  test('Add to Cart dialog traps focus and returns it to the Add button', async ({ page }) => {
    await gotoRoute(page, '/sales/new')
    await page.getByRole('searchbox', { name: 'Search products' }).fill('Claw Hammer 16oz')

    const trigger = posCard(page, 'Claw Hammer 16oz').getByRole('button', { name: /add/i })
    await expectModalFocusCycle(page, trigger, 'Add to Cart')
  })

  test('Adjust Stock dialog traps focus and returns it to the Adjust button', async ({ page }) => {
    await gotoRoute(page, '/inventory')
    await page.getByRole('searchbox', { name: 'Search inventory' }).fill('Masking Tape 2"')

    const row = page
      .getByRole('row')
      .filter({ has: page.getByText('Masking Tape 2"', { exact: true }) })
    await expectModalFocusCycle(page, row.getByRole('button', { name: 'Adjust' }), 'Adjust Stock')
  })

  test('Reset demo data dialog traps focus and returns it to its trigger', async ({ page }) => {
    await gotoRoute(page, '/settings')

    await expectModalFocusCycle(
      page,
      page.getByRole('button', { name: 'Reset demo data' }),
      'Reset demo data?',
    )
  })
})
