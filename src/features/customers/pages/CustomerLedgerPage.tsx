import { Users } from 'lucide-react'

import { ModulePlaceholder } from '@/components/common/ModulePlaceholder'

export function CustomerLedgerPage() {
  return (
    <ModulePlaceholder
      icon={Users}
      title="Customer Ledger"
      description="Customer balances, payment history and payment recording are implemented in a later milestone."
    />
  )
}
