import { FINAL_CTA } from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";

import { Band, CtaLink, Eyebrow } from "./primitives";

// Final CTA (dark band, centered) — the closing push into the free start, on the
// same charcoal anchor that carries the footer below it.
export function FinalCta() {
  return (
    <Band tone="dark" id={FINAL_CTA.id} innerClassName="py-section-lg">
      <Reveal className="mx-auto max-w-3xl text-center">
        <div className="flex justify-center">
          <Eyebrow>{FINAL_CTA.eyebrow}</Eyebrow>
        </div>
        <h2 className="font-display text-display-lg">{FINAL_CTA.title}</h2>
        <p className="mkt-lede mx-auto mt-6 max-w-[52ch] text-body-lg">
          {FINAL_CTA.lede}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          {FINAL_CTA.ctas.map((cta) => (
            <CtaLink key={cta.label} cta={cta} />
          ))}
        </div>
      </Reveal>
    </Band>
  );
}
