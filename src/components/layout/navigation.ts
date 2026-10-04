import {
  Home,
  Package,
  ShoppingCart,
  Boxes,
  Users,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'

import { ROUTES } from '@/app/routes'

export type NavItem = {
  label: string
  /** Page heading shown in the top bar for this section. */
  title: string
  /** Shown under the heading instead of a breadcrumb, where one is defined. */
  subtitle?: string
  path: string
  icon: LucideIcon
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', title: 'Dashboard', path: ROUTES.dashboard, icon: Home },
  { label: 'Products', title: 'Products', path: ROUTES.products, icon: Package },
  {
    label: 'Sales (POS)',
    title: 'Sales (POS)',
    subtitle: 'Create new sales and view your recent transactions.',
    path: ROUTES.sales,
    icon: ShoppingCart,
  },
  { label: 'Inventory', title: 'Inventory', path: ROUTES.inventory, icon: Boxes },
  { label: 'Customer Ledger', title: 'Customer Ledger', path: ROUTES.customers, icon: Users },
  { label: 'Reports', title: 'Reports', path: ROUTES.reports, icon: BarChart3 },
]

export const SECONDARY_NAV: NavItem[] = [
  { label: 'Settings', title: 'Settings', path: ROUTES.settings, icon: Settings },
]

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

function findSection(pathname: string): NavItem | undefined {
  return ALL_NAV.filter((item) => item.path !== ROUTES.dashboard).find((item) =>
    pathname.startsWith(item.path),
  )
}

/** Resolve the page heading for a pathname, falling back to the app dashboard. */
export function resolvePageTitle(pathname: string): string {
  return findSection(pathname)?.title ?? 'Dashboard'
}

/** The subtitle for a section, when it defines one. Only the root path shows it. */
export function resolvePageSubtitle(pathname: string): string | undefined {
  const section = findSection(pathname)

  return section && pathname === section.path ? section.subtitle : undefined
}
