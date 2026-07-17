import { FEATURE_SAVE } from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";

import { Band, Eyebrow, Ticks } from "./primitives";

// Feature · Save & hybrid search (paper band, copy left / visual right). The
// visual is a search field + a results dropdown with teal-soft <mark> highlights
// and real, EN/KR titles.
export function FeatureSave() {
  const { search } = FEATURE_SAVE;
  return (
    <Band tone="paper" id={FEATURE_SAVE.id} hairline>
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <Eyebrow>{FEATURE_SAVE.eyebrow}</Eyebrow>
          <h2 className="font-display text-heading-2">{FEATURE_SAVE.title}</h2>
          <div className="mt-7">
            <Ticks items={FEATURE_SAVE.ticks} />
          </div>
        </Reveal>

        <Reveal>
          <div className="rounded-[var(--radius-xl)] border border-hairline bg-surface p-4 shadow-[var(--kb-shadow-card)]">
            {/* Search field */}
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-hairline-strong bg-canvas px-4 py-3">
              <svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                className="shrink-0 text-muted"
                aria-hidden
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m20 20-3.2-3.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span className="flex-1 text-body-md text-ink">
                {search.query}
              </span>
              <kbd className="rounded-[6px] border border-hairline-strong bg-surface px-2 py-0.5 font-mono text-body-sm text-muted">
                {search.keyHint}
              </kbd>
            </div>

            {/* Results dropdown */}
            <ul className="mt-2 divide-y divide-hairline">
              {search.results.map((r) => (
                <li key={r.title} className="px-2 py-3">
                  <p className="text-body-md-medium font-semibold text-ink">
                    {r.title}
                  </p>
                  <p className="mkt-hint mt-1 font-mono text-body-sm">
                    {r.meta}
                  </p>
                  <p className="mkt-body mt-1.5 text-body-sm">
                    {r.parts.map((part, i) =>
                      part.mark ? (
                        <mark key={i} className="mkt-mark">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={i}>{part.text}</span>
                      ),
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Band>
  );
}
