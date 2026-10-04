import { useRef, type RefObject } from 'react'

import { useModalFocus } from '@/components/common/useModalFocus'
import { Sidebar } from '@/components/layout/Sidebar'

type MobileNavDrawerProps = {
  id: string
  onClose: () => void
  /** The menu button that opened the drawer; focus returns to it on close. */
  returnFocusRef: RefObject<HTMLElement | null>
}

/**
 * Slide-over navigation for narrow screens. Mounted only while open: focus
 * moves to the first nav link, Tab stays inside, Escape closes, and the page
 * behind is inert until it does.
 */
export function MobileNavDrawer({ id, onClose, returnFocusRef }: MobileNavDrawerProps) {
  const layerRef = useRef<HTMLDivElement>(null)

  useModalFocus(layerRef, { onClose, returnFocusRef })

  return (
    <div ref={layerRef} tabIndex={-1} className="fixed inset-0 z-40 focus:outline-none lg:hidden">
      {/* Out of the Tab order (Escape closes); still reachable by touch screen readers. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close navigation menu"
        className="absolute inset-0 bg-navy-950/50"
        onClick={onClose}
      />
      <div
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="absolute inset-y-0 left-0 shadow-xl"
      >
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  )
}
