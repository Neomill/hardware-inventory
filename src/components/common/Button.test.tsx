import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/app/routes'

import { Button } from './Button'

describe('Button', () => {
  it('defaults to the secondary variant and type="button"', () => {
    const html = renderToString(<Button>Save</Button>)
    expect(html).toContain('type="button"')
    expect(html).toContain('bg-white')
  })

  it('renders the destructive variant with the shared sizing', () => {
    const html = renderToString(<Button variant="destructive">Cancel sale</Button>)
    expect(html).toContain('bg-rose-600 text-white hover:bg-rose-700')
    expect(html).toContain('h-12')
    expect(html).toContain('rounded-xl')
  })

  it('renders the destructive variant on a link', () => {
    const html = renderToString(
      <MemoryRouter>
        <Button variant="destructive" to={ROUTES.inventory}>
          Go
        </Button>
      </MemoryRouter>,
    )
    expect(html).toContain('<a')
    expect(html).toContain('bg-rose-600')
  })

  it('disables and marks busy while pending', () => {
    const html = renderToString(
      <Button variant="destructive" pending>
        Cancelling
      </Button>,
    )
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
  })
})
