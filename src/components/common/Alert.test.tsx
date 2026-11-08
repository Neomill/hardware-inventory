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

  it('renders an action beside the message and an id on the message', () => {
    const html = renderToString(
      <Alert tone="warning" id="msg" action={<button type="button">Dismiss</button>}>
        Check this
      </Alert>,
    )
    expect(html).toContain('<p id="msg"')
    expect(html).toContain('flex-wrap sm:flex-nowrap')
    expect(html).toContain('>Dismiss</button>')
  })

  it('does not wrap when there is no action', () => {
    expect(renderToString(<Alert tone="info">Note</Alert>)).not.toContain('flex-wrap')
  })

  it.each(['info', 'success'] as const)('renders the %s tone as a status', (tone) => {
    expect(renderToString(<Alert tone={tone}>Note</Alert>)).toContain('role="status"')
  })
})
