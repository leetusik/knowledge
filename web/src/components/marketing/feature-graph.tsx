import { FEATURE_GRAPH, GRAPH_MOTIF, type MotifInk } from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";

import { Band, Eyebrow, Ticks } from "./primitives";
import { GraphMotif } from "./graph-motif";

const INK_VAR: Record<MotifInk, string> = {
  teal: "var(--mkt-ink-teal)",
  bronze: "var(--mkt-ink-bronze)",
  plum: "var(--mkt-ink-plum)",
};

// Feature · The knowledge graph (paper band, recessed --kb-surface-sunken plate).
// Copy left, the graph motif right: a faithful static render (GraphMotif) with
// the floating info panel + bottom-left legend as JSX overlays.
export function FeatureGraph() {
  const { panel, legend } = GRAPH_MOTIF;
  return (
    <Band tone="paper" id={FEATURE_GRAPH.id} hairline>
      <div className="grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <Eyebrow>{FEATURE_GRAPH.eyebrow}</Eyebrow>
          <h2 className="font-display text-heading-2">{FEATURE_GRAPH.title}</h2>
          <div className="mt-7">
            <Ticks items={FEATURE_GRAPH.ticks} />
          </div>
        </Reveal>

        <Reveal>
          <div className="mkt-graph-plate h-[380px] sm:h-[440px]">
            <GraphMotif />

            {/* Floating info panel */}
            <div className="mkt-graph-panel">
              <p className="flex items-center gap-2 font-mono text-body-sm text-ink">
                <span
                  className="mkt-graph-chip"
                  style={{ background: INK_VAR.teal }}
                  aria-hidden
                />
                {panel.project}
              </p>
              <p className="mt-2 font-display text-body-md-medium font-semibold leading-snug text-ink">
                {panel.title}
              </p>
              <p className="mkt-hint mt-1.5 font-mono text-body-sm">
                {panel.meta}
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {panel.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-[color:var(--kb-tag-bg)] px-2 py-0.5 font-mono text-[11px] text-[color:var(--kb-tag-fg)]"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-body-sm font-semibold text-green">
                {panel.read}
              </p>
            </div>

            {/* Bottom-left legend (a lens, not a filter) */}
            <div className="mkt-graph-legend hidden text-body-sm sm:block">
              <p className="mkt-hint font-mono text-[11px] uppercase tracking-wide">
                {legend.heading}
              </p>
              <ul className="mt-2 space-y-1.5">
                {legend.projects.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-center gap-2 text-body-sm text-ink"
                  >
                    <span
                      className="mkt-graph-chip"
                      style={{ background: INK_VAR[p.ink] }}
                      aria-hidden
                    />
                    <span className="flex-1">{p.name}</span>
                    <span className="mkt-hint font-mono">{p.count}</span>
                  </li>
                ))}
              </ul>
              <div className="my-2 h-px bg-[color:var(--mkt-border)]" />
              <div className="flex items-center gap-2 text-body-sm text-ink">
                <span className="mkt-graph-ring" aria-hidden />
                <span className="flex-1">{legend.tagsRow}</span>
                <span className="mkt-graph-switch" aria-hidden />
              </div>
              <p className="mkt-hint mt-2 text-[11px]">{legend.note}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </Band>
  );
}
