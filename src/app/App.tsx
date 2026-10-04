import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { ROUTES } from '@/app/routes'
import { CustomerLedgerPage } from '@/features/customers/pages/CustomerLedgerPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { NewProductPage } from '@/features/products/pages/NewProductPage'
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { CheckoutPage } from '@/features/sales/pages/CheckoutPage'
import { PosPage } from '@/features/sales/pages/PosPage'
import { SaleCompletePage } from '@/features/sales/pages/SaleCompletePage'
import { SalesRootPage } from '@/features/sales/pages/SalesRootPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

/**
 * HashRouter is intentional: GitHub Pages serves static files only and has no
 * SPA rewrite, so a browser-history deep link such as /sales/123 would 404 on
 * refresh. Hash routes keep every URL shareable without server configuration.
 */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.products} element={<ProductsPage />} />
          <Route path={ROUTES.newProduct} element={<NewProductPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path={ROUTES.sales} element={<SalesRootPage />} />
          <Route path={ROUTES.newSale} element={<PosPage />} />
          <Route path={ROUTES.checkout} element={<CheckoutPage />} />
          <Route path="/sales/:saleId" element={<SaleCompletePage />} />
          <Route path={ROUTES.inventory} element={<InventoryPage />} />
          <Route path="/inventory/receive" element={<InventoryPage />} />
          <Route path="/inventory/movements" element={<InventoryPage />} />
          <Route path={ROUTES.customers} element={<CustomerLedgerPage />} />
          <Route path="/customers/:customerId" element={<CustomerLedgerPage />} />
          <Route path={ROUTES.reports} element={<ReportsPage />} />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
          <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
