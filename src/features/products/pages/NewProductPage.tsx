import { PackagePlus } from 'lucide-react'

import { ModulePlaceholder } from '@/components/common/ModulePlaceholder'

export function NewProductPage() {
  return (
    <ModulePlaceholder
      icon={PackagePlus}
      title="Add Product"
      description="Creating a product needs rules the documents do not settle yet, such as SKU format and opening stock. Specified before it is built."
    />
  )
}
