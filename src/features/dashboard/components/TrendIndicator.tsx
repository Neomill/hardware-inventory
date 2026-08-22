import { ArrowDown, ArrowUp } from 'lucide-react'

import { cn } from '@/lib/utils'

type TrendIndicatorProps = {
  /** Percentage change against the previous period. */
  changePercent: number
  /**
   * Whether a rise is good news. Sales rising is good; outstanding credit
   * rising is not, so direction and colour are decided separately.
   */
  higherIsBetter: boolean
}

export function TrendIndicator({ changePercent, higherIsBetter }: TrendIndicatorProps) {
  const isRising = changePercent >= 0
  const isGood = isRising === higherIsBetter
  const Icon = isRising ? ArrowUp : ArrowDown

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold',
        isGood ? 'text-emerald-600' : 'text-rose-600',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {Math.abs(changePercent).toFixed(1)}%
    </span>
  )
}
