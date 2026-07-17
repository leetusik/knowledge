import { VALUE } from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";

import { Band, Chip, Eyebrow, RichText } from "./primitives";

// What it is — three ways in (paper band). A mono-indexed triad: web reading
// room (free) · terminal/CLI (free) · agent API (coming).
export function ValueTriad() {
  return (
    <Band tone="paper" id={VALUE.id} hairline>
      <Reveal className="mkt-section-head max-w-2xl">
        <Eyebrow>{VALUE.eyebrow}</Eyebrow>
        <h2 className="font-display text-heading-1">{VALUE.title}</h2>
        <p className="mkt-lede mt-5 text-body-lg">{VALUE.lede}</p>
      </Reveal>

      <Reveal className="mt-12 grid gap-5 md:grid-cols-3">
        {VALUE.cards.map((card) => (
          <div
            key={card.index}
            className="flex flex-col rounded-[var(--radius-lg)] border border-hairline bg-surface p-7 transition hover:-translate-y-0.5 hover:border-green hover:shadow-[var(--kb-shadow-card)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-body-sm text-green">
                {card.index}
              </span>
              <Chip label={card.chip.label} coming={card.chip.coming} />
            </div>
            <p className="mkt-hint mt-5 font-mono text-micro uppercase tracking-wide">
              {card.kicker}
            </p>
            <p className="mkt-body mt-3 flex-1 text-body-md leading-relaxed">
              <RichText text={card.body} />
            </p>
            <a
              href={card.cta.href}
              className="mt-6 inline-flex text-body-md-medium font-semibold text-green hover:text-green-deep"
              {...(card.cta.href.startsWith("http")
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
            >
              {card.cta.label}
            </a>
          </div>
        ))}
      </Reveal>
    </Band>
  );
}
