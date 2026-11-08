import type { DataRecovery } from '@/stores/useShopStore'

export type DataRecoveryMessage = {
  /** What happened, in one sentence. */
  heading: string
  /** What the app did about it. */
  detail: string
  /** Whether a backup copy was kept on this device. */
  backup: string
}

/** "a", "a and b", "a, b and c". */
function joinWords(items: string[]): string {
  if (items.length <= 1) {
    return items.join('')
  }

  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * The data recovery notice in the shop owner's words: what happened, what the
 * app did, then whether a backup copy was kept on this device.
 */
export function describeDataRecovery(recovery: DataRecovery): DataRecoveryMessage {
  const backup =
    recovery.backupKey !== null
      ? 'A backup copy of the saved data, exactly as it was, has been kept on this device.'
      : 'A backup copy could not be kept on this device (its storage may be full or blocked).'

  if (recovery.outcome === 'reset') {
    return {
      heading: 'Your saved shop data could not be read.',
      detail: 'The app has started again from the demo data.',
      backup,
    }
  }

  const dropped = recovery.dropped.length > 0 ? joinWords(recovery.dropped) : 'some saved records'

  return {
    heading: 'Some saved records could not be read.',
    detail: `These were left out: ${dropped}. Everything else loaded as usual.`,
    backup,
  }
}
