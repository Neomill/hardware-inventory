import { PauseCircle } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { heldSalesButtonName } from '@/features/sales/lib/heldSales'
import { cn } from '@/lib/utils'

type HeldSalesButtonProps = {
  count: number
  onClick: () => void
  className?: string
}

/**
 * Opens the Paused Sales list, with the number waiting as a badge (spec 03
 * s.7.1). Always shown and enabled, so its place never moves; at zero it opens
 * the empty list, which says how to hold a sale.
 */
export function HeldSalesButton({ count, onClick, className }: HeldSalesButtonProps) {
  return (
    <Button
      icon={PauseCircle}
      onClick={onClick}
      aria-label={heldSalesButtonName(count)}
      className={cn('relative', className)}
    >
      Paused Sales
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-700 px-1.5 text-sm font-bold text-white"
        >
          {count}
        </span>
      ) : null}
    </Button>
  )
}
