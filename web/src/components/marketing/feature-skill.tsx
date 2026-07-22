import fs from "node:fs";
import path from "node:path";

import { FEATURE_SKILL, LINKS } from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Band, Eyebrow, Ticks } from "./primitives";
import { CopyButton } from "./copy-button";
import { SkillPane } from "./skill-pane";

// The explain skill, published (build-prompt §(b)) — a sunken band (library tier, not
// the terminal tier). Copy left 1fr / document pane right 1.15fr. The two actions —
// Download SKILL.md (CVA primary) and Copy the skill (the copy control at section
// scale) — ALWAYS take the FULL served file; the pane below shows only the head.
//
// The pane body is the REAL head of the served file, read from disk at BUILD time (a
// server-component fs read of the published `web/public/SKILL.md` — never a pasted
// copy), so it cannot fork from the byte-parity-gated artifact.

type SkillLine =
  | { kind: "fence" | "heading" | "prose"; text: string }
  | { kind: "yaml"; key: string; rest: string };

// Classify each line for the pane's syntax inks (build-prompt §(b)): `---` fences +
// prose in hint/secondary, YAML frontmatter keys in teal, markdown headings in ink-700.
function inkSkill(text: string): SkillLine[] {
  let fm = 0; // 0 = before frontmatter · 1 = inside · 2 = after
  return text.split("\n").map((line): SkillLine => {
    if (line === "---") {
      fm = fm === 0 ? 1 : 2;
      return { kind: "fence", text: line };
    }
    if (fm === 1) {
      const m = /^([A-Za-z][\w-]*):(.*)$/.exec(line);
      if (m) return { kind: "yaml", key: m[1], rest: m[2] };
      return { kind: "prose", text: line };
    }
    if (/^#{1,6}\s/.test(line)) return { kind: "heading", text: line };
    return { kind: "prose", text: line };
  });
}

export function FeatureSkill() {
  const skillText = fs.readFileSync(
    path.join(process.cwd(), "public", "SKILL.md"),
    "utf8",
  );
  const lines = inkSkill(skillText);
  const { pane } = FEATURE_SKILL;

  return (
    <Band tone="sunken" id={FEATURE_SKILL.id}>
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.15fr]">
        <Reveal>
          <Eyebrow>{FEATURE_SKILL.eyebrow}</Eyebrow>
          <h2 className="font-display text-heading-2">{FEATURE_SKILL.title}</h2>
          <p className="mkt-lede mt-5 text-body-lg">{FEATURE_SKILL.lede}</p>
          <div className="mt-7">
            <Ticks items={FEATURE_SKILL.ticks} />
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <a
              href={LINKS.skillFile}
              download
              className={cn(buttonVariants({ variant: "primary", size: "default" }))}
            >
              {FEATURE_SKILL.downloadLabel}
            </a>
            <CopyButton
              fetchUrl={LINKS.skillFile}
              idleLabel={FEATURE_SKILL.copyLabel}
              scale="section"
            />
          </div>
        </Reveal>

        <Reveal>
          <SkillPane
            name={pane.name}
            meta={pane.meta}
            cmd={pane.cmd}
            footLead={pane.footLead}
            expand={pane.expand}
            collapse={pane.collapse}
            parity={pane.parity}
          >
            <pre className="mkt-skill__code">
              {lines.map((l, i) => {
                const nl = i < lines.length - 1 ? "\n" : "";
                if (l.kind === "yaml") {
                  return (
                    <span key={i}>
                      <span className="mkt-skill__key">{l.key}:</span>
                      <span className="mkt-skill__val">{l.rest}</span>
                      {nl}
                    </span>
                  );
                }
                const cls =
                  l.kind === "fence"
                    ? "mkt-skill__fence"
                    : l.kind === "heading"
                      ? "mkt-skill__heading"
                      : undefined;
                return (
                  <span key={i} className={cls}>
                    {l.text}
                    {nl}
                  </span>
                );
              })}
            </pre>
          </SkillPane>
        </Reveal>
      </div>
    </Band>
  );
}
