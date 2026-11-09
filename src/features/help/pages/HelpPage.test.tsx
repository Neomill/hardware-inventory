import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/app/routes'
import { HELP_TOPICS } from '@/features/help/lib/helpTopics'
import { HelpPage } from '@/features/help/pages/HelpPage'

const STATIC_ROUTES = new Set<string>(
  Object.values(ROUTES as Record<string, unknown>).filter(
    (value): value is string => typeof value === 'string',
  ),
)

describe('help topics', () => {
  it('has unique ids, at least two steps each, and a real screen to go to', () => {
    const ids = HELP_TOPICS.map((topic) => topic.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const topic of HELP_TOPICS) {
      expect(topic.steps.length, topic.id).toBeGreaterThanOrEqual(2)
      expect(STATIC_ROUTES.has(topic.goTo.to), topic.id).toBe(true)
    }
  })

  it('uses the plain-language words, never the old jargon', () => {
    const text = JSON.stringify(HELP_TOPICS)

    for (const old of ['Ledger', 'SKU', 'Adjust', 'Hold Sale', 'Held', 'Outstanding', 'POS']) {
      expect(text, old).not.toContain(old)
    }
  })
})

describe('HelpPage', () => {
  it('shows every topic with numbered steps and a print button', () => {
    const html = renderToString(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>,
    )

    for (const topic of HELP_TOPICS) {
      expect(html).toContain(topic.title)
    }
    expect(html).toContain('<ol')
    expect(html).toContain('Print Cheat Sheet')
    expect(html).toContain('If something goes wrong')
  })
})
