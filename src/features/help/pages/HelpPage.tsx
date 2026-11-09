import { ArrowRight, Lightbulb, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/common/Button'
import { HELP_TOPICS, MISTAKE_TIPS, type HelpStep } from '@/features/help/lib/helpTopics'

/** A step's text, with each button name drawn like a small button. */
function StepText({ step }: { step: HelpStep }) {
  return (
    <>
      {step.map((part, index) =>
        typeof part === 'string' ? (
          <span key={index}>{part}</span>
        ) : (
          <strong
            key={index}
            className="inline-block whitespace-nowrap rounded-md border border-slate-300 bg-slate-50 px-1.5 font-semibold text-navy-900 print:border-black print:bg-white"
          >
            {part.tap}
          </strong>
        ),
      )}
    </>
  )
}

/**
 * "How do I…?" for the everyday jobs, with numbered steps and the button names
 * as they appear on screen. It prints as a one-page cheat sheet to keep by the
 * counter (senior UX plan, Phase 6).
 */
export function HelpPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5 print:gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="max-w-2xl text-base text-navy-900">
          Print this page to keep a copy beside the counter.
        </p>
        <Button icon={Printer} onClick={() => window.print()}>
          Print Cheat Sheet
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 print:grid-cols-2 print:gap-2 print:text-[10.5pt] print:leading-snug">
        {HELP_TOPICS.map((topic) => {
          const Icon = topic.icon

          return (
            <section
              key={topic.id}
              aria-labelledby={`help-${topic.id}`}
              className="card flex flex-col gap-3 p-5 print:break-inside-avoid print:gap-1 print:rounded-none print:border-black print:p-2 print:shadow-none"
            >
              <h2
                id={`help-${topic.id}`}
                className="flex items-center gap-2 text-lg font-bold text-navy-900 print:text-[11.5pt]"
              >
                <Icon className="h-6 w-6 shrink-0 text-brand-700 print:h-4 print:w-4" aria-hidden />
                {topic.title}
              </h2>

              <ol className="flex list-decimal flex-col gap-2 pl-6 text-base text-navy-900 marker:font-bold print:gap-0.5 print:pl-5 print:text-[10.5pt]">
                {topic.steps.map((step, index) => (
                  <li key={index} className="leading-relaxed print:leading-snug">
                    <StepText step={step} />
                  </li>
                ))}
              </ol>

              <Link
                to={topic.goTo.to}
                className="mt-auto inline-flex h-12 w-fit items-center gap-2 rounded-xl border border-slate-200 px-4 text-base font-semibold text-navy-800 transition-colors hover:bg-navy-50 print:hidden"
              >
                {topic.goTo.label}
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </section>
          )
        })}

        <section
          aria-labelledby="help-mistakes"
          className="card flex flex-col gap-3 bg-amber-50 p-5 print:break-inside-avoid print:gap-1 print:rounded-none print:border-black print:bg-white print:p-2 print:shadow-none"
        >
          <h2
            id="help-mistakes"
            className="flex items-center gap-2 text-lg font-bold text-navy-900 print:text-[11.5pt]"
          >
            <Lightbulb
              className="h-6 w-6 shrink-0 text-amber-700 print:h-4 print:w-4"
              aria-hidden
            />
            If something goes wrong
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-6 text-base text-navy-900 print:gap-0.5 print:pl-5 print:text-[10.5pt]">
            {MISTAKE_TIPS.map((tip, index) => (
              <li key={index} className="leading-relaxed print:leading-snug">
                <StepText step={tip} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
