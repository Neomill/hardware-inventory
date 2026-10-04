import { useMemo } from 'react'

import {
  buildLedgerStatement,
  computeOutstanding,
  listOpenCharges,
  type LedgerEntry,
  type OpenCharge,
} from '@/domain/ledger'
import type { Centavos } from '@/domain/money'
import type { Customer, CustomerPayment } from '@/domain/types'
import { listPaymentHistory } from '@/features/customers/lib/ledgerView'
import { useShopStore } from '@/stores/useShopStore'

export type CustomerLedger = {
  customer: Customer
  outstanding: Centavos
  totalCharged: Centavos
  totalPaid: Centavos
  openCharges: OpenCharge[]
  /** Oldest first, with the running balance after each entry. */
  statement: LedgerEntry[]
  /** Newest first. */
  paymentHistory: CustomerPayment[]
}

/** One customer's account, or null when the id is not a known customer. */
export function useCustomerLedger(customerId: string): CustomerLedger | null {
  const customers = useShopStore((state) => state.customers)
  const sales = useShopStore((state) => state.sales)
  const payments = useShopStore((state) => state.payments)

  return useMemo(() => {
    const customer = customers.find((candidate) => candidate.id === customerId)

    if (!customer) {
      return null
    }

    const statement = buildLedgerStatement(sales, payments, customerId)
    const paymentHistory = listPaymentHistory(payments, customerId)

    return {
      customer,
      outstanding: computeOutstanding(sales, payments, customerId),
      totalCharged: statement
        .filter((entry) => entry.type === 'charge')
        .reduce((sum, entry) => sum + entry.amount, 0),
      totalPaid: paymentHistory.reduce((sum, payment) => sum + payment.amount, 0),
      openCharges: listOpenCharges(sales, payments, customerId),
      statement,
      paymentHistory,
    }
  }, [customers, sales, payments, customerId])
}
