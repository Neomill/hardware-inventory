import type { ReactNode } from 'react'
import { CalendarDays, Clock, Menu } from 'lucide-react'

import { useCurrentTime } from '@/hooks/useCurrentTime'
import { formatDateLabel, formatTime } from '@/lib/format'

type TopBarProps = {
  title: string
  onOpenMenu: () => void
}

export function TopBar({ title, onOpenMenu }: TopBarProps) {
  const now = useCurrentTime()

  return (
    <header className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-navy-800 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <h1 className="flex-1 text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>

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
