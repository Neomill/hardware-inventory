import { useCallback, useEffect, useState } from 'react'

import {
  TEXT_SIZE_STORAGE_KEY,
  applyTextSize,
  parseTextSize,
  readTextSize,
  saveTextSize,
  type TextSize,
} from '@/lib/textSize'
import { getBrowserStorage } from '@/stores/shopPersistence'

/** Applies the saved text size before the first render (called from main.tsx). */
export function applySavedTextSize(): void {
  applyTextSize(document.documentElement, readTextSize(getBrowserStorage()))
}

/** Follows a size chosen in another tab of the app on this device. */
export function watchTextSizeInOtherTabs(onChange?: (size: TextSize) => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key !== TEXT_SIZE_STORAGE_KEY) {
      return
    }

    const size = parseTextSize(event.newValue)
    applyTextSize(document.documentElement, size)
    onChange?.(size)
  }

  window.addEventListener('storage', handleStorage)

  return () => window.removeEventListener('storage', handleStorage)
}

/** The text size for this device, and a setter that applies and saves it at once. */
export function useTextSize(): [TextSize, (size: TextSize) => void] {
  const [size, setSize] = useState<TextSize>(() => readTextSize(getBrowserStorage()))

  useEffect(() => watchTextSizeInOtherTabs(setSize), [])

  const changeSize = useCallback((next: TextSize) => {
    applyTextSize(document.documentElement, next)
    saveTextSize(getBrowserStorage(), next)
    setSize(next)
  }, [])

  return [size, changeSize]
}
