import { Undo2 } from 'lucide-react'

import { cn } from '@/lib/utils'

type UndoBarProps = {
  /** What just happened, e.g. "Removed Hammer 16oz." */
  message: string
  /** Names the action for screen readers, e.g. "Undo: put Hammer 16oz back". */
  undoLabel: string
  onUndo: () => void
  className?: string
}

/**
 * A small action can be taken back instead of being confirmed first (senior UX
 * plan, Phase 4). The bar stays until the next action; it never times out, so
 * nobody has to be quick to use it.
 */
export function UndoBar({ message, undoLabel, onUndo, className }: UndoBarProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl bg-navy-900 py-2 pl-4 pr-2 text-base text-white',
        className,
      )}
    >
      <span className="min-w-0 [overflow-wrap:anywhere]">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        aria-label={undoLabel}
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-white px-4 text-base font-semibold text-navy-900 transition-colors hover:bg-navy-50"
      >
        <Undo2 className="h-5 w-5" aria-hidden />
        Undo
      </button>
    </div>
  )
}
