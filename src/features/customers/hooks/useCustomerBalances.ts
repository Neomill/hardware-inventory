import { useMemo } from 'react'

import { listCustomerBalances, type CustomerBalance } from '@/domain/ledger'
import { summarizeBalances, type LedgerSummary } from '@/features/customers/lib/ledgerView'
import { useShopStore } from '@/stores/useShopStore'

export type CustomerBalances = {
  /** Every customer, largest balance first. */
  rows: CustomerBalance[]
  summary: LedgerSummary
}

/** Live balances: a credit sale or payment anywhere shows up here at once. */
export function useCustomerBalances(): CustomerBalances {
  const customers = useShopStore((state) => state.customers)
  const sales = useShopStore((state) => state.sales)
  const payments = useShopStore((state) => state.payments)

  return useMemo(() => {
    const rows = listCustomerBalances(customers, sales, payments, { includeSettled: true })

    return { rows, summary: summarizeBalances(rows) }
  }, [customers, sales, payments])
}
