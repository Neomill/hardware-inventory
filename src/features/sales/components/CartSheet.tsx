import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import { useModalFocus } from '@/components/common/useModalFocus'

type CartSheetProps = {
  id: string
  /** Id of the cart heading inside, which names the dialog. */
  labelledBy: string
  onClose: () => void
  /** Focused on open (the cart heading, so the title is read first). */
  initialFocusRef: RefObject<HTMLElement | null>
  /** Focus goes back here on close (the View cart button). */
  returnFocusRef: RefObject<HTMLElement | null>
  children: ReactNode
}

/**
 * The cart as a bottom sheet, for screens where it does not fit beside the
 * product grid (under `xl`). Same modal behaviour as the shared Dialog: focus
 * moves in and is trapped, Escape and the backdrop close it, the page behind
 * is inert and focus returns to the trigger. It slides up from the bottom
 * edge, unless the user prefers reduced motion.
 */
export function CartSheet({
  id,
  labelledBy,
  onClose,
  initialFocusRef,
  returnFocusRef,
  children,
}: CartSheetProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useModalFocus(layerRef, { onClose, initialFocus: initialFocusRef, returnFocusRef })

  // Declared after useModalFocus so focus lands while the panel is in place;
  // the slide-up then only moves pixels.
  useEffect(() => {
    const panel = panelRef.current
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    if (!panel || reduceMotion || typeof panel.animate !== 'function') {
      return
    }

    const animation = panel.animate(
      [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
      { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    )

    return () => animation.cancel()
  }, [])

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center focus:outline-none print:hidden"
    >
      {/* Pointer-only dismissal; keyboard users have Escape and the close button. */}
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-navy-950/50" />

      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-testid="pos-cart-sheet"
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 flex-col sm:max-w-xl"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
