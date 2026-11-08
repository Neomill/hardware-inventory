import { useLayoutEffect, useState, type RefObject } from 'react'

import { stickyPanelMaxHeight } from '@/features/sales/lib/cartLayout'

/** Nearest ancestor that scrolls vertically (the AppShell content column), if any. */
function findScrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node)

    if (overflowY === 'auto' || overflowY === 'scroll') {
      return node
    }
  }

  return null
}

/**
 * Max height, in pixels, for a sticky column so its bottom never leaves the
 * visible part of its scroll container, and it never runs past the end of the
 * column beside it (`besideRef`), which would push its top out of view. Measured from the real layout: the
 * column's current top edge and the scroll area's bottom edge, re-measured on
 * scroll, on resize and when content above the column changes height (an
 * alert appearing or being dismissed).
 *
 * Returns undefined while disabled or before the first measurement.
 */
export function useStickyMaxHeight(
  ref: RefObject<HTMLElement | null>,
  besideRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): number | undefined {
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const element = ref.current

    if (!enabled || !element) {
      setMaxHeight(undefined)

      return
    }

    const scroller = findScrollParent(element)
    let frame = 0

    function measure() {
      frame = 0

      if (!element) {
        return
      }

      const viewportBottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight

      setMaxHeight(
        stickyPanelMaxHeight({
          viewportBottom,
          panelTop: element.getBoundingClientRect().top,
          beside: besideRef.current?.getBoundingClientRect(),
        }),
      )
    }

    function schedule() {
      if (frame === 0) {
        frame = window.requestAnimationFrame(measure)
      }
    }

    measure()

    const scrollTarget: HTMLElement | Window = scroller ?? window
    scrollTarget.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    // Content above the column (alerts, notices) moves it without a scroll event.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => schedule())
    for (const child of scroller ? Array.from(scroller.children) : [document.body]) {
      observer?.observe(child)
    }

    return () => {
      scrollTarget.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()

      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [ref, besideRef, enabled])

  return maxHeight
}
