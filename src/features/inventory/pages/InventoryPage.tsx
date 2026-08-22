import { Boxes } from 'lucide-react'

import { ModulePlaceholder } from '@/components/common/ModulePlaceholder'

export function InventoryPage() {
  return (
    <ModulePlaceholder
      icon={Boxes}
      title="Inventory"
      description="Current inventory, stock receiving and inventory transactions are implemented in a later milestone."
    />
  )
}
