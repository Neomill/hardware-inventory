import { useCallback, useSyncExternalStore } from 'react'

/** Tailwind's `lg` breakpoint: the fixed sidebar shows and the drawer is not used. */
export const DESKTOP_NAV_QUERY = '(min-width: 1024px)'

/**
 * Whether a CSS media query matches, kept live as the viewport changes (a
 * tablet rotating, a window resizing). False where matchMedia is missing.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) {
        return () => undefined
      }

      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)

      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = () =>
    typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches)

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
