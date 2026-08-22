import { BarChart3 } from 'lucide-react'

import { ModulePlaceholder } from '@/components/common/ModulePlaceholder'

export function ReportsPage() {
  return (
    <ModulePlaceholder
      icon={BarChart3}
      title="Reports"
      description="Daily sales, top selling products, payment breakdown and outstanding credit. Built after the sales and ledger modules, so every figure comes from recorded transactions."
    />
  )
}
