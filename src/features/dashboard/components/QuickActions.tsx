import { Search, ShoppingCart, Truck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/routes'
import { cn } from '@/lib/utils'

type ActionVariant = 'navy' | 'brand' | 'outline'

type QuickAction = {
  to: string
  title: string
  subtitle: string
  icon: LucideIcon
  variant: ActionVariant
}

const VARIANT_STYLES: Record<ActionVariant, string> = {
  navy: 'bg-navy-800 text-white hover:bg-navy-700',
  brand: 'bg-brand-500 text-white hover:bg-brand-600',
  outline: 'border border-slate-200 bg-white text-navy-900 hover:bg-slate-50',
}

const SUBTITLE_STYLES: Record<ActionVariant, string> = {
  navy: 'text-navy-100',
  brand: 'text-white/80',
  outline: 'text-muted',
}

const ACTIONS: QuickAction[] = [
  {
    to: ROUTES.newSale,
    title: 'New Sale',
    subtitle: 'Open POS',
    icon: ShoppingCart,
    variant: 'navy',
  },
  {
    to: ROUTES.receiveStock,
    title: 'Receive Stock',
    subtitle: 'Add Inventory',
    icon: Truck,
    variant: 'brand',
  },
  {
    to: ROUTES.customers,
    title: 'Customer Ledger',
    subtitle: 'View Balances',
    icon: Users,
    variant: 'navy',
  },
  {
    to: ROUTES.products,
    title: 'Search Product',
    subtitle: 'Quick Lookup',
    icon: Search,
    variant: 'outline',
  },
]

/** The four primary jobs at the counter, one tap from the dashboard. */
export function QuickActions() {
  return (
    <section className="card px-5 py-5">
      <h2 className="card-title">Quick Actions</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon

          return (
            <Link
              key={action.to}
              to={action.to}
              className={cn(
                'flex items-center gap-3 rounded-xl px-5 py-4 transition-colors',
                VARIANT_STYLES[action.variant],
              )}
            >
              <Icon className="h-6 w-6 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{action.title}</span>
                <span className={cn('block truncate text-xs', SUBTITLE_STYLES[action.variant])}>
                  {action.subtitle}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
