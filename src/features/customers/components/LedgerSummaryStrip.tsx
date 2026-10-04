import { CalendarClock, HandCoins, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { IconTile, type IconTone } from '@/components/common/IconTile'
import { ROUTES } from '@/app/routes'
import { describeAge, formatLedgerDate, type LedgerSummary } from '@/features/customers/lib/ledgerView'
import { formatCurrency, formatNumber } from '@/lib/format'

type LedgerSummaryStripProps = {
  summary: LedgerSummary
  now: Date
}

type SummaryStat = {
  label: string
  value: string
  caption: ReactNode
  icon: LucideIcon
  tone: IconTone
}

/** Store-wide credit figures, grouped in one panel like the Products summary. */
export function LedgerSummaryStrip({ summary, now }: LedgerSummaryStripProps) {
  const oldest = summary.oldestOpenCharge

  const stats: SummaryStat[] = [
    {
      label: 'Outstanding Credit',
      value: formatCurrency(summary.totalOutstanding),
      caption: 'Owed to the store',
      icon: HandCoins,
      tone: 'orange',
    },
    {
      label: 'Customers With Balance',
      value: formatNumber(summary.customersWithBalance),
      caption: summary.customersWithBalance === 1 ? 'Customer owes' : 'Customers owe',
      icon: Users,
      tone: 'blue',
    },
    {
      label: 'Oldest Open Charge',
      value: oldest ? describeAge(oldest.occurredAt, now) : 'None',
      caption: oldest ? (
        <>
          {formatLedgerDate(oldest.occurredAt)} &middot;{' '}
          <Link
            to={ROUTES.customerDetail(oldest.customerId)}
            className="font-semibold text-navy-700 underline-offset-2 hover:underline"
          >
            {oldest.customerName}
          </Link>
        </>
      ) : (
        'Every account is settled'
      ),
      icon: CalendarClock,
      tone: 'amber',
    },
  ]

  return (
    <section className="card grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-4">
          <IconTile icon={stat.icon} tone={stat.tone} />
          <div className="min-w-0">
            <p className="card-title">{stat.label}</p>
            <p className="mt-0.5 truncate text-xl font-bold tabular-nums text-navy-900">
              {stat.value}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">{stat.caption}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
