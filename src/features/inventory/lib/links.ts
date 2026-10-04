import { ROUTES } from '@/app/routes'

/** Query key both inventory sub-views read to preselect a product. */
export const PRODUCT_PARAM = 'product'

function withProduct(path: string, productId: string): string {
  return `${path}?${new URLSearchParams({ [PRODUCT_PARAM]: productId }).toString()}`
}

export function receiveStockFor(productId: string): string {
  return withProduct(ROUTES.receiveStock, productId)
}

export function movementsFor(productId: string): string {
  return withProduct(ROUTES.stockMovements, productId)
}
