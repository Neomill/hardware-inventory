import type { ReactNode } from 'react'
import { CalendarDays, ChevronRight, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/routes'

import { useCurrentTime } from '@/hooks/useCurrentTime'
import { formatDateLabel, formatTime } from '@/lib/format'

type TopBarProps = {
  title: string
  /** Replaces the breadcrumb where a section defines one. */
  subtitle?: string
  /** Every section except the Dashboard shows a trail back to it. */
  showBreadcrumb: boolean
}

export function TopBar({ title, subtitle, showBreadcrumb }: TopBarProps) {
  const now = useCurrentTime()

  return (
    <header className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8 print:px-0 print:pt-0">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>

        {subtitle ? <p className="mt-1 text-base text-muted">{subtitle}</p> : null}

        {showBreadcrumb && !subtitle ? (
          <nav
            aria-label="Breadcrumb"
            className="mt-1 flex items-center gap-2 text-sm print:hidden"
          >
            <Link
              to={ROUTES.dashboard}
              className="text-muted transition-colors hover:text-navy-700"
            >
              Home
            </Link>
            <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
            <span className="font-medium text-navy-900">{title}</span>
          </nav>
        ) : null}
      </div>

      {/* The page title prints; the clock and the menu button do not. */}
      {/* Wraps so the chips fit a phone at the larger text sizes. */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <InfoChip icon={<CalendarDays className="h-5 w-5 text-navy-700" aria-hidden />}>
          {formatDateLabel(now)}
        </InfoChip>
        <InfoChip icon={<Clock className="h-5 w-5 text-navy-700" aria-hidden />}>
          {formatTime(now)}
        </InfoChip>
      </div>
    </header>
  )
}

function InfoChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-900 shadow-card">
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </div>
  )
}
