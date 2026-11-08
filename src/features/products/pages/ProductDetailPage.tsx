import { useEffect, useMemo, useState } from 'react'
import { Package } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/app/routes'
import { filterMovements, summarizeMovements } from '@/domain/inventory'
import { EditProductDialog } from '@/features/products/components/EditProductDialog'
import { ProductHeaderCard } from '@/features/products/components/ProductHeaderCard'
import { ProductMovementsCard } from '@/features/products/components/ProductMovementsCard'
import { ProductSalesCard } from '@/features/products/components/ProductSalesCard'
import { ProductStockCard } from '@/features/products/components/ProductStockCard'
import {
  DETAIL_LIST_LIMIT,
  movementReferenceLink,
  productAddedNotice,
  productSalesHistory,
  readProductAddedState,
} from '@/features/products/lib/productDetail'
import { useShopStore } from '@/stores/useShopStore'

export function ProductDetailPage() {
  const { productId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const product = useShopStore((state) =>
    state.products.find((candidate) => candidate.id === productId),
  )
  const movements = useShopStore((state) => state.movements)
  const sales = useShopStore((state) => state.sales)
  const invoices = useShopStore((state) => state.invoices)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  // Every figure comes from store data at render time (E3, E4).
  const productMovements = useMemo(
    () => filterMovements(movements, { productId }),
    [movements, productId],
  )
  const totals = useMemo(() => summarizeMovements(productMovements), [productMovements])
  const movementRows = useMemo(
    () =>
      productMovements.slice(0, DETAIL_LIST_LIMIT).map((movement) => ({
        movement,
        referenceTo: movementReferenceLink(movement, sales, invoices),
      })),
    [productMovements, sales, invoices],
  )
  const saleRows = useMemo(
    () => productSalesHistory(sales, productId, DETAIL_LIST_LIMIT),
    [sales, productId],
  )

  // Read the "added" notice once, then drop it from history so a reload or
  // Back does not show it again (HashRouter keeps location.state).
  const [added] = useState(() => ({
    productId,
    openingStock: readProductAddedState(location.state),
  }))
  const addedOpeningStock = added.productId === productId ? added.openingStock : null

  useEffect(() => {
    if (location.state !== null && location.state !== undefined) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  if (!product) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <Package className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-navy-900">Product not found</h2>
        <p className="max-w-md text-sm text-muted">
          This product is not saved on this device. It may have been removed by a demo data reset.
        </p>
        <Button to={ROUTES.products}>Back to Products</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {addedOpeningStock !== null ? (
        <Alert tone="success">{productAddedNotice(addedOpeningStock, product.unit)}</Alert>
      ) : null}
      {saved ? <Alert tone="success">Product saved.</Alert> : null}

      <ProductHeaderCard
        product={product}
        onEdit={() => {
          setSaved(false)
          setEditing(true)
        }}
      />
      <ProductStockCard product={product} totals={totals} />
      <ProductMovementsCard product={product} rows={movementRows} />
      <ProductSalesCard unit={product.unit} rows={saleRows} />

      {editing ? (
        <EditProductDialog
          product={product}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            setSaved(true)
          }}
        />
      ) : null}
    </div>
  )
}
