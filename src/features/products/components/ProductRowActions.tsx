import { Eye, History, PackagePlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/routes'

type ProductRowActionsProps = {
  productId: string
  productName: string
}

const ACTION =
  'inline-flex h-12 items-center gap-2 rounded-lg border border-slate-200 px-3 text-base font-semibold text-navy-800 transition-colors hover:bg-navy-50'

/**
 * Every row action is a labelled button in plain view. A "⋮" menu hid them
 * behind an icon, which older users often do not recognise (senior UX plan,
 * Phase 2). Each accessible name contains the visible word.
 */
export function ProductRowActions({ productId, productName }: ProductRowActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to={ROUTES.productDetail(productId)}
        aria-label={`View ${productName}`}
        className={ACTION}
      >
        <Eye className="h-5 w-5" aria-hidden />
        View
      </Link>
      <Link
        to={ROUTES.receiveStockFor(productId)}
        aria-label={`Receive stock for ${productName}`}
        className={ACTION}
      >
        <PackagePlus className="h-5 w-5" aria-hidden />
        Receive
      </Link>
      <Link
        to={ROUTES.movementsFor(productId)}
        aria-label={`Stock history for ${productName}`}
        className={ACTION}
      >
        <History className="h-5 w-5" aria-hidden />
        History
      </Link>
    </div>
  )
}
