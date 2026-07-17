import { HOW } from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

import { Band, Eyebrow } from "./primitives";

// How it works (sunken band). Save → connect → browse → retrieve: four numbered
// steps on a connecting hairline, each with its real mono token; step 4 (the
// deferred paid retrieve) is dimmed with a "Coming" note.
export function HowItWorks() {
  return (
    <Band tone="sunken" id={HOW.id}>
      <Reveal className="max-w-2xl">
        <Eyebrow>{HOW.eyebrow}</Eyebrow>
        <h2 className="font-display text-heading-1">{HOW.title}</h2>
      </Reveal>

      <Reveal>
        <ol className="mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
          {HOW.steps.map((step, i) => (
            <li key={step.n} className={cn(step.dimmed && "opacity-60")}>
              <div className="flex items-center gap-3">
                <span className="mkt-step__n">{step.n}</span>
                {i < HOW.steps.length - 1 && (
                  <span className="mkt-step__rule hidden md:block" aria-hidden />
                )}
              </div>
              <h3 className="mt-4 font-display text-heading-4">{step.title}</h3>
              <code className="mkt-code mt-2 inline-block text-green">
                {step.token}
              </code>
              {step.note && (
                <p className="mkt-hint mt-2 text-body-sm">{step.note}</p>
              )}
            </li>
          ))}
        </ol>
      </Reveal>
    </Band>
  );
}
