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
      className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-50"
    >
      {label}
    </Link>
  )
}
