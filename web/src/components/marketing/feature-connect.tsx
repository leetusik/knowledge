import { CONNECT_TERMINAL, FEATURE_CONNECT } from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";

import { Band, CtaLink, Eyebrow, RichText, Ticks } from "./primitives";
import { TerminalBlock } from "./terminal";

// Feature · Connect your agent (dark band, flipped: terminal left / copy right).
// The day-to-day CLI loop as the visual; agent-first / --json / two-token /
// bundled guide as the ticks.
export function FeatureConnect() {
  return (
    <Band tone="dark" id={FEATURE_CONNECT.id} className="overflow-hidden">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1">
          <TerminalBlock terminal={CONNECT_TERMINAL} />
        </Reveal>

        <Reveal className="order-1 lg:order-2">
          <Eyebrow>{FEATURE_CONNECT.eyebrow}</Eyebrow>
          <h2 className="font-display text-heading-2">
            {FEATURE_CONNECT.title}
          </h2>
          <p className="mkt-lede mt-5 text-body-lg">
            <RichText text={FEATURE_CONNECT.lede} />
          </p>
          <div className="mt-7">
            <Ticks items={FEATURE_CONNECT.ticks} />
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            {FEATURE_CONNECT.ctas.map((cta) => (
              <CtaLink key={cta.label} cta={cta} size="default" />
            ))}
          </div>
        </Reveal>
      </div>
    </Band>
  );
}
