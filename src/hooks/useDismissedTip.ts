import { useCallback, useState } from 'react'

import { STORAGE_NAMESPACE } from '@/config/app'
import { getBrowserStorage } from '@/stores/shopPersistence'

type TipStorage = {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: string) => unknown
}

export function tipStorageKey(tipId: string): string {
  return `${STORAGE_NAMESPACE}:tip:${tipId}`
}

/** True once the tip was dismissed on this device. Blocked storage counts as not dismissed. */
export function isTipDismissed(storage: TipStorage | undefined, tipId: string): boolean {
  try {
    return storage?.getItem(tipStorageKey(tipId)) === 'dismissed'
  } catch {
    return false
  }
}

export function dismissTip(storage: TipStorage | undefined, tipId: string): void {
  try {
    storage?.setItem(tipStorageKey(tipId), 'dismissed')
  } catch {
    // Private browsing: the tip just comes back next time.
  }
}

/**
 * A first-time tip that stays until "Got it", then never shows again on this
 * device. Like the text size, it is a device preference, not store data.
 */
export function useDismissedTip(tipId: string): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(() => isTipDismissed(getBrowserStorage(), tipId))

  const dismiss = useCallback(() => {
    dismissTip(getBrowserStorage(), tipId)
    setDismissed(true)
  }, [tipId])

  return [dismissed, dismiss]
}
