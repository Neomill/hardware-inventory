import { useLocation, useParams } from 'react-router-dom'

import { PRODUCT_QUERY_PARAM, ROUTES } from '@/app/routes'
import { CurrentInventoryView } from '@/features/inventory/components/CurrentInventoryView'
import { InventoryTabs } from '@/features/inventory/components/InventoryTabs'
import { InvoiceDetailView } from '@/features/inventory/components/InvoiceDetailView'
import { InvoicesView } from '@/features/inventory/components/InvoicesView'
import { ReceiveStockView } from '@/features/inventory/components/ReceiveStockView'
import { StockMovementsView } from '@/features/inventory/components/StockMovementsView'

/** "/inventory/receive/" and "/inventory/receive" are the same view. */
function trimTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

/**
 * One page, four views, each with its own URL so the dashboard can link
 * straight to Receive Stock or the movement log. An invoice's own page
 * (ROUTES.patterns.invoiceDetail) is the Invoices view's detail.
 */
export function InventoryPage() {
  const location = useLocation()
  const pathname = trimTrailingSlash(location.pathname)
  const productId = new URLSearchParams(location.search).get(PRODUCT_QUERY_PARAM)
  // Set only on the invoice detail route; the router has already decoded it.
  const { invoiceNumber } = useParams<{ invoiceNumber?: string }>()

  function renderView() {
    if (invoiceNumber !== undefined) {
      return <InvoiceDetailView invoiceNumber={invoiceNumber} />
    }

    if (pathname === ROUTES.invoices) {
      return <InvoicesView />
    }

    if (pathname === ROUTES.receiveStock) {
      // Keyed on the history entry, so every navigation here (the tab, a "?product="
      // link, the same URL again) starts a fresh form instead of an old confirmation.
      return <ReceiveStockView key={location.key} initialProductId={productId ?? ''} />
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
