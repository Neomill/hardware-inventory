/**
 * Single source of truth for application paths.
 * Components must build links from here instead of hardcoding strings,
 * so route changes stay a one-file edit.
 */

/** Query key the inventory sub-views read to preselect a product. */
export const PRODUCT_QUERY_PARAM = 'product'

/** Query key the Products page reads to filter by stock. */
export const STOCK_QUERY_PARAM = 'stock'

/**
 * Stock filters a link can preselect on the Products page. `restock` is low
 * or out of stock (stock <= reorder level), which is what the dashboard's
 * Low Stock card counts.
 */
export const PRODUCT_STOCK_FILTERS = ['in_stock', 'low_stock', 'out_of_stock', 'restock'] as const

export type ProductStockFilter = (typeof PRODUCT_STOCK_FILTERS)[number]

export function isProductStockFilter(value: unknown): value is ProductStockFilter {
  return typeof value === 'string' && (PRODUCT_STOCK_FILTERS as readonly string[]).includes(value)
}

function withQuery(path: string, params: Record<string, string>): string {
  return `${path}?${new URLSearchParams(params).toString()}`
}

/**
 * Options for a deep link into Reports. Structurally the same as the reports
 * feature's ReportRangeSelection / ReportSectionId / TopProductsMetric, so
 * values from there pass straight in.
 */
export type ReportsLinkOptions = {
  range?: {
    preset: 'today' | 'yesterday' | '7d' | '30d' | 'custom'
    /** "YYYY-MM-DD"; only written for a custom range. */
    from?: string
    to?: string
  }
  /** Top Products ranking. */
  top?: 'quantity' | 'revenue'
  /** Section the page scrolls to (a HashRouter URL cannot carry a #anchor). */
  section?: 'daily-sales' | 'top-products' | 'payment-breakdown' | 'outstanding-credit'
}

const REPORTS = '/reports'

/** "/reports?range=custom&from=2026-10-01&to=2026-10-04&section=daily-sales" */
function reportsFor(options: ReportsLinkOptions = {}): string {
  const params = new URLSearchParams()

  if (options.range) {
    params.set('range', options.range.preset)

    if (options.range.preset === 'custom') {
      if (options.range.from) params.set('from', options.range.from)
      if (options.range.to) params.set('to', options.range.to)
    }
  }

  if (options.top) {
    params.set('top', options.top)
  }

  if (options.section) {
    params.set('section', options.section)
  }

  const query = params.toString()

  return query ? `${REPORTS}?${query}` : REPORTS
}

const RECEIVE_STOCK = '/inventory/receive'
const STOCK_MOVEMENTS = '/inventory/movements'

export const ROUTES = {
  dashboard: '/',

  products: '/products',
  newProduct: '/products/new',
  productDetail: (productId: string) => `/products/${encodeURIComponent(productId)}`,
  /** "/products?stock=restock" */
  productsByStock: (filter: ProductStockFilter) =>
    withQuery('/products', { [STOCK_QUERY_PARAM]: filter }),

  sales: '/sales',
  newSale: '/sales/new',
  checkout: '/sales/checkout',
  saleDetail: (saleId: string) => `/sales/${encodeURIComponent(saleId)}`,

  inventory: '/inventory',
  receiveStock: RECEIVE_STOCK,
  stockMovements: STOCK_MOVEMENTS,
  /** "/inventory/receive?product=<id>" */
  receiveStockFor: (productId: string) =>
    withQuery(RECEIVE_STOCK, { [PRODUCT_QUERY_PARAM]: productId }),
  /** "/inventory/movements?product=<id>" */
  movementsFor: (productId: string) =>
    withQuery(STOCK_MOVEMENTS, { [PRODUCT_QUERY_PARAM]: productId }),

  customers: '/customers',
  customerDetail: (customerId: string) => `/customers/${encodeURIComponent(customerId)}`,

  reports: REPORTS,
  reportsFor,

  settings: '/settings',

  /** Route patterns for <Route path>; links use the builders above. */
  patterns: {
    productDetail: '/products/:productId',
    saleDetail: '/sales/:saleId',
    customerDetail: '/customers/:customerId',
  },
} as const
