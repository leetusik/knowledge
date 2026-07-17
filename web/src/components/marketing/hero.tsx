import { HERO, HERO_TERMINAL } from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";

import { Band, CtaLink, Eyebrow } from "./primitives";
import { TerminalBlock } from "./terminal";

// Hero (dark band). Copy left, the onboarding terminal right, one faint teal
// radial glow behind it — no other decoration. Extra top padding clears the
// fixed header.
export function Hero() {
  return (
    <Band
      tone="dark"
      id={HERO.id}
      className="overflow-hidden"
      innerClassName="pt-[128px] pb-section-lg md:pt-[164px]"
    >
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal>
          <Eyebrow>{HERO.eyebrow}</Eyebrow>
          <h1 className="font-display text-hero-display max-w-[15ch]">
            {HERO.headline}
          </h1>
          <p className="mkt-lede mt-6 max-w-[46ch] text-body-lg">{HERO.lede}</p>
          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            {HERO.ctas.map((cta) => (
              <CtaLink key={cta.label} cta={cta} />
            ))}
          </div>
          <p className="mkt-hint mt-6 text-body-sm">{HERO.free}</p>
        </Reveal>

        <Reveal className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-0"
            style={{
              background:
                "radial-gradient(60% 55% at 60% 40%, var(--kb-accent-on-dark-soft), transparent 70%)",
            }}
          />
          <div className="relative">
            <TerminalBlock terminal={HERO_TERMINAL} />
          </div>
        </Reveal>
      </div>
    </Band>
  );
}
