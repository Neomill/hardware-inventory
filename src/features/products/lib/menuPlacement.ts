/** Where a fixed-position dropdown sits relative to its trigger, in viewport pixels. */
export type MenuPlacement = { top: number; right: number } | { bottom: number; right: number }

type Rect = { top: number; bottom: number; right: number }

const GAP = 4

/**
 * Opens below the trigger, or above it when the viewport has no room below.
 * Fixed positioning keeps the menu out of the table's scroll container, which
 * would otherwise clip it on the last rows.
 */
export function placeMenu(
  trigger: Rect,
  menuHeight: number,
  viewport: { width: number; height: number },
): MenuPlacement {
  const right = Math.max(0, viewport.width - trigger.right)
  const fitsBelow = trigger.bottom + GAP + menuHeight <= viewport.height
  const fitsAbove = trigger.top - GAP - menuHeight >= 0

  if (fitsBelow || !fitsAbove) {
    return { top: trigger.bottom + GAP, right }
  }

  return { bottom: viewport.height - trigger.top + GAP, right }
}
