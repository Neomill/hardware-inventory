import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { ROUTES } from '@/app/routes'
import type { Customer, CustomerPayment } from '@/domain/types'
import { AddCustomerDialog } from '@/features/customers/components/AddCustomerDialog'
import { CustomerBalanceTable } from '@/features/customers/components/CustomerBalanceTable'
import { CustomerListToolbar } from '@/features/customers/components/CustomerListToolbar'
import { LedgerSummaryStrip } from '@/features/customers/components/LedgerSummaryStrip'
import { RecordPaymentDialog } from '@/features/customers/components/RecordPaymentDialog'
import { useCustomerBalances } from '@/features/customers/hooks/useCustomerBalances'
import { filterBalances } from '@/features/customers/lib/ledgerView'
import { describePaymentRecorded } from '@/features/customers/lib/notices'
import type { CustomerDetailLocationState } from '@/features/customers/types'
import { useCurrentTime } from '@/hooks/useCurrentTime'
import { formatNumber } from '@/lib/format'

/** Outstanding Balances: who owes the store, largest balance first. */
export function CustomerListPage() {
  const navigate = useNavigate()
  const now = useCurrentTime(60_000)
  const { rows, summary } = useCustomerBalances()

  const [search, setSearch] = useState('')
  const [includeSettled, setIncludeSettled] = useState(false)
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [payingCustomerId, setPayingCustomerId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const visibleRows = useMemo(
    () => filterBalances(includeSettled ? rows : rows.filter((row) => row.outstanding > 0), search),
    [rows, includeSettled, search],
  )

  const closeAddCustomer = useCallback(() => setAddingCustomer(false), [])
  const closePayment = useCallback(() => setPayingCustomerId(null), [])

  function handleCustomerAdded(customer: Customer) {
    setAddingCustomer(false)

    // A new customer owes nothing, so the default list would hide them.
    const state: CustomerDetailLocationState = {
      notice: `${customer.name} was added. Credit sales for them will appear here.`,
    }
    navigate(ROUTES.customerDetail(customer.id), { state })
  }

  function handlePaymentRecorded(payment: CustomerPayment, remaining: number) {
    setPayingCustomerId(null)
    setNotice(describePaymentRecorded(payment, remaining))
  }

  const emptyMessage = search.trim()
    ? 'No customers match your search.'
    : includeSettled
      ? 'No customers yet. Add one to start a ledger.'
      : 'No outstanding balances. Every customer is settled.'

  return (
    <div className="flex flex-col gap-5">
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <LedgerSummaryStrip summary={summary} now={now} />

      <section className="card flex flex-col gap-4 p-5">
        <CustomerListToolbar
          search={search}
          onSearchChange={setSearch}
          includeSettled={includeSettled}
          onIncludeSettledChange={setIncludeSettled}
          onAddCustomer={() => setAddingCustomer(true)}
        />

        <div className="flex items-center justify-between gap-3">
          <h2 className="card-title">
            {includeSettled ? 'All Customers' : 'Outstanding Balances'}
          </h2>
          <p className="text-sm text-muted">
            {formatNumber(visibleRows.length)} customer{visibleRows.length === 1 ? '' : 's'}
          </p>
        </div>

        <CustomerBalanceTable
          rows={visibleRows}
          now={now}
          emptyMessage={emptyMessage}
          onRecordPayment={(customerId) => {
            setNotice(null)
            setPayingCustomerId(customerId)
          }}
        />
      </section>

      {addingCustomer ? (
        <AddCustomerDialog onClose={closeAddCustomer} onAdded={handleCustomerAdded} />
      ) : null}

      {payingCustomerId ? (
        <RecordPaymentDialog
          customerId={payingCustomerId}
          onClose={closePayment}
          onRecorded={handlePaymentRecorded}
        />
      ) : null}
    </div>
  )
}
