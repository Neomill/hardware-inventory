import { Lightbulb } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/routes'
import { useDismissedTip } from '@/hooks/useDismissedTip'

/**
 * First-time tip on the Sell screen (senior UX plan, Phase 6). It stays until
 * "Got it" and then never shows again on this device.
 */
export function SellTip() {
  const [dismissed, dismiss] = useDismissedTip('sell')

  if (dismissed) {
    return null
  }

  return (
    <aside
      aria-label="Tip"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-base text-navy-900 print:hidden"
    >
      <Lightbulb className="h-6 w-6 shrink-0 text-blue-700" aria-hidden />
      <p className="min-w-0 flex-1 basis-64">
        <strong>Tip:</strong> tap <strong>Add 1</strong> to put one in the cart. For many, tap{' '}
        <strong>Choose Quantity</strong>. Removed something by mistake? Tap <strong>Undo</strong>.
      </p>
      <div className="flex shrink-0 gap-2">
        <Link
          to={ROUTES.help}
          className="inline-flex h-12 items-center rounded-xl px-3 text-base font-semibold text-navy-700 underline-offset-4 hover:underline"
        >
          More help
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-12 items-center rounded-xl bg-navy-900 px-4 text-base font-semibold text-white transition-colors hover:bg-navy-800"
        >
          Got it
        </button>
      </div>
    </aside>
  )
}
