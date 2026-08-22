import { ChevronDown, UserRound, Warehouse } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { ROUTES } from '@/app/routes'
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from '@/components/layout/navigation'
import { cn } from '@/lib/utils'

type SidebarProps = {
  /** Called after a nav item is chosen, so the mobile drawer can close itself. */
  onNavigate?: () => void
}

/** Signed-in user is stubbed for the POC; authentication is out of scope. */
const CURRENT_USER = { name: 'Juan Dela Cruz', role: 'Owner' }

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col bg-navy-900 text-white">
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500">
          <Warehouse className="h-6 w-6" aria-hidden />
        </span>
        <span className="text-lg font-extrabold uppercase leading-5 tracking-wide">
          Hardware
          <br />
          Store
        </span>
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3 py-2">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        {SECONDARY_NAV.map((item) => (
          <SidebarLink key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <UserRound className="h-6 w-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{CURRENT_USER.name}</span>
            <span className="block text-xs text-navy-200">{CURRENT_USER.role}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-navy-200" aria-hidden />
        </button>
      </div>
    </div>
  )
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      end={item.path === ROUTES.dashboard}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors',
          isActive ? 'bg-brand-500 text-white shadow-sm' : 'text-navy-100 hover:bg-white/5',
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}
