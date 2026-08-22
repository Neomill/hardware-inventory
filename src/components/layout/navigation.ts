import {
  Home,
  Package,
  ShoppingCart,
  Boxes,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react'

import { ROUTES } from '@/app/routes'

export type NavItem = {
  label: string
  /** Page heading shown in the top bar for this section. */
  title: string
  path: string
  icon: LucideIcon
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', title: 'Dashboard', path: ROUTES.dashboard, icon: Home },
  { label: 'Products', title: 'Products', path: ROUTES.products, icon: Package },
  { label: 'Sales (POS)', title: 'Sales (POS)', path: ROUTES.sales, icon: ShoppingCart },
  { label: 'Inventory', title: 'Inventory', path: ROUTES.inventory, icon: Boxes },
  { label: 'Customer Ledger', title: 'Customer Ledger', path: ROUTES.customers, icon: Users },
]

export const SECONDARY_NAV: NavItem[] = [
  { label: 'Settings', title: 'Settings', path: ROUTES.settings, icon: Settings },
]

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

/** Resolve the page heading for a pathname, falling back to the app dashboard. */
export function resolvePageTitle(pathname: string): string {
  const match = ALL_NAV.filter((item) => item.path !== ROUTES.dashboard).find((item) =>
    pathname.startsWith(item.path),
  )

  return match?.title ?? 'Dashboard'
}
