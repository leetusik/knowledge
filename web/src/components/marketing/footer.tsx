import { BRAND } from "@/content";
import { FOOTER } from "@/content/marketing";

import { Container } from "./primitives";

// Footer (deep band, --kb-band-dark-deep) — the editorial page-closer: wordmark +
// bilingual tagline, three nav columns, and the bilingual meta line.
export function MarketingFooter() {
  return (
    <footer className="mkt-band--deep">
      <Container className="py-section">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <span className="flex items-center gap-2.5 font-display text-[21px] font-semibold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.logo} alt="" width={24} height={24} aria-hidden />
              {FOOTER.wordmark}
            </span>
            <p className="mkt-body mt-4 text-body-sm">{FOOTER.tagline}</p>
          </div>

          {FOOTER.columns.map((col) => (
            <div key={col.heading}>
              <h5 className="mkt-hint font-mono text-[11px] uppercase tracking-[0.1em]">
                {col.heading}
              </h5>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => {
                  const external = link.href.startsWith("http");
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="mkt-nav-link text-body-md"
                        {...(external
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="mkt-hint mkt-hairline-top mt-10 pt-6 font-mono text-body-sm tracking-wide">
          {FOOTER.meta}
        </p>
      </Container>
    </footer>
  );
}
