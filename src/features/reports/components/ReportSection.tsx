import type { ReactNode } from 'react'

import type { ReportSectionId } from '@/features/reports/lib/reportRange'

type ReportSectionProps = {
  id: ReportSectionId
  title: string
  description: string
  /** Controls beside the heading, such as a metric toggle. */
  action?: ReactNode
  children: ReactNode
}

/** One of the four report groups: a page-level heading, then its cards. */
export function ReportSection({ id, title, description, action, children }: ReportSectionProps) {
  const headingId = `${id}-heading`

  return (
    <section id={id} aria-labelledby={headingId} className="flex scroll-mt-4 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-lg font-bold text-navy-900">
            {title}
          </h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
