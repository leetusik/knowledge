import { PRICING } from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

import { Band, Chip, CtaLink, Eyebrow, Ticks } from "./primitives";

// Pricing (paper band). Honest about the free-only launch: a Free ($0/forever)
// card beside the deferred "Agent Retrieval API — Coming" waitlist tier.
export function Pricing() {
  return (
    <Band tone="paper" id={PRICING.id} hairline>
      <Reveal className="max-w-2xl">
        <Eyebrow>{PRICING.eyebrow}</Eyebrow>
        <h2 className="font-display text-heading-1">{PRICING.title}</h2>
        <p className="mkt-lede mt-5 text-body-lg">{PRICING.lede}</p>
      </Reveal>

      <Reveal className="mt-12 grid items-start gap-6 md:grid-cols-2">
        {PRICING.tiers.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "flex flex-col rounded-[var(--radius-xl)] p-8",
              tier.featured
                ? "border border-green bg-surface shadow-[var(--kb-shadow-card)]"
                : "border border-dashed border-hairline-strong bg-transparent",
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-heading-3">{tier.name}</h3>
              <Chip label={tier.chip.label} coming={tier.chip.coming} />
            </div>
            <p className="mt-4 font-display text-heading-2">{tier.price}</p>
            <p className="mkt-body mt-2 text-body-md">{tier.blurb}</p>
            <div className="mt-6 flex-1">
              <Ticks items={tier.ticks} />
            </div>
            <CtaLink
              cta={tier.cta}
              size="default"
              className="mt-8 w-full"
            />
          </div>
        ))}
      </Reveal>

      <Reveal>
        <p className="mkt-hint mx-auto mt-8 max-w-2xl text-center font-mono text-body-sm">
          {PRICING.footnote}
        </p>
      </Reveal>
    </Band>
  );
}
