import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'navy' | 'ghost'

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  secondary: 'border border-slate-200 bg-white text-navy-900 hover:bg-slate-50',
  navy: 'bg-navy-800 text-white hover:bg-navy-700',
  ghost: 'text-navy-700 hover:bg-navy-50',
}

/** h-12 keeps every control a comfortable tap target on a tablet. */
const BASE_STYLES =
  'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

type ButtonProps = {
  children: ReactNode
  /** Renders a router link instead of a button element. */
  to?: string
  icon?: LucideIcon
  variant?: ButtonVariant
  onClick?: () => void
  disabled?: boolean
  expanded?: boolean
  className?: string
}

export function Button({
  children,
  to,
  icon: Icon,
  variant = 'secondary',
  onClick,
  disabled,
  expanded,
  className,
}: ButtonProps) {
  const classes = cn(BASE_STYLES, VARIANT_STYLES[variant], className)
  const content = (
    <>
      {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden /> : null}
      {children}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      className={classes}
    >
      {content}
    </button>
  )
}
