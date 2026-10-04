import { useEffect, useRef, useState } from 'react'

/**
 * The rendered width of an element, kept current with a ResizeObserver, so a
 * chart can draw at its real pixel size and keep its text legible on phones.
 */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current

    if (!element) {
      return undefined
    }

    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width)

      if (next > 0) {
        setWidth(next)
      }
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
