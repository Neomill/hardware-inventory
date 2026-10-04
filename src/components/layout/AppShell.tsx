import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { resolvePageSubtitle, resolvePageTitle } from '@/components/layout/navigation'
import { ROUTES } from '@/app/routes'
import { APP_NAME, APP_VERSION } from '@/config/app'
import { cn } from '@/lib/utils'

/**
 * Application frame: fixed sidebar on tablet/desktop, slide-over drawer on
 * narrow screens. Only the content column scrolls, so the nav and the page
 * heading stay reachable during long sessions at the counter.
 */
export function AppShell() {
  const [isMenuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const title = resolvePageTitle(location.pathname)
  const subtitle = resolvePageSubtitle(location.pathname)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-full bg-surface">
      <aside className="hidden shrink-0 lg:block">
        <Sidebar />
      </aside>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-navy-950/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className={cn('absolute inset-y-0 left-0 shadow-xl')}>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <TopBar
          title={title}
          subtitle={subtitle}
          showBreadcrumb={location.pathname !== ROUTES.dashboard}
          onOpenMenu={() => setMenuOpen(true)}
        />

        <main className="flex-1 px-4 pb-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-4 text-xs text-muted sm:px-6 lg:px-8">
          <span>{APP_NAME}</span>
          <span>{APP_VERSION}</span>
        </footer>
      </div>
    </div>
  )
}
