import { ShoppingCart } from 'lucide-react'

import { ModulePlaceholder } from '@/components/common/ModulePlaceholder'

export function SalesPage() {
  return (
    <ModulePlaceholder
      icon={ShoppingCart}
      title="Sales (POS)"
      description="Product search, cart, checkout and sale details are implemented in a later milestone."
    />
  )
}
