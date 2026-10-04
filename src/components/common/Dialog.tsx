import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { getFocusable, useModalFocus } from '@/components/common/useModalFocus'

type DialogProps = {
  title: string
  onClose: () => void
  children: ReactNode
  /**
   * Element to focus when the dialog opens. Defaults to the first focusable
   * control in the body (falling back to the close button).
   */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** Id of an element inside the dialog that describes it, for aria-describedby. */
  describedBy?: string
}

/**
 * Centred modal, rendered into <body>. Focus moves in on open and is trapped
 * while open, Escape and the backdrop close it, the page behind is inert and
 * scroll-locked, and focus returns to the trigger on close.
 */
export function Dialog({ title, onClose, children, initialFocusRef, describedBy }: DialogProps) {
  const titleId = useId()
  const layerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // The whole layer (backdrop + panel) is the modal root, so the backdrop stays
  // clickable while everything else on the page is inert.
  useModalFocus(layerRef, {
    onClose,
    // Prefer a control in the body over the header's close button, so the
    // first Tab stop is the task rather than dismissing it.
    initialFocus: () =>
      initialFocusRef?.current ??
      (bodyRef.current ? getFocusable(bodyRef.current)[0] : undefined) ??
      closeRef.current,
  })

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none"
    >
      {/* Pointer-only dismissal; keyboard users have Escape and the close button. */}
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-navy-950/50" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        className="relative flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white shadow-card-hover"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <h2 id={titleId} className="text-2xl font-bold text-navy-900">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-navy-700 transition-colors hover:bg-slate-100"
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
        </header>

        <div ref={bodyRef} className="px-6 pb-6 pt-4">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
