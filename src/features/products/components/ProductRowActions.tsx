import { useState } from 'react'
import { Eye, MoreVertical } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/routes'

type ProductRowActionsProps = {
  productId: string
  productName: string
}

const ICON_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-700 transition-colors hover:bg-navy-50'

const MENU_ITEM = 'block px-4 py-2.5 text-left text-sm text-navy-900 hover:bg-slate-50'

export function ProductRowActions({ productId, productName }: ProductRowActionsProps) {
  const [isOpen, setOpen] = useState(false)

  return (
    <div
      className="flex items-center gap-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false)
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false)
        }
      }}
    >
      <Link
        to={ROUTES.productDetail(productId)}
        aria-label={`View ${productName}`}
        className={ICON_BUTTON}
      >
        <Eye className="h-4 w-4" aria-hidden />
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((open) => !open)}
          aria-label={`More actions for ${productName}`}
          aria-expanded={isOpen}
          className={ICON_BUTTON}
        >
          <MoreVertical className="h-4 w-4" aria-hidden />
        </button>

        {isOpen ? (
          <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-card-hover">
            <Link to={ROUTES.productDetail(productId)} className={MENU_ITEM}>
              View details
            </Link>
            <Link to={ROUTES.receiveStock} className={MENU_ITEM}>
              Receive stock
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
