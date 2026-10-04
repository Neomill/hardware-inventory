import { Phone, UserRound, Wallet } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { IconTile } from '@/components/common/IconTile'
import { StatusPill } from '@/components/common/StatusPill'
import type { Centavos } from '@/domain/money'
import type { Customer } from '@/domain/types'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

type CustomerHeaderCardProps = {
  customer: Customer
  outstanding: Centavos
  totalCharged: Centavos
  totalPaid: Centavos
  onRecordPayment: () => void
}

/** Who the customer is, what they owe, and the one primary action: take a payment. */
export function CustomerHeaderCard({
  customer,
  outstanding,
  totalCharged,
  totalPaid,
  onRecordPayment,
}: CustomerHeaderCardProps) {
  const owes = outstanding > 0

  return (
    <section className="card grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-4">
        <IconTile icon={UserRound} tone="blue" shape="circle" />
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold text-navy-900">{customer.name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-navy-700">
            <Phone className="h-4 w-4 text-muted" aria-hidden />
            {customer.phone ? (
              <a
                href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}
                className="tabular-nums hover:underline"
              >
                {customer.phone}
              </a>
            ) : (
              <span className="text-muted">No phone on file</span>
            )}
          </p>
          <p className="mt-1 text-xs text-muted">
            Charged {formatCurrency(totalCharged)} &middot; Paid {formatCurrency(totalPaid)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
        <div
          className={cn(
            'rounded-xl px-5 py-3 sm:text-right',
            owes ? 'bg-brand-50 text-brand-700' : 'bg-emerald-50 text-emerald-700',
          )}
        >
          <p className="text-sm font-semibold">Outstanding balance</p>
          <p className="text-3xl font-bold tabular-nums">{formatCurrency(outstanding)}</p>
          {owes ? null : (
            <StatusPill tone="success" className="mt-1">
              Fully settled
            </StatusPill>
          )}
        </div>

        <Button
          icon={Wallet}
          variant="primary"
          onClick={onRecordPayment}
          disabled={!owes}
          className="h-14 px-6 text-base"
        >
          Record Payment
        </Button>
      </div>
    </section>
  )
}
