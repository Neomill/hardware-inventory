import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, PlayCircle, Plus, Tag, Trash2 } from 'lucide-react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { Dialog } from '@/components/common/Dialog'
import { FormField } from '@/components/common/FormField'
import { StatusPill } from '@/components/common/StatusPill'
import { TextInput } from '@/components/common/TextInput'
import { ROUTES } from '@/app/routes'
import {
  NOTHING_SELLABLE_TEXT,
  buildHeldSaleRows,
  buildResumeNotice,
  heldLabelError,
  labelCounter,
  type CartNotice,
  type HeldSaleRow,
} from '@/features/sales/lib/heldSales'
import { formatItemCount } from '@/features/sales/lib/salesMetrics'
import { useShopStore } from '@/stores/useShopStore'
import { formatCurrency } from '@/lib/format'

type HeldSalesDialogProps = {
  onClose: () => void
  /** Called after a resume or swap; the caller navigates to the POS page. */
  onResumed: (notice: CartNotice | null) => void
}

type Confirming = { kind: 'discard'; id: string } | { kind: 'swap'; id: string } | null

/**
 * Every held sale, newest first, with what resuming it would change (spec 03
 * s.7.2). With a sale in progress, each row's action holds the current cart and
 * resumes that one in a single step (swap).
 */
export function HeldSalesDialog({ onClose, onResumed }: HeldSalesDialogProps) {
  const heldSales = useShopStore((state) => state.heldSales)
  const products = useShopStore((state) => state.products)
  const cart = useShopStore((state) => state.cart)
  const resumeHeldSale = useShopStore((state) => state.resumeHeldSale)
  const swapWithHeldSale = useShopStore((state) => state.swapWithHeldSale)
  const discardHeldSale = useShopStore((state) => state.discardHeldSale)

  const [confirming, setConfirming] = useState<Confirming>(null)
  const [swapLabel, setSwapLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const rows = useMemo(
    () => buildHeldSaleRows(heldSales, products, new Date()),
    [heldSales, products],
  )
  const cartItemCount = cart.reduce((count, line) => count + line.quantity, 0)
  const hasSaleInProgress = cart.length > 0

  function startConfirm(next: Confirming) {
    setConfirming(next)
    setSwapLabel('')
    setError(null)
  }

  function handleResume(row: HeldSaleRow) {
    const result = resumeHeldSale(row.id)

    if (!result.ok) {
      setError(result.message)

      return
    }

    // Price changes were read before resuming, while the held prices still existed.
    onResumed(buildResumeNotice(result.adjustments, row.priceChanges))
  }

  function handleSwap(row: HeldSaleRow) {
    if (heldLabelError(swapLabel)) {
      return
    }

    const result = swapWithHeldSale(row.id, { label: swapLabel })

    if (!result.ok) {
      setError(result.message)

      return
    }

    onResumed(buildResumeNotice(result.adjustments, row.priceChanges))
  }

  function handleDiscard(row: HeldSaleRow) {
    const result = discardHeldSale(row.id)

    if (!result.ok) {
      setError(result.message)

      return
    }

    setConfirming(null)
    setError(null)
  }

  return (
    <Dialog title="Held Sales" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="error">{error}</Alert> : null}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="max-w-sm text-sm text-muted">
              No held sales. Use Hold Sale on the New Sale screen to set a sale aside.
            </p>
            <Button icon={Plus} variant="primary" to={ROUTES.newSale}>
              New Sale
            </Button>
          </div>
        ) : (
          <>
            {hasSaleInProgress ? (
              <Alert tone="info">
                You have a sale in progress ({formatItemCount(cartItemCount)}). Resuming a held sale
                holds the current one first.
              </Alert>
            ) : null}

            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <HeldSaleItem
                  key={row.id}
                  row={row}
                  hasSaleInProgress={hasSaleInProgress}
                  confirming={confirming?.id === row.id ? confirming.kind : null}
                  swapLabel={swapLabel}
                  onSwapLabelChange={setSwapLabel}
                  onResume={() =>
                    hasSaleInProgress
                      ? startConfirm({ kind: 'swap', id: row.id })
                      : handleResume(row)
                  }
                  onConfirmSwap={() => handleSwap(row)}
                  onDiscard={() => startConfirm({ kind: 'discard', id: row.id })}
                  onConfirmDiscard={() => handleDiscard(row)}
                  onCancelConfirm={() => startConfirm(null)}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </Dialog>
  )
}

type HeldSaleItemProps = {
  row: HeldSaleRow
  hasSaleInProgress: boolean
  confirming: 'discard' | 'swap' | null
  swapLabel: string
  onSwapLabelChange: (label: string) => void
  onResume: () => void
  onConfirmSwap: () => void
  onDiscard: () => void
  onConfirmDiscard: () => void
  onCancelConfirm: () => void
}

function HeldSaleItem({
  row,
  hasSaleInProgress,
  confirming,
  swapLabel,
  onSwapLabelChange,
  onResume,
  onConfirmSwap,
  onDiscard,
  onConfirmDiscard,
  onCancelConfirm,
}: HeldSaleItemProps) {
  // Focus follows the confirm step, so a keyboard user lands on it: the safe
  // "Keep" for a discard, the label field for a swap.
  const keepRef = useRef<HTMLButtonElement>(null)
  const swapLabelRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (confirming === 'discard') {
      keepRef.current?.focus()
    } else if (confirming === 'swap') {
      swapLabelRef.current?.focus()
    }
  }, [confirming])

  const name = `${row.title}, held ${row.heldAtText}`
  const changes = [...row.stockChanges, ...row.priceChanges]
  const swapLabelError = heldLabelError(swapLabel)

  function handleSwapSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onConfirmSwap()
  }

  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-navy-900">
            <Tag className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 [overflow-wrap:anywhere]">{row.title}</span>
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            Held {row.heldAtText}
            {row.fromDay ? (
              <StatusPill tone="warning" className="ml-2">
                {row.fromDay}
              </StatusPill>
            ) : null}
          </p>
        </div>

        <p className="shrink-0 text-right text-sm text-navy-900">
          About{' '}
          <span className="font-semibold tabular-nums">{formatCurrency(row.estimatedTotal)}</span>
        </p>
      </div>

      <p className="mt-2 text-sm text-navy-800 [overflow-wrap:anywhere]">{row.itemsText}</p>

      {row.stockChanges.length > 0 || row.priceChanges.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {row.stockChanges.length > 0 ? (
            <StatusPill tone="warning" icon={AlertTriangle}>
              Stock changed
            </StatusPill>
          ) : null}
          {row.priceChanges.length > 0 ? <StatusPill tone="info">Prices changed</StatusPill> : null}
        </div>
      ) : null}

      {changes.length > 0 ? (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-semibold text-navy-700">
            What changed since it was held
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-navy-800">
            {changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {!row.canResume ? (
        <p className="mt-2 text-sm font-semibold text-rose-700">{NOTHING_SELLABLE_TEXT}</p>
      ) : null}

      {confirming === 'discard' ? (
        <div className="mt-3 flex flex-col gap-3 rounded-lg bg-rose-50 p-3">
          <p className="text-sm text-rose-900">
            Discard this held sale? Its {formatItemCount(row.itemCount)} will be removed from the
            list. Stock is not affected.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button ref={keepRef} onClick={onCancelConfirm} className="flex-1">
              Keep
            </Button>
            <Button
              icon={Trash2}
              onClick={onConfirmDiscard}
              className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-100"
            >
              Discard
            </Button>
          </div>
        </div>
      ) : confirming === 'swap' ? (
        <form
          onSubmit={handleSwapSubmit}
          noValidate
          className="mt-3 flex flex-col gap-3 rounded-lg bg-slate-50 p-3"
        >
          <p className="text-sm text-navy-900">
            The sale in progress will be held, then this one resumed.
          </p>
          <FormField
            label="Label for the sale in progress"
            optional
            error={swapLabelError ?? undefined}
            hint={`${labelCounter(swapLabel)} characters`}
          >
            {(field) => (
              <TextInput
                {...field}
                ref={swapLabelRef}
                value={swapLabel}
                onChange={(event) => onSwapLabelChange(event.target.value)}
                placeholder="Customer name or note, optional"
                autoComplete="off"
              />
            )}
          </FormField>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onCancelConfirm} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={PlayCircle}
              disabled={swapLabelError !== null}
              className="flex-1"
            >
              Hold current and resume
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            icon={PlayCircle}
            onClick={onResume}
            disabled={!row.canResume}
            aria-label={`${hasSaleInProgress ? 'Hold current and resume' : 'Resume'} ${name}`}
            className="flex-1"
          >
            {hasSaleInProgress ? 'Hold current and resume' : 'Resume'}
          </Button>
          <Button
            icon={Trash2}
            onClick={onDiscard}
            aria-label={`Discard ${name}`}
            className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 sm:flex-none"
          >
            Discard
          </Button>
        </div>
      )}
    </li>
  )
}
