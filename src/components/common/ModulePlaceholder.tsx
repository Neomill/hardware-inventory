import type { LucideIcon } from 'lucide-react'

type ModulePlaceholderProps = {
  icon: LucideIcon
  title: string
  description: string
}

/**
 * Stand-in for modules that are routed but not yet implemented.
 * Keeps navigation from the Dashboard verifiable end to end.
 */
export function ModulePlaceholder({ icon: Icon, title, description }: ModulePlaceholderProps) {
  return (
    <section className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      <p className="max-w-md text-sm text-muted">{description}</p>
    </section>
  )
}
