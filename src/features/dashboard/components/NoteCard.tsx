import { StickyNote } from 'lucide-react'

import type { DashboardNote } from '@/features/dashboard/types'

type NoteCardProps = {
  note: DashboardNote
}

/**
 * Read-only reminder pinned to the dashboard. Authoring and persistence are
 * not specified yet (see specs/01/DESIGN-ERRATA.md E11).
 */
export function NoteCard({ note }: NoteCardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-amber-200/70 bg-amber-50/70 px-5 py-5">
      <div className="flex items-center gap-2">
        <StickyNote className="h-5 w-5 text-brand-600" aria-hidden />
        <h2 className="card-title text-brand-700">Note</h2>
      </div>

      <p className="text-sm leading-relaxed text-navy-900">{note.body}</p>
    </section>
  )
}
