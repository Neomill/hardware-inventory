import { ClipboardList, FileText, PackagePlus, Warehouse } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { ROUTES } from '@/app/routes'
import { cn } from '@/lib/utils'

type Tab = {
  label: string
  /** Phone label, so all four tabs fit at 390px without scrolling. */
  shortLabel: string
  to: string
  icon: LucideIcon
  /** Also active on pages below this one (an invoice's detail page). */
  matchNested?: boolean
}

const TABS: Tab[] = [
  { label: 'Current Inventory', shortLabel: 'Inventory', to: ROUTES.inventory, icon: Warehouse },
  { label: 'Receive Stock', shortLabel: 'Receive', to: ROUTES.receiveStock, icon: PackagePlus },
  {
    label: 'Stock History',
    shortLabel: 'History',
    to: ROUTES.stockMovements,
    icon: ClipboardList,
  },
  {
    label: 'Invoices',
    shortLabel: 'Invoices',
    to: ROUTES.invoices,
    icon: FileText,
    matchNested: true,
  },
]

/** The four inventory views share one page; each has its own URL. */
export function InventoryTabs() {
  return (
    <nav aria-label="Inventory views" className="card grid grid-cols-4 gap-1 p-1.5">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={!tab.matchNested}
          className={({ isActive }) =>
            cn(
              'flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-sm font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:text-sm',
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
