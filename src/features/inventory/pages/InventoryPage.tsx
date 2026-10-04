import { useLocation } from 'react-router-dom'

import { ROUTES } from '@/app/routes'
import { CurrentInventoryView } from '@/features/inventory/components/CurrentInventoryView'
import { InventoryTabs } from '@/features/inventory/components/InventoryTabs'
import { ReceiveStockView } from '@/features/inventory/components/ReceiveStockView'
import { StockMovementsView } from '@/features/inventory/components/StockMovementsView'
import { PRODUCT_PARAM } from '@/features/inventory/lib/links'

/** "/inventory/receive/" and "/inventory/receive" are the same view. */
function trimTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

/**
 * One page, three views, each with its own URL so the dashboard can link
 * straight to Receive Stock or the movement log.
 */
export function InventoryPage() {
  const location = useLocation()
  const pathname = trimTrailingSlash(location.pathname)
  const productId = new URLSearchParams(location.search).get(PRODUCT_PARAM)

  function renderView() {
    if (pathname === ROUTES.receiveStock) {
      // Keyed so a new "?product=" link starts a fresh form.
      return <ReceiveStockView key={location.search} initialProductId={productId ?? ''} />
    }

    if (pathname === ROUTES.stockMovements) {
      return <StockMovementsView key={location.search} initialProductId={productId} />
    }

    return <CurrentInventoryView />
  }

  return (
    <div className="flex flex-col gap-5">
      <InventoryTabs />
      {renderView()}
    </div>
  )
}
