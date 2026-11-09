import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { BottomNav } from '@/components/layout/BottomNav'
import { DataRecoveryNotice } from '@/components/layout/DataRecoveryNotice'
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { resolvePageSubtitle, resolvePageTitle } from '@/components/layout/navigation'
import { ROUTES } from '@/app/routes'
import { APP_NAME, APP_VERSION } from '@/config/app'
import { DESKTOP_NAV_QUERY, useMediaQuery } from '@/hooks/useMediaQuery'

const DRAWER_ID = 'mobile-navigation'

/**
 * Application frame: fixed sidebar from `lg` up; below it, labelled tabs along
 * the bottom with a More button for the full drawer. Only the content column scrolls, so the nav and the page
 * heading stay reachable during long sessions at the counter.
 *
 * In print the frame lets go of the viewport height and its scroll container,
 * so a long page prints in full; the navigation and footer are `print:hidden`.
 */
export function AppShell() {
  const [isMenuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const location = useLocation()
  const title = resolvePageTitle(location.pathname)
  const subtitle = resolvePageSubtitle(location.pathname)

  // The drawer is lg:hidden. If the viewport grows past lg while it is open
  // (a tablet rotating), close it: otherwise it would vanish but keep the page
  // inert, with the menu button hidden too.
  const isDesktop = useMediaQuery(DESKTOP_NAV_QUERY)
  const showDrawer = isMenuOpen && !isDesktop

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, isDesktop])

  return (
    <div className="flex h-full bg-surface print:block print:h-auto print:bg-white">
      <aside className="hidden shrink-0 lg:block print:hidden">
        <Sidebar />
      </aside>

      {showDrawer ? (
        <MobileNavDrawer id={DRAWER_ID} onClose={closeMenu} returnFocusRef={menuButtonRef} />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto print:block print:overflow-visible">
          <TopBar
            title={title}
            subtitle={subtitle}
            showBreadcrumb={location.pathname !== ROUTES.dashboard}
          />

          <DataRecoveryNotice />

          <main className="flex-1 px-4 pb-6 sm:px-6 lg:px-8 print:px-0 print:pb-0">
            <Outlet />
          </main>

          <footer className="flex items-center print:hidden justify-between border-t border-slate-200 px-4 py-4 text-sm text-muted sm:px-6 lg:px-8">
            <span>{APP_NAME}</span>
            <span>{APP_VERSION}</span>
          </footer>
        </div>

        {/* Outside the scroll area, so sticky bars on a page sit just above it. */}
        <BottomNav
          onOpenMore={() => setMenuOpen(true)}
          moreButtonRef={menuButtonRef}
          moreControls={DRAWER_ID}
          isMoreOpen={showDrawer}
        />
      </div>
    </div>
  )
}
