import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Tabbable descendants in DOM order, skipping hidden ones. */
export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) =>
      element.tabIndex >= 0 && !element.closest('[inert]') && element.getClientRects().length > 0,
  )
}

/** Open modal layers, top last. Only the top one handles Escape and Tab. */
const layers: symbol[] = []

/**
 * Marks everything outside `container` inert (and hidden from assistive
 * technology) by walking up to <body> and flagging each sibling on the way.
 * Returns a function that undoes exactly what it changed.
 */
function isolate(container: HTMLElement): () => void {
  const changed: HTMLElement[] = []

  for (
    let node: HTMLElement | null = container;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const parent: HTMLElement | null = node.parentElement

    if (!parent) {
      break
    }

    for (const sibling of Array.from(parent.children)) {
      if (
        sibling !== node &&
        sibling instanceof HTMLElement &&
        !sibling.hasAttribute('inert') &&
        !['SCRIPT', 'STYLE', 'TEMPLATE'].includes(sibling.tagName)
      ) {
        sibling.setAttribute('inert', '')
        sibling.setAttribute('aria-hidden', 'true')
        changed.push(sibling)
      }
    }
  }

  return () => {
    for (const element of changed) {
      element.removeAttribute('inert')
      element.removeAttribute('aria-hidden')
    }
  }
}

type ModalFocusOptions = {
  /** Called on Escape. */
  onClose: () => void
  /**
   * Focused on open: a ref, or a function resolved at open time. Falls back to
   * the first tabbable element, then the container itself.
   */
  initialFocus?: RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined)
  /** Element to return focus to on close (read at open); defaults to whatever had focus on open. */
  returnFocusRef?: RefObject<HTMLElement | null>
  /** Lets a component that is always mounted (a drawer) switch the behaviour on and off. */
  active?: boolean
}

/**
 * Modal keyboard behaviour for dialogs and drawers: focus moves in on open,
 * Tab and Shift+Tab cycle inside, Escape closes, the rest of the page is
 * inert, and focus returns to the trigger on close.
 *
 * The container should have `tabIndex={-1}` so it can hold focus when it has
 * nothing tabbable.
 */
export function useModalFocus(
  containerRef: RefObject<HTMLElement | null>,
  { onClose, initialFocus, returnFocusRef, active = true }: ModalFocusOptions,
): void {
  // Callers usually pass inline callbacks; a ref keeps the effect from re-running
  // (and stealing focus back) on every render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const container = containerRef.current

    if (!active || !container) {
      return
    }

    const layer = Symbol('modal-layer')
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const returnTarget = returnFocusRef?.current ?? previouslyFocused
    const restoreOutside = isolate(container)

    layers.push(layer)

    const requested = typeof initialFocus === 'function' ? initialFocus() : initialFocus?.current
    const initial = requested ?? getFocusable(container)[0] ?? container
    initial.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (layers[layers.length - 1] !== layer || !container) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = getFocusable(container)

      if (focusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const current = document.activeElement
      const outside = !(current instanceof Node) || !container.contains(current)

      if (event.shiftKey && (current === first || current === container || outside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (current === last || outside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      layers.splice(layers.indexOf(layer), 1)
      restoreOutside()

      if (returnTarget && returnTarget.isConnected) {
        returnTarget.focus()
      }
    }
    // initialFocus and returnFocusRef are read once at open and close, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, containerRef])
}
