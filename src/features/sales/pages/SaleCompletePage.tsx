import { CheckCircle2, Package, Printer, ShoppingCart } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { Alert } from '@/components/common/Alert'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/app/routes'
import { useEffect, useMemo, useRef, useState } from 'react'

import { remainingBySale } from '@/domain/ledger'
import { breakDownVat } from '@/domain/money'
import { PAYMENT_LABELS } from '@/domain/sale'
import { describeCounterMoney } from '@/domain/saleCancellation'
import { CancelSaleSection } from '@/features/sales/components/CancelSaleSection'
import { CancelledSaleBanner } from '@/features/sales/components/CancelledSaleBanner'
import { SALE_CANCELLED_NOTICE, describeCancelledSale } from '@/features/sales/lib/cancelSale'
import { readJustCompleted, receiptPaymentRows, saleRecordNote } from '@/features/sales/lib/receipt'
import { describeSettlement, formatItemCount } from '@/features/sales/lib/salesMetrics'
import { useShopStore } from '@/stores/useShopStore'
import {
  formatCurrency,
  formatDateLabel,
  formatNumber,
  formatTaxRatePercent,
  formatTime,
} from '@/lib/format'

export function SaleCompletePage() {
  const { saleId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const sale = useShopStore((state) => state.sales.find((candidate) => candidate.id === saleId))
  const settings = useShopStore((state) => state.settings)
  const sales = useShopStore((state) => state.sales)
  const payments = useShopStore((state) => state.payments)
  const remaining = useMemo(() => remainingBySale(sales, payments), [sales, payments])

  const [cancelNotice, setCancelNotice] = useState<string | null>(null)
  const cancelledHeadingRef = useRef<HTMLHeadingElement>(null)

  // After cancelling, the Cancel Sale button is gone: move focus to the new state.
  useEffect(() => {
    if (cancelNotice) {
      cancelledHeadingRef.current?.focus()
    }
  }, [cancelNotice])

  // "Sale Completed" only when arriving from checkout. Read once, then cleared
  // from history so a reload or Back to this entry shows the neutral receipt.
  const [justCompleted] = useState(() => readJustCompleted(location.state))

  useEffect(() => {
    if (location.state !== null && location.state !== undefined) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

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
  // Status as it stands now, after any later customer payments (same as the Ledger).
  const settlement = describeSettlement(sale, remaining.get(sale.id) ?? 0)
  const itemCount = sale.lines.reduce((count, line) => count + line.quantity, 0)
  // Null while the sale stands (spec 04 sale cancellation s.7.1).
  const cancelled = describeCancelledSale(sale)
  const counterMoney = cancelled ? describeCounterMoney(sale, formatCurrency) : null

  return (
    <div className="flex flex-col gap-5">
      {cancelNotice ? <Alert tone="success">{cancelNotice}</Alert> : null}

      {cancelled ? <CancelledSaleBanner ref={cancelledHeadingRef} summary={cancelled} /> : null}

      {counterMoney ? <Alert tone="info">{counterMoney}</Alert> : null}

      {justCompleted && !cancelled ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-emerald-200 bg-emerald-50 px-6 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden />
          <h2 className="text-2xl font-bold text-emerald-700">Sale Completed</h2>
          <p className="text-base text-emerald-900">
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
          {cancelled ? (
            <p className="mb-2 text-lg font-bold uppercase tracking-widest text-rose-700">
              Cancelled
            </p>
          ) : null}
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
          {sale.customerId !== null ? (
            <p className="mt-1 text-sm font-semibold text-navy-900">
              Customer: {sale.customerName}
            </p>
          ) : null}
        </header>

        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th scope="col" className="pb-2 text-sm font-semibold text-navy-800 print:text-xs">
                  Item
                </th>
                <th
                  scope="col"
                  className="pb-2 text-right text-sm font-semibold text-navy-800 print:text-xs"
                >
                  Qty
                </th>
                <th
                  scope="col"
                  className="pb-2 text-right text-sm font-semibold text-navy-800 print:text-xs"
                >
                  Unit Price
                </th>
                <th
                  scope="col"
                  className="pb-2 text-right text-sm font-semibold text-navy-800 print:text-xs"
                >
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {sale.lines.map((line) => (
                <tr key={line.productId} className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 text-navy-900">
                    <span className="block font-medium">{line.productName}</span>
                    <span className="block text-sm text-muted print:text-xs">{line.sku}</span>
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

        <dl className="ml-auto mt-4 w-full max-w-sm space-y-1.5 text-sm">
          <Row
            label={`Subtotal (${formatItemCount(itemCount)})`}
            value={formatCurrency(sale.subtotal)}
          />
          <Row label="Discount" value={formatCurrency(sale.discountAmount)} />

          <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-slate-300 pt-2">
            <dt className="text-base font-bold uppercase text-navy-900">Total</dt>
            <dd className="text-xl font-bold text-navy-900">{formatCurrency(sale.total)}</dd>
          </div>

          <Row
            label={`Includes VAT (${formatTaxRatePercent(sale.taxRate)})`}
            value={formatCurrency(vat.vat)}
            muted
          />

          <div className="mt-2 space-y-1.5 border-t border-dashed border-slate-300 pt-2">
            {receiptPaymentRows(sale).map((row) => (
              <Row
                key={row.label}
                label={row.label}
                value={'amount' in row ? formatCurrency(row.amount) : row.text}
              />
            ))}
            {/* Later payments are separate records; the frozen balance above stays as it was. */}
            {sale.paymentMethod !== 'cash' &&
            !cancelled &&
            settlement.remaining !== sale.balanceDue ? (
              <Row label="Balance now" value={formatCurrency(settlement.remaining)} />
            ) : null}
            <Row label="Status now" value={settlement.label} muted />
          </div>
        </dl>

        <p className="mt-6 border-t border-dashed border-slate-300 pt-4 text-center text-sm text-muted print:text-xs">
          Thank you. Please keep this receipt for any return or warranty claim.
        </p>
      </section>

      {cancelled ? (
        <Alert tone="info">
          {cancelled.stockReturned ? `${cancelled.stockReturned} ` : ''}This sale stays in the sales
          history but no longer counts in sales, reports or Customer Credit.
        </Alert>
      ) : (
        <Alert tone="info">{saleRecordNote(sale, justCompleted)}</Alert>
      )}

      {/* Equal weight: printing a receipt is as normal as starting the next sale. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="primary"
          icon={ShoppingCart}
          to={ROUTES.newSale}
          className="h-14 text-base"
        >
          Start New Sale
        </Button>
        <Button icon={Printer} onClick={() => window.print()} className="h-14 text-base">
          Print Receipt
        </Button>
      </div>

      {cancelled ? null : (
        <CancelSaleSection sale={sale} onCancelled={() => setCancelNotice(SALE_CANCELLED_NOTICE)} />
      )}

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
            ? 'mt-1 text-2xl font-bold text-emerald-600 [overflow-wrap:anywhere]'
            : 'mt-1 text-lg font-semibold text-navy-900 [overflow-wrap:anywhere]'
        }
      >
        {value}
      </p>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className={muted ? 'text-muted' : 'text-navy-800'}>{label}</dt>
      <dd className={muted ? 'ml-auto text-muted' : 'ml-auto font-semibold text-navy-900'}>
        {value}
      </dd>
    </div>
  )
}
