import { useEffect, useRef, useState } from 'react'
import { Eye, MoreVertical } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/routes'
import { placeMenu, type MenuPlacement } from '@/features/products/lib/menuPlacement'

type ProductRowActionsProps = {
  productId: string
  productName: string
}

const ICON_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-700 transition-colors hover:bg-navy-50'

/** Three items at py-2.5 plus the menu's padding; used to decide up or down. */
const MENU_HEIGHT = 140

const MENU_ITEM = 'block px-4 py-2.5 text-left text-sm text-navy-900 hover:bg-slate-50'

export function ProductRowActions({ productId, productName }: ProductRowActionsProps) {
  const [placement, setPlacement] = useState<MenuPlacement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isOpen = placement !== null

  function setOpen(open: boolean) {
    const trigger = triggerRef.current

    setPlacement(
      open && trigger
        ? placeMenu(trigger.getBoundingClientRect(), MENU_HEIGHT, {
            width: window.innerWidth,
            height: window.innerHeight,
          })
        : null,
    )
  }

  // A fixed menu would drift from its row, so scrolling or resizing closes it.
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const close = () => setPlacement(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)

    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [isOpen])

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

      <div>
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpen(!isOpen)}
          aria-label={`More actions for ${productName}`}
          aria-expanded={isOpen}
          className={ICON_BUTTON}
        >
          <MoreVertical className="h-4 w-4" aria-hidden />
        </button>

        {placement ? (
          <div
            style={placement}
            className="fixed z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-card-hover"
          >
            <Link
              to={ROUTES.productDetail(productId)}
              aria-label={`View details of ${productName}`}
              className={MENU_ITEM}
            >
              View details
            </Link>
            <Link
              to={ROUTES.receiveStockFor(productId)}
              aria-label={`Receive stock for ${productName}`}
              className={MENU_ITEM}
            >
              Receive stock
            </Link>
            <Link
              to={ROUTES.movementsFor(productId)}
              aria-label={`Stock history for ${productName}`}
              className={MENU_ITEM}
            >
              Stock history
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
