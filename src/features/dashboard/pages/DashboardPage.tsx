import { LayoutDashboard } from 'lucide-react'

import { ModulePlaceholder } from '@/components/common/ModulePlaceholder'

export function DashboardPage() {
  return (
    <ModulePlaceholder
      icon={LayoutDashboard}
      title="Dashboard"
      description="Project setup is complete. KPIs, quick actions, recent sales, low stock, inventory activity and notes are built in the next milestone."
    />
  )
}
