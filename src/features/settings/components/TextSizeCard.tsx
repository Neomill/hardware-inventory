import { useId } from 'react'
import { Check } from 'lucide-react'

import { useTextSize } from '@/hooks/useTextSize'
import { TEXT_SIZE_OPTIONS } from '@/lib/textSize'
import { cn } from '@/lib/utils'

/** Size of the "Aa" sample at the browser default, so each choice previews its own size. */
const SAMPLE_BASE_PX = 22

/**
 * Text size for this device. A change applies at once and is remembered on
 * this tablet or laptop only; it is not store data.
 */
export function TextSizeCard() {
  const [size, setSize] = useTextSize()
  const headingId = useId()
  const name = useId()

  return (
    <section className="card flex flex-col gap-4 p-5" aria-labelledby={headingId}>
      <header>
        <h2 id={headingId} className="text-lg font-semibold text-navy-900">
          Text size
        </h2>
        <p className="mt-1 text-base text-muted">
          Makes all text and buttons bigger or smaller. Each tablet or laptop keeps its own size.
        </p>
      </header>

      <div role="radiogroup" aria-labelledby={headingId} className="grid gap-3 sm:grid-cols-3">
        {TEXT_SIZE_OPTIONS.map((option) => {
          const selected = option.value === size

          return (
            <label
              key={option.value}
              className={cn(
                'relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-3 text-center transition-colors',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2',
                selected
                  ? 'border-navy-800 bg-navy-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => setSize(option.value)}
                className="sr-only"
              />
              {selected ? (
                <Check className="absolute right-2 top-2 h-5 w-5 text-navy-800" aria-hidden />
              ) : null}
              <span
                aria-hidden
                className="font-bold leading-none text-navy-900"
                style={{ fontSize: `${(SAMPLE_BASE_PX * option.rootPercent) / 100}px` }}
              >
                Aa
              </span>
              <span className="text-base font-semibold text-navy-900">{option.label}</span>
            </label>
          )
        })}
      </div>
    </section>
  )
}
