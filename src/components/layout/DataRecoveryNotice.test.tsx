import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { useShopStore, type DataRecovery } from '@/stores/useShopStore'

import { DataRecoveryNotice, DataRecoveryNoticeView } from './DataRecoveryNotice'
import { describeDataRecovery } from './dataRecoveryMessage'

const BACKUP_KEY = 'olaer-store:shop:unreadable-1762646400000'

function recovery(overrides: Partial<DataRecovery> = {}): DataRecovery {
  return {
    outcome: 'reset',
    backupKey: BACKUP_KEY,
    at: '2026-11-09T00:00:00.000Z',
    dropped: [],
    ...overrides,
  }
}

describe('describeDataRecovery', () => {
  it('says the data was unreadable and the app started from the demo data', () => {
    const message = describeDataRecovery(recovery())
    expect(message.heading).toBe('Your saved shop data could not be read.')
    expect(message.detail).toBe('The app has started again from the demo data.')
    expect(message.backup).toContain('has been kept on this device')
  })

  it('lists what a salvaged load left out', () => {
    const message = describeDataRecovery(
      recovery({ outcome: 'salvaged', dropped: ['1 customer record', '2 paused sales'] }),
    )
    expect(message.heading).toBe('Some saved records could not be read.')
    expect(message.detail).toBe(
      'These were left out: 1 customer record and 2 paused sales. Everything else loaded as usual.',
    )
  })

  it('joins three or more kinds with commas', () => {
    const message = describeDataRecovery(
      recovery({
        outcome: 'salvaged',
        dropped: ['1 product record', '1 paused sale', '3 supplier invoices'],
      }),
    )
    expect(message.detail).toContain('1 product record, 1 paused sale and 3 supplier invoices.')
  })

  it('still reads plainly when a salvage names nothing', () => {
    const message = describeDataRecovery(recovery({ outcome: 'salvaged', dropped: [] }))
    expect(message.detail).toContain('These were left out: some saved records.')
  })

  it('says so when no backup copy could be kept', () => {
    const message = describeDataRecovery(recovery({ backupKey: null }))
    expect(message.backup).toContain('could not be kept on this device')
  })
})

describe('DataRecoveryNoticeView', () => {
  const render = (value: DataRecovery) =>
    renderToString(<DataRecoveryNoticeView recovery={value} onDismiss={() => undefined} />)

  it('is a polite warning that does not print', () => {
    const html = render(recovery())
    expect(html).toContain('role="status"')
    expect(html).toContain('bg-amber-50')
    expect(html).toContain('print:hidden')
  })

  it('has a Dismiss button described by the message', () => {
    const html = render(recovery())
    const describedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1]
    expect(describedBy).toBeTruthy()
    expect(html).toContain(`<p id="${describedBy}"`)
    expect(html).toMatch(/<button type="button"[^>]*>Dismiss<\/button>/)
  })

  it('names the backup copy when one was kept', () => {
    const html = render(recovery())
    expect(html).toContain('Your saved shop data could not be read.')
    expect(html).toContain(BACKUP_KEY)
  })

  it('shows no backup name when none was kept', () => {
    const html = render(recovery({ backupKey: null }))
    expect(html).not.toContain('Backup name')
    expect(html).toContain('could not be kept on this device')
  })

  it('wraps the button under the text on a phone', () => {
    const html = render(recovery())
    expect(html).toContain('flex-wrap sm:flex-nowrap')
    expect(html).toContain('w-full pl-8 sm:w-auto')
  })
})

// renderToString reads the store's initial state (the server snapshot), so the
// connected notice can only be checked for the no-recovery case here. The view
// above covers every recovery; the store tests cover dismissDataRecovery.
describe('DataRecoveryNotice', () => {
  it('renders nothing when the saved data loaded as it was', () => {
    expect(useShopStore.getState().dataRecovery).toBeNull()
    expect(renderToString(<DataRecoveryNotice />)).toBe('')
  })
})
