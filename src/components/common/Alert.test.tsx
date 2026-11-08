import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Alert } from './Alert'

describe('Alert', () => {
  it('announces errors assertively', () => {
    const html = renderToString(<Alert tone="error">Failed</Alert>)
    expect(html).toContain('role="alert"')
    expect(html).toContain('bg-rose-50')
  })

  it('renders the warning tone in amber as a polite status', () => {
    const html = renderToString(<Alert tone="warning">Check this</Alert>)
    expect(html).toContain('role="status"')
    expect(html).not.toContain('role="alert"')
    expect(html).toContain('border-amber-200 bg-amber-50 text-amber-900')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('Check this')
  })

  it.each(['info', 'success'] as const)('renders the %s tone as a status', (tone) => {
    expect(renderToString(<Alert tone={tone}>Note</Alert>)).toContain('role="status"')
  })
})
