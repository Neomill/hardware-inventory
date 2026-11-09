import { useParams } from 'react-router-dom'

import { CustomerDetailPage } from '@/features/customers/pages/CustomerDetailPage'
import { CustomerListPage } from '@/features/customers/pages/CustomerListPage'

/**
 * Both /customers and /customers/:customerId render this page; the id decides
 * between the Customers Who Owe list and one customer's credit history.
 */
export function CustomerLedgerPage() {
  const { customerId } = useParams()

  // Keyed so moving between customers starts with fresh dialog and notice state.
  return customerId ? (
    <CustomerDetailPage key={customerId} customerId={customerId} />
  ) : (
    <CustomerListPage />
  )
}
