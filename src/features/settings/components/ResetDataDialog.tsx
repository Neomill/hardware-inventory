import { useRef } from 'react'
import { Download, RotateCcw } from 'lucide-react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { formatNumber } from '@/lib/format'

type ResetDataDialogProps = {
  onCancel: () => void
  onConfirm: () => void
  onExport: () => void
  saleCount: number
  hasSaleInProgress: boolean
}

/** Second step before a reset: it cannot be undone, so the export is offered first. */
export function ResetDataDialog({
  onCancel,
  onConfirm,
  onExport,
  saleCount,
  hasSaleInProgress,
}: ResetDataDialogProps) {
  // Focus opens on the safe action ("Export first"), never on Reset, so a stray
  // Enter cannot wipe the data.
  const safeActionRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog title="Reset demo data?" onClose={onCancel} initialFocusRef={safeActionRef}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-navy-900">
          Everything recorded on this device is replaced with the original demo data: products and
          stock, customers and balances, all {formatNumber(saleCount)} sales, payments and settings.
          {hasSaleInProgress ? ' The sale in progress and any held sales are cleared too.' : null}
        </p>

        <Alert tone="error">This cannot be undone. Export your data first to keep a copy.</Alert>

        <div className="flex flex-wrap justify-end gap-3">
          <Button ref={safeActionRef} icon={Download} onClick={onExport} className="sm:mr-auto">
            Export first
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            icon={RotateCcw}
            onClick={onConfirm}
            className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
          >
            Reset data
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
