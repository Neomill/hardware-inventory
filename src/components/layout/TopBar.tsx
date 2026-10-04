import type { ReactNode, RefObject } from 'react'
import { CalendarDays, ChevronRight, Clock, Menu } from 'lucide-react'
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
  onOpenMenu: () => void
  /** Lets the shell return focus here when the mobile drawer closes. */
  menuButtonRef?: RefObject<HTMLButtonElement>
  /** Id of the drawer the menu button opens. */
  menuControls?: string
  isMenuOpen?: boolean
}

export function TopBar({
  title,
  subtitle,
  showBreadcrumb,
  onOpenMenu,
  menuButtonRef,
  menuControls,
  isMenuOpen,
}: TopBarProps) {
  const now = useCurrentTime()

  return (
    <header className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onOpenMenu}
        aria-haspopup="dialog"
        aria-expanded={isMenuOpen}
        aria-controls={isMenuOpen ? menuControls : undefined}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-navy-800 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>

        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}

        {showBreadcrumb && !subtitle ? (
          <nav aria-label="Breadcrumb" className="mt-1 flex items-center gap-2 text-sm">
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

      <div className="flex items-center gap-3">
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
