import { ClipboardList, PackagePlus, Warehouse } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { ROUTES } from '@/app/routes'
import { cn } from '@/lib/utils'

type Tab = {
  label: string
  to: string
  icon: LucideIcon
}

const TABS: Tab[] = [
  { label: 'Current Inventory', to: ROUTES.inventory, icon: Warehouse },
  { label: 'Receive Stock', to: ROUTES.receiveStock, icon: PackagePlus },
  { label: 'Stock Movements', to: ROUTES.stockMovements, icon: ClipboardList },
]

/** The three inventory views share one page; each has its own URL. */
export function InventoryTabs() {
  return (
    <nav aria-label="Inventory views" className="card flex gap-1 overflow-x-auto p-1.5">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            cn(
              'flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors',
              isActive ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-50',
            )
          }
        >
          <tab.icon className="h-5 w-5 shrink-0" aria-hidden />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
