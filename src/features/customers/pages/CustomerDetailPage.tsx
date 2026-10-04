import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, UserX } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/app/routes'
import type { CustomerPayment } from '@/domain/types'
import { CustomerHeaderCard } from '@/features/customers/components/CustomerHeaderCard'
import { LedgerStatementCard } from '@/features/customers/components/LedgerStatementCard'
import { OpenChargesCard } from '@/features/customers/components/OpenChargesCard'
import { PaymentHistoryCard } from '@/features/customers/components/PaymentHistoryCard'
import { RecordPaymentDialog } from '@/features/customers/components/RecordPaymentDialog'
import { useCustomerLedger } from '@/features/customers/hooks/useCustomerLedger'
import { describePaymentRecorded } from '@/features/customers/lib/notices'
import type { CustomerDetailLocationState } from '@/features/customers/types'
import { useCurrentTime } from '@/hooks/useCurrentTime'

type CustomerDetailPageProps = {
  customerId: string
}

export function CustomerDetailPage({ customerId }: CustomerDetailPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const now = useCurrentTime(60_000)
  const ledger = useCustomerLedger(customerId)

  const [paying, setPaying] = useState(false)
  const passedNotice = (location.state as CustomerDetailLocationState | null)?.notice
  // Read once: the router state outlives this visit (Back, Forward, refresh).
  const [notice, setNotice] = useState<string | null>(() => passedNotice ?? null)

  // Shown once, then dropped from the history entry so it does not come back.
  useEffect(() => {
    if (passedNotice) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [passedNotice, location.pathname, navigate])

  const closePayment = useCallback(() => setPaying(false), [])

  function handlePaymentRecorded(payment: CustomerPayment, remaining: number) {
    setPaying(false)
    setNotice(describePaymentRecorded(payment, remaining))
  }

  if (!ledger) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <UserX className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-navy-900">Customer not found</h2>
        <p className="max-w-md text-sm text-muted">
          There is no customer with this ID on this device. They may have been added on another
          device, or the store data on this one was reset.
        </p>
        <Button to={ROUTES.customers}>Back to Customer Ledger</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button icon={ArrowLeft} variant="ghost" to={ROUTES.customers} className="-ml-2">
          All customers
        </Button>
      </div>

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <CustomerHeaderCard
        customer={ledger.customer}
        outstanding={ledger.outstanding}
        totalCharged={ledger.totalCharged}
        totalPaid={ledger.totalPaid}
        onRecordPayment={() => {
          setNotice(null)
          setPaying(true)
        }}
      />

      <OpenChargesCard charges={ledger.openCharges} now={now} />

      <LedgerStatementCard entries={ledger.statement} />

      <PaymentHistoryCard payments={ledger.paymentHistory} />

      {paying ? (
        <RecordPaymentDialog
          customerId={customerId}
          onClose={closePayment}
          onRecorded={handlePaymentRecorded}
        />
      ) : null}
    </div>
  )
}
