import { Loader2, type LucideIcon } from 'lucide-react'
import { forwardRef, type ForwardedRef, type MouseEventHandler, type ReactNode } from 'react'
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

export type ButtonProps = {
  children: ReactNode
  /** Renders a router link instead of a button element. */
  to?: string
  icon?: LucideIcon
  variant?: ButtonVariant
  /** Defaults to "button", so a button inside a form never submits by accident. */
  type?: 'button' | 'submit'
  onClick?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  /** Work in flight: the button is disabled, announced busy, and shows a spinner. */
  pending?: boolean
  expanded?: boolean
  /** Needed when the visible content does not name the action (icon only, or ambiguous). */
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-controls'?: string
  className?: string
}

/**
 * The ref points at the rendered element: an HTMLButtonElement normally, or
 * the HTMLAnchorElement when `to` is set.
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(
    {
      children,
      to,
      icon: Icon,
      variant = 'secondary',
      type = 'button',
      onClick,
      disabled,
      pending = false,
      expanded,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-controls': ariaControls,
      className,
    }: ButtonProps,
    ref,
  ) {
    const classes = cn(BASE_STYLES, VARIANT_STYLES[variant], className)
    const LeadingIcon = pending ? Loader2 : Icon
    const content = (
      <>
        {LeadingIcon ? (
          <LeadingIcon className={cn('h-5 w-5 shrink-0', pending && 'animate-spin')} aria-hidden />
        ) : null}
        {children}
      </>
    )

    if (to) {
      return (
        <Link
          ref={ref as ForwardedRef<HTMLAnchorElement>}
          to={to}
          className={classes}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
        >
          {content}
        </Link>
      )
    }

    return (
      <button
        ref={ref as ForwardedRef<HTMLButtonElement>}
        type={type}
        onClick={onClick}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        aria-expanded={expanded}
        aria-controls={ariaControls}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        className={classes}
      >
        {content}
      </button>
    )
  },
)
