import { forwardRef } from 'react'
import { Ban } from 'lucide-react'

import type { CancelledSummary } from '@/features/sales/lib/cancelSale'

type CancelledSaleBannerProps = {
  summary: CancelledSummary
}

/**
 * The rose banner at the top of a cancelled sale's page: who, when, why and
 * the stock returned (spec 04 sale cancellation s.7.1). The heading takes focus
 * after a cancellation, since the button that opened the dialog is gone.
 */
export const CancelledSaleBanner = forwardRef<HTMLHeadingElement, CancelledSaleBannerProps>(
  function CancelledSaleBanner({ summary }, headingRef) {
    return (
      <section className="flex flex-col items-center gap-2 rounded-card border border-rose-200 bg-rose-50 px-6 py-6 text-center">
        <Ban className="h-12 w-12 text-rose-600" aria-hidden />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-rose-700 focus:outline-none"
        >
          Cancelled
        </h2>
        <p className="text-sm text-rose-900 [overflow-wrap:anywhere]">
          {summary.headline} {summary.reason}
        </p>
        {summary.stockReturned ? (
          <p className="text-sm text-rose-900">{summary.stockReturned}</p>
        ) : null}
      </section>
    )
  },
)
