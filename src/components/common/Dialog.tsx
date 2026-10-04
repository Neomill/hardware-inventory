import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

type DialogProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Centred modal. Escape and the backdrop both close it, and the page behind is
 * locked so a stray scroll cannot move the counter's context.
 */
export function Dialog({ title, onClose, children }: DialogProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-navy-950/50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white shadow-card-hover"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <h2 className="text-2xl font-bold text-navy-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-navy-700 transition-colors hover:bg-slate-100"
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
        </header>

        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  )
}
