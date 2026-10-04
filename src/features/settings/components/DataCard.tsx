import { useMemo, useState } from 'react'
import { Download, HardDrive, RotateCcw } from 'lucide-react'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { ResetDataDialog } from '@/features/settings/components/ResetDataDialog'
import {
  buildDataExport,
  downloadJson,
  estimateSavedBytes,
  exportFileName,
} from '@/features/settings/lib/exportData'
import { formatNumber } from '@/lib/format'
import { isDeviceStorageAvailable } from '@/stores/shopPersistence'
import { useShopStore } from '@/stores/useShopStore'

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${formatNumber(Math.round(bytes / 1024))} KB`
}

/** Where the data lives, what is in it, and the export / reset controls. */
export function DataCard() {
  const products = useShopStore((state) => state.products)
  const customers = useShopStore((state) => state.customers)
  const sales = useShopStore((state) => state.sales)
  const movements = useShopStore((state) => state.movements)
  const payments = useShopStore((state) => state.payments)
  const cart = useShopStore((state) => state.cart)
  const heldSales = useShopStore((state) => state.heldSales)
  const taxRate = useShopStore((state) => state.taxRate)
  const settings = useShopStore((state) => state.settings)
  const resetToSeedData = useShopStore((state) => state.resetToSeedData)

  // Checked once: availability does not change while the page is open.
  const [deviceStorage] = useState(() => isDeviceStorageAvailable())
  const [confirming, setConfirming] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const savedBytes = useMemo(
    () =>
      estimateSavedBytes({
        products,
        customers,
        sales,
        movements,
        payments,
        cart,
        heldSales,
        taxRate,
        settings,
      }),
    [products, customers, sales, movements, payments, cart, heldSales, taxRate, settings],
  )

  const counts = [
    { label: 'Products', value: products.length },
    { label: 'Customers', value: customers.length },
    { label: 'Sales', value: sales.length },
    { label: 'Stock movements', value: movements.length },
    { label: 'Customer payments', value: payments.length },
    { label: 'Held sales', value: heldSales.length },
  ]

  function handleExport() {
    const now = new Date()

    downloadJson(exportFileName(now), buildDataExport(useShopStore.getState(), now))
  }

  function handleReset() {
    resetToSeedData()
    setConfirming(false)
    setNotice('Demo data restored. Everything recorded on this device was replaced.')
  }

  return (
    <section className="card flex flex-col gap-4 p-5">
      <header>
        <h2 className="text-base font-semibold text-navy-900">Data</h2>
        <p className="mt-1 text-sm text-muted">
          There is no server: all records live in this browser.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
        <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-navy-700" aria-hidden />
        <p className="text-sm text-navy-900">
          {deviceStorage
            ? `Saved on this device automatically (${formatBytes(savedBytes)}). Clearing this browser's site data, or opening the app on another device or browser, starts again from the demo data.`
            : 'This browser is not allowing data to be saved (for example, in private browsing). Records are kept only until the page is closed or refreshed.'}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {counts.map((count) => (
          <div key={count.label} className="rounded-xl border border-slate-200 px-4 py-3">
            <dt className="text-xs text-muted">{count.label}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-navy-900">
              {formatNumber(count.value)}
            </dd>
          </div>
        ))}
      </dl>

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        <Button icon={Download} onClick={handleExport}>
          Export data (JSON)
        </Button>
        <Button
          icon={RotateCcw}
          onClick={() => {
            setNotice(null)
            setConfirming(true)
          }}
          className="text-rose-700 hover:bg-rose-50"
        >
          Reset demo data
        </Button>
      </div>

      {confirming ? (
        <ResetDataDialog
          onCancel={() => setConfirming(false)}
          onConfirm={handleReset}
          onExport={handleExport}
          saleCount={sales.length}
          hasSaleInProgress={cart.length > 0 || heldSales.length > 0}
        />
      ) : null}
    </section>
  )
}
