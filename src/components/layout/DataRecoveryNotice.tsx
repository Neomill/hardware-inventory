import { useId } from 'react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { describeDataRecovery } from '@/components/layout/dataRecoveryMessage'
import { useShopStore, type DataRecovery } from '@/stores/useShopStore'

type DataRecoveryNoticeViewProps = {
  recovery: DataRecovery
  onDismiss: () => void
}

/** The notice itself, without the store: what tests render. */
export function DataRecoveryNoticeView({ recovery, onDismiss }: DataRecoveryNoticeViewProps) {
  const messageId = useId()
  const { heading, detail, backup } = describeDataRecovery(recovery)

  return (
    <Alert
      tone="warning"
      id={messageId}
      className="print:hidden"
      action={
        <Button onClick={onDismiss} aria-describedby={messageId} className="w-full sm:w-auto">
          Dismiss
        </Button>
      }
    >
      <strong className="font-semibold">{heading}</strong> {detail} {backup}
      {recovery.backupKey !== null ? (
        <span className="mt-1 block break-all text-xs">
          Backup name, for whoever helps you restore it: {recovery.backupKey}
        </span>
      ) : null}
    </Alert>
  )
}

/**
 * Shown at the top of every page after a load that could not use the saved
 * data as it was (`dataRecovery` in the shop store). Dismissing it only hides
 * the notice; the backup copy stays on the device. Never printed.
 */
export function DataRecoveryNotice() {
  const recovery = useShopStore((state) => state.dataRecovery)
  const dismiss = useShopStore((state) => state.dismissDataRecovery)

  if (!recovery) {
    return null
  }

  return (
    <div className="px-4 pb-4 sm:px-6 lg:px-8 print:hidden">
      <DataRecoveryNoticeView recovery={recovery} onDismiss={dismiss} />
    </div>
  )
}
