import { Link } from 'react-router-dom'

type ViewAllLinkProps = {
  to: string
  label?: string
}

/** Small header control that sends the user to the full listing for a widget. */
export function ViewAllLink({ to, label = 'View All' }: ViewAllLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex h-12 shrink-0 items-center rounded-lg border border-slate-200 px-4 text-base font-semibold text-navy-700 transition-colors hover:bg-navy-50"
    >
      {label}
    </Link>
  )
}
