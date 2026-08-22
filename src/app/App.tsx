import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { ROUTES } from '@/app/routes'
import { CustomerLedgerPage } from '@/features/customers/pages/CustomerLedgerPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
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
          <Route path="/products/:productId" element={<ProductsPage />} />
          <Route path={ROUTES.sales} element={<SalesPage />} />
          <Route path="/sales/new" element={<SalesPage />} />
          <Route path="/sales/:saleId" element={<SalesPage />} />
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
