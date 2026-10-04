/**
 * Single source of truth for application paths.
 * Components must build links from here instead of hardcoding strings,
 * so route changes stay a one-file edit.
 */
export const ROUTES = {
  dashboard: '/',

  products: '/products',
  newProduct: '/products/new',
  productDetail: (productId: string) => `/products/${productId}`,
  lowStockProducts: '/products?filter=low-stock',

  sales: '/sales',
  newSale: '/sales/new',
  checkout: '/sales/checkout',
  saleDetail: (saleId: string) => `/sales/${saleId}`,

  inventory: '/inventory',
  receiveStock: '/inventory/receive',
  stockMovements: '/inventory/movements',

  customers: '/customers',
  customerDetail: (customerId: string) => `/customers/${customerId}`,

  reports: '/reports',

  settings: '/settings',
} as const
