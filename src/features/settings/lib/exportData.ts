import { STORAGE_NAMESPACE } from '@/config/app'
import {
  selectPersistedData,
  SHOP_STORAGE_VERSION,
  type PersistedShopData,
} from '@/stores/shopPersistence'

export type ShopDataExport = {
  app: string
  schemaVersion: number
  exportedAt: string
  data: PersistedShopData
}

/** Everything saved on this device, in the same shape it is stored in. */
export function buildDataExport(state: PersistedShopData, now: Date = new Date()): ShopDataExport {
  return {
    app: STORAGE_NAMESPACE,
    schemaVersion: SHOP_STORAGE_VERSION,
    exportedAt: now.toISOString(),
    data: selectPersistedData(state),
  }
}

/** "olaer-store-data-2025-05-21.json", dated in local time. */
export function exportFileName(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  return `${STORAGE_NAMESPACE}-data-${day}.json`
}

/** Approximate size of the saved data, for the Data section. */
export function estimateSavedBytes(state: PersistedShopData): number {
  return new Blob([JSON.stringify(selectPersistedData(state))]).size
}

/** Hands the browser a JSON file. Client-side only: nothing is uploaded. */
export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}
