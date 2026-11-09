import { STORAGE_NAMESPACE } from '@/config/app'

/**
 * How big the whole interface is drawn on this device. Tailwind sizes are in
 * rem, so changing the root font size scales text, buttons and spacing
 * together. It is a device preference, not store data: the tablet at the
 * counter and the laptop in the office can each keep their own size, and it is
 * not part of a data export or a demo-data reset.
 */
export type TextSize = 'normal' | 'large' | 'extra-large'

export type TextSizeOption = {
  value: TextSize
  label: string
  /** Root font size as a share of the browser default, so the browser's own setting still counts. */
  rootPercent: number
}

export const TEXT_SIZE_OPTIONS: readonly TextSizeOption[] = [
  { value: 'normal', label: 'Normal', rootPercent: 100 },
  { value: 'large', label: 'Large', rootPercent: 112.5 },
  { value: 'extra-large', label: 'Extra large', rootPercent: 125 },
]

/** Both users wear reading glasses at the counter (docs/product/02-senior-ux-plan.md). */
export const DEFAULT_TEXT_SIZE: TextSize = 'large'

export const TEXT_SIZE_STORAGE_KEY = `${STORAGE_NAMESPACE}:text-size`

type TextSizeStorage = {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: string) => unknown
}

/** Anything that is not a known size (missing, old or edited by hand) falls back to the default. */
export function parseTextSize(raw: unknown): TextSize {
  const match = TEXT_SIZE_OPTIONS.find((option) => option.value === raw)

  return match ? match.value : DEFAULT_TEXT_SIZE
}

export function rootFontSize(size: TextSize): string {
  const option =
    TEXT_SIZE_OPTIONS.find((candidate) => candidate.value === size) ??
    TEXT_SIZE_OPTIONS.find((candidate) => candidate.value === DEFAULT_TEXT_SIZE)

  return `${option?.rootPercent ?? 100}%`
}

/** The saved size, or the default when nothing is saved or storage is blocked. */
export function readTextSize(storage: TextSizeStorage | undefined): TextSize {
  try {
    const raw = storage?.getItem(TEXT_SIZE_STORAGE_KEY)

    return parseTextSize(typeof raw === 'string' ? raw : null)
  } catch {
    return DEFAULT_TEXT_SIZE
  }
}

/** Saves the size; when storage is blocked the size still applies until the page closes. */
export function saveTextSize(storage: TextSizeStorage | undefined, size: TextSize): void {
  try {
    storage?.setItem(TEXT_SIZE_STORAGE_KEY, size)
  } catch {
    // Private browsing or a full quota: nothing to recover.
  }
}

/** Sets the root font size on the <html> element. Print rules in index.css reset it for paper. */
export function applyTextSize(root: { style: { fontSize: string } }, size: TextSize): void {
  root.style.fontSize = rootFontSize(size)
}
