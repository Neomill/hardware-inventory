import { useState } from 'react'

import type { SupplierInvoice } from '@/domain/types'
import { InvoiceConfirmation } from '@/features/inventory/components/InvoiceConfirmation'
import { InvoiceForm } from '@/features/inventory/components/InvoiceForm'
import { stockAfterInvoice } from '@/features/inventory/lib/invoiceForm'
import { useShopStore } from '@/stores/useShopStore'

type Received = {
  invoice: SupplierInvoice
  stockAfter: Map<string, number>
}

type ReceiveStockViewProps = {
  /** Preselected from a row action or a link: "?product=CEM-001" becomes the first line. */
  initialProductId: string
}

/** Receive Stock is the supplier invoice form (spec 04, D10), then its confirmation. */
export function ReceiveStockView({ initialProductId }: ReceiveStockViewProps) {
  const [received, setReceived] = useState<Received | null>(null)
  // "Receive another delivery" mounts a fresh form with no lines.
  const [formKey, setFormKey] = useState(0)

  function handleReceived(invoice: SupplierInvoice) {
    // Read after the save, so the figures are the stock the store now holds.
    setReceived({
      invoice,
      stockAfter: stockAfterInvoice(invoice, useShopStore.getState().products),
    })
  }

  if (received) {
    return (
      <InvoiceConfirmation
        invoice={received.invoice}
        stockAfter={received.stockAfter}
        onReceiveAnother={() => {
          setReceived(null)
          setFormKey((key) => key + 1)
        }}
      />
    )
  }

  return (
    <InvoiceForm
      key={formKey}
      initialProductId={formKey === 0 ? initialProductId : ''}
      onReceived={handleReceived}
    />
  )
}
