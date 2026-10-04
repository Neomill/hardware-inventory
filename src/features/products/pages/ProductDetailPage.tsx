import { Package } from 'lucide-react'

import { ModulePlaceholder } from '@/components/common/ModulePlaceholder'

export function ProductDetailPage() {
  return (
    <ModulePlaceholder
      icon={Package}
      title="Product Details"
      description="Stock history, price changes and supplier information for a single product. Not designed yet, so it is specified before it is built."
    />
  )
}
