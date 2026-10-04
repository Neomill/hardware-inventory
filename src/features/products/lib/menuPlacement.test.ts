import { describe, expect, it } from 'vitest'

import { placeMenu } from '@/features/products/lib/menuPlacement'

const viewport = { width: 1280, height: 800 }

describe('placeMenu', () => {
  it('opens below the trigger when there is room, aligned to its right edge', () => {
    expect(placeMenu({ top: 100, bottom: 136, right: 1200 }, 130, viewport)).toEqual({
      top: 140,
      right: 80,
    })
  })

  it('opens above the trigger near the bottom of the viewport', () => {
    expect(placeMenu({ top: 700, bottom: 736, right: 1200 }, 130, viewport)).toEqual({
      bottom: 104,
      right: 80,
    })
  })

  it('falls back to below when neither side fits', () => {
    expect(placeMenu({ top: 50, bottom: 86, right: 1200 }, 900, viewport)).toEqual({
      top: 90,
      right: 80,
    })
  })
})
