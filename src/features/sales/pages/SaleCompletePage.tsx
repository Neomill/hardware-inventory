import { CheckCircle2, Package, Printer, ShoppingCart } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/app/routes'
import { breakDownVat } from '@/domain/money'
import { PAYMENT_LABELS } from '@/domain/sale'
import { describeSettlement } from '@/features/sales/lib/salesMetrics'
import { useShopStore } from '@/stores/useShopStore'
import { formatCurrency, formatDateLabel, formatNumber, formatTime } from '@/lib/format'

export function SaleCompletePage() {
  const { saleId } = useParams()
  const location = useLocation()
  const sale = useShopStore((state) => state.sales.find((candidate) => candidate.id === saleId))
  const settings = useShopStore((state) => state.settings)

  const justCompleted = (location.state as { completed?: boolean } | null)?.completed === true

  if (!sale) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <Package className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-navy-900">Sale not found</h2>
        <p className="max-w-md text-sm text-muted">
          This sale is not saved on this device. It may have been removed by a demo data reset.
        </p>
        <Button to={ROUTES.sales}>Back to Sales</Button>
      </div>
    )
  }

  const occurredAt = new Date(sale.occurredAt)
  const vat = breakDownVat(sale.total, sale.taxRate)
  const settlement = describeSettlement(sale)

  return (
    <div className="flex flex-col gap-5">
      {justCompleted ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-emerald-200 bg-emerald-50 px-6 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden />
          <h2 className="text-2xl font-bold text-emerald-700">Sale Completed</h2>
          <p className="text-sm text-emerald-900">
            Stock has been updated and the sale is saved to history.
          </p>
        </div>
      ) : null}

      <section className="card grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCell label="Total Sale" value={formatCurrency(sale.total)} emphasis />
        <SummaryCell label="Sale Type" value={PAYMENT_LABELS[sale.paymentMethod]} />
        <SummaryCell label="Customer" value={sale.customerName} />
        <SummaryCell label="Sale No." value={sale.saleNumber} />
      </section>

      {/* The receipt is the only thing that prints; see the print rules in index.css. */}
      <section className="receipt card px-5 py-6 tabular-nums sm:px-8">
        <header className="border-b border-dashed border-slate-300 pb-4 text-center">
          <h2 className="text-xl font-bold uppercase tracking-wide text-navy-900">
            {settings.storeName}
          </h2>
          {settings.address ? <p className="text-sm text-muted">{settings.address}</p> : null}
          {settings.phone ? <p className="text-sm text-muted">{settings.phone}</p> : null}
          <p className="mt-1 text-sm text-muted">
            {formatDateLabel(occurredAt)} &middot; {formatTime(occurredAt)}
          </p>
          <p className="text-sm text-muted">
            Sale No. {sale.saleNumber} &middot; Served by {sale.recordedBy}
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th scope="col" className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Item
                </th>
                <th scope="col" className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Qty
                </th>
                <th scope="col" className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Unit Price
                </th>
                <th scope="col" className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {sale.lines.map((line) => (
                <tr key={line.productId} className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 text-navy-900">
                    <span className="block font-medium">{line.productName}</span>
                    <span className="block text-xs text-muted">{line.sku}</span>
                  </td>
                  <td className="py-2.5 text-right text-navy-900">
                    {formatNumber(line.quantity)} {line.unit}
                  </td>
                  <td className="py-2.5 text-right text-navy-900">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-navy-900">
                    {formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <Row label={`Subtotal (${sale.lines.length} lines)`} value={formatCurrency(sale.subtotal)} />
          <Row label="Discount" value={formatCurrency(sale.discountAmount)} />

          <div className="flex items-baseline justify-between border-t border-slate-300 pt-2">
            <dt className="text-base font-bold uppercase text-navy-900">Total</dt>
            <dd className="text-xl font-bold text-navy-900">{formatCurrency(sale.total)}</dd>
          </div>

          <Row
            label={`Includes VAT (${Math.round(sale.taxRate * 100)}%)`}
            value={formatCurrency(vat.vat)}
            muted
          />

          <div className="mt-2 space-y-1.5 border-t border-dashed border-slate-300 pt-2">
            <Row label={`Paid by ${PAYMENT_LABELS[sale.paymentMethod]}`} value={formatCurrency(sale.amountPaid)} />
            {sale.paymentMethod === 'cash' ? (
              <Row label="Change" value={formatCurrency(sale.changeGiven)} />
            ) : (
              <Row label="Balance on ledger" value={formatCurrency(sale.balanceDue)} />
            )}
            <Row label="Status" value={settlement.label} muted />
          </div>
        </dl>

        <p className="mt-6 border-t border-dashed border-slate-300 pt-4 text-center text-xs text-muted">
          Thank you. Please keep this receipt for any return or warranty claim.
        </p>
      </section>

      <Alert tone="info">
        Stock was reduced for {sale.lines.length} product
        {sale.lines.length === 1 ? '' : 's'} and this sale is recorded in today&apos;s history
        {sale.balanceDue > 0 ? ', with the unpaid balance on the customer ledger' : ''}.
      </Alert>

      {/* Equal weight: printing a receipt is as normal as starting the next sale. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="primary" icon={ShoppingCart} to={ROUTES.newSale} className="h-14 text-base">
          Start New Sale
        </Button>
        <Button icon={Printer} onClick={() => window.print()} className="h-14 text-base">
          Print Receipt
        </Button>
      </div>

      <Link
        to={ROUTES.sales}
        className="self-center text-sm font-semibold text-navy-700 hover:text-navy-900"
      >
        Back to Sales
      </Link>
    </div>
  )
}

function SummaryCell({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="card-title">{label}</p>
      <p
        className={
          emphasis
            ? 'mt-1 truncate text-2xl font-bold text-emerald-600'
            : 'mt-1 truncate text-lg font-semibold text-navy-900'
        }
      >
        {value}
      </p>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? 'text-muted' : 'text-navy-800'}>{label}</dt>
      <dd className={muted ? 'text-muted' : 'font-semibold text-navy-900'}>{value}</dd>
    </div>
  )
}
