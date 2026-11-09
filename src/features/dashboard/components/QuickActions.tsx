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
  /** Router location state for the destination page. */
  state?: Record<string, unknown>
}

const VARIANT_STYLES: Record<ActionVariant, string> = {
  navy: 'bg-navy-800 text-white hover:bg-navy-700',
  brand: 'bg-brand-700 text-white hover:bg-brand-800',
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
    title: 'Sell',
    subtitle: 'Start a new sale',
    icon: ShoppingCart,
    variant: 'navy',
  },
  {
    to: ROUTES.receiveStock,
    title: 'Receive Delivery',
    subtitle: 'Add stock from a supplier',
    icon: Truck,
    variant: 'brand',
  },
  {
    to: ROUTES.products,
    title: 'Check Stock',
    subtitle: 'Find a product and its stock',
    icon: Search,
    variant: 'outline',
    // The Products page focuses its search box when it receives this state.
    state: { focusSearch: true },
  },
  {
    to: ROUTES.customers,
    title: 'Who Owes Me',
    subtitle: 'Customer credit and payments',
    icon: Users,
    variant: 'outline',
  },
]

/**
 * The four jobs done at the counter, as big buttons at the top of the home
 * screen (senior UX plan, Phase 5). The figures come after them.
 */
export function QuickActions() {
  return (
    <section className="card px-5 py-5">
      <h2 className="card-title">What would you like to do?</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon

          return (
            <Link
              key={action.to}
              to={action.to}
              state={action.state}
              className={cn(
                'flex min-h-24 items-center gap-4 rounded-xl px-5 py-4 transition-colors',
                VARIANT_STYLES[action.variant],
              )}
            >
              <Icon className="h-8 w-8 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-xl font-bold">{action.title}</span>
                <span className={cn('block text-base', SUBTITLE_STYLES[action.variant])}>
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
