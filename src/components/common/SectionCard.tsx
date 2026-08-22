import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SectionCardProps = {
  title: string
  /** Optional control in the header, typically a View All link. */
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** Titled panel used by every dashboard widget. */
export function SectionCard({ title, action, children, className }: SectionCardProps) {
  return (
    <section className={cn('card flex flex-col', className)}>
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="card-title">{title}</h2>
        {action}
      </header>

      <div className="flex-1 px-5 pb-5 pt-4">{children}</div>
    </section>
  )
}
