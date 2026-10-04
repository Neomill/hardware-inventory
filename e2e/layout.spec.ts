import { expect, test } from '@playwright/test'

/**
 * No horizontal page overflow at phone, tablet and desktop widths, and a clean
 * console. Wide tables may scroll inside their own card; the document and the
 * app's scrolling content panel must not.
 *
 * Viewports are set per test, so this file runs once (desktop project) rather
 * than repeating the same matrix under every project.
 */

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const

const PAGES = [
  { name: 'dashboard', route: '/' },
  { name: 'products', route: '/products' },
  { name: 'sales', route: '/sales' },
  { name: 'sales/new', route: '/sales/new' },
  { name: 'inventory', route: '/inventory' },
  { name: 'customers', route: '/customers' },
  { name: 'reports', route: '/reports' },
  { name: 'settings', route: '/settings' },
] as const

type Overflow = { element: string; scrollWidth: number; clientWidth: number }

test.describe('Layout', () => {
  for (const viewport of VIEWPORTS) {
    for (const target of PAGES) {
      test(`${target.name} at ${viewport.width}x${viewport.height} has no horizontal overflow or console errors`, async ({
        page,
      }) => {
        test.skip(test.info().project.name !== 'desktop', 'Viewport matrix runs once')

        const errors: string[] = []
        page.on('console', (message) => {
          if (message.type() === 'error') {
            errors.push(message.text())
          }
        })
        page.on('pageerror', (error) => errors.push(error.message))

        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(`#${target.route}`)
        // Generous: the first request to a cold Vite dev server compiles on demand.
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
        await page.waitForLoadState('networkidle')

        const overflows = await page.evaluate((): Overflow[] => {
          const found: Overflow[] = []
          const describe = (element: Element) =>
            `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}.${[
              ...element.classList,
            ]
              .slice(0, 4)
              .join('.')}`
          const check = (element: Element | null) => {
            if (element && element.scrollWidth > element.clientWidth + 1) {
              found.push({
                element: describe(element),
                scrollWidth: element.scrollWidth,
                clientWidth: element.clientWidth,
              })
            }
          }

          check(document.documentElement)
          check(document.body)

          // The app scrolls inside its content column: <main> and every
          // ancestor up to <body> that is a scroll container.
          const main = document.querySelector('main')
          check(main)
          for (
            let node = main?.parentElement ?? null;
            node && node !== document.body;
            node = node.parentElement
          ) {
            const style = getComputedStyle(node)
            if (/(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflowX)) {
              check(node)
            }
          }

          return found
        })

        expect(overflows, 'elements wider than their box').toEqual([])
        expect(errors, 'console errors').toEqual([])
      })
    }
  }
})
