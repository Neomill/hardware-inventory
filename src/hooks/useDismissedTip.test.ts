import { describe, expect, it } from 'vitest'

import { dismissTip, isTipDismissed, tipStorageKey } from '@/hooks/useDismissedTip'

function memoryStorage() {
  const data = new Map<string, string>()

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

const blocked = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('first-time tips', () => {
  it('shows a tip until it is dismissed, per tip', () => {
    const storage = memoryStorage()

    expect(isTipDismissed(storage, 'sell')).toBe(false)
    dismissTip(storage, 'sell')
    expect(isTipDismissed(storage, 'sell')).toBe(true)
    expect(isTipDismissed(storage, 'other')).toBe(false)
    expect(storage.getItem(tipStorageKey('sell'))).toBe('dismissed')
  })

  it('treats missing or blocked storage as not dismissed, without throwing', () => {
    expect(isTipDismissed(undefined, 'sell')).toBe(false)
    expect(isTipDismissed(blocked, 'sell')).toBe(false)
    expect(() => dismissTip(blocked, 'sell')).not.toThrow()
  })
})
