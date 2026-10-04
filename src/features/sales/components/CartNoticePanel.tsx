import { AlertTriangle, X } from 'lucide-react'

import type { CartNotice } from '@/features/sales/lib/heldSales'

type CartNoticePanelProps = {
  notice: CartNotice
  onDismiss: () => void
}

/**
 * Warning listing what changed in the cart (spec 03 s.7.3): quantities cut to
 * stock, lines removed, prices changed. It stays until dismissed; nothing in
 * the cart changes silently.
 */
export function CartNoticePanel({ notice, onDismiss }: CartNoticePanelProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="font-semibold">{notice.title}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {notice.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss cart changes"
        className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-amber-100"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
