import { describe, expect, it } from 'vitest'

import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZE_STORAGE_KEY,
  applyTextSize,
  parseTextSize,
  readTextSize,
  rootFontSize,
  saveTextSize,
} from '@/lib/textSize'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    data,
  }
}

const throwingStorage = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('text size', () => {
  it('defaults to Large', () => {
    expect(DEFAULT_TEXT_SIZE).toBe('large')
  })

  it('accepts only known sizes', () => {
    expect(parseTextSize('normal')).toBe('normal')
    expect(parseTextSize('extra-large')).toBe('extra-large')
    expect(parseTextSize('huge')).toBe(DEFAULT_TEXT_SIZE)
    expect(parseTextSize(null)).toBe(DEFAULT_TEXT_SIZE)
    expect(parseTextSize(18)).toBe(DEFAULT_TEXT_SIZE)
  })

  it('maps each size to a root font size relative to the browser default', () => {
    expect(rootFontSize('normal')).toBe('100%')
    expect(rootFontSize('large')).toBe('112.5%')
    expect(rootFontSize('extra-large')).toBe('125%')
  })

  it('reads the saved size, and falls back when nothing is saved or storage is blocked', () => {
    expect(readTextSize(memoryStorage({ [TEXT_SIZE_STORAGE_KEY]: 'normal' }))).toBe('normal')
    expect(readTextSize(memoryStorage())).toBe(DEFAULT_TEXT_SIZE)
    expect(readTextSize(undefined)).toBe(DEFAULT_TEXT_SIZE)
    expect(readTextSize(throwingStorage)).toBe(DEFAULT_TEXT_SIZE)
  })

  it('saves under its own key, and ignores blocked storage', () => {
    const storage = memoryStorage()

    saveTextSize(storage, 'extra-large')
    expect(storage.data.get(TEXT_SIZE_STORAGE_KEY)).toBe('extra-large')
    expect(() => saveTextSize(throwingStorage, 'normal')).not.toThrow()
    expect(() => saveTextSize(undefined, 'normal')).not.toThrow()
  })

  it('applies the size to the root element', () => {
    const root = { style: { fontSize: '' } }

    applyTextSize(root, 'extra-large')
    expect(root.style.fontSize).toBe('125%')
  })
})
