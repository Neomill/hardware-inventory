import type { RefObject } from 'react'
import { Menu } from 'lucide-react'
import { NavLink, matchPath, useLocation } from 'react-router-dom'

import { BOTTOM_NAV } from '@/components/layout/navigation'
import { ROUTES } from '@/app/routes'
import { cn } from '@/lib/utils'

type BottomNavProps = {
  /** Opens the full navigation drawer (Products, Reports, Settings). */
  onOpenMore: () => void
  moreButtonRef: RefObject<HTMLButtonElement>
  /** Id of the drawer the More button opens. */
  moreControls: string
  isMoreOpen: boolean
}

const TAB =
  'flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-sm font-semibold leading-tight transition-colors'

/**
 * Labelled tabs along the bottom of the screen below the `lg` breakpoint, the
 * pattern both users know from Facebook on their phones (senior UX plan,
 * Phase 5). The sidebar takes over on tablet landscape and laptop.
 */
export function BottomNav({ onOpenMore, moreButtonRef, moreControls, isMoreOpen }: BottomNavProps) {
  const { pathname } = useLocation()
  // Pages behind More (Products, Reports, Settings, Help) light up More, so
  // there is always one tab saying where you are.
  const onMorePage = !BOTTOM_NAV.some((item) =>
    matchPath({ path: item.path, end: item.path === ROUTES.dashboard }, pathname),
  )

  return (
    <nav
      aria-label="Main"
      className="grid shrink-0 grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(15,23,42,0.06)] lg:hidden print:hidden"
    >
      {BOTTOM_NAV.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === ROUTES.dashboard}
            className={({ isActive }) =>
              cn(
                TAB,
                isActive
                  ? 'bg-brand-50 text-brand-800 shadow-[inset_0_3px_0_theme(colors.brand.700)]'
                  : 'text-navy-800 hover:bg-slate-50',
              )
            }
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        )
      })}

      <button
        ref={moreButtonRef}
        type="button"
        onClick={onOpenMore}
        aria-haspopup="dialog"
        aria-expanded={isMoreOpen}
        aria-controls={isMoreOpen ? moreControls : undefined}
        aria-label="More: open the full menu"
        className={cn(
          TAB,
          onMorePage
            ? 'bg-brand-50 text-brand-800 shadow-[inset_0_3px_0_theme(colors.brand.700)]'
            : 'text-navy-800 hover:bg-slate-50',
        )}
      >
        <Menu className="h-6 w-6 shrink-0" aria-hidden />
        <span>More</span>
      </button>
    </nav>
  )
}
