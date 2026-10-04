import { ClipboardList, PackagePlus, Warehouse } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { ROUTES } from '@/app/routes'
import { cn } from '@/lib/utils'

type Tab = {
  label: string
  /** Phone label, so all three tabs fit at 390px without scrolling. */
  shortLabel: string
  to: string
  icon: LucideIcon
}

const TABS: Tab[] = [
  { label: 'Current Inventory', shortLabel: 'Inventory', to: ROUTES.inventory, icon: Warehouse },
  { label: 'Receive Stock', shortLabel: 'Receive', to: ROUTES.receiveStock, icon: PackagePlus },
  {
    label: 'Stock Movements',
    shortLabel: 'Movements',
    to: ROUTES.stockMovements,
    icon: ClipboardList,
  },
]

/** The three inventory views share one page; each has its own URL. */
export function InventoryTabs() {
  return (
    <nav aria-label="Inventory views" className="card grid grid-cols-3 gap-1 p-1.5">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            cn(
              'flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:text-sm',
              isActive ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-50',
            )
          }
        >
          <tab.icon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="truncate sm:hidden">{tab.shortLabel}</span>
          <span className="hidden truncate sm:inline">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
