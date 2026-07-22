import {
  AGENT_QUICKSTART,
  ZSHENV_COMMENT,
  ZSHENV_COPY,
  ZSHENV_EXPORT_BASE,
  ZSHENV_TOKEN_VALUE,
  HEALTH_CHECK_CURL,
} from "@/content/marketing";
import { Reveal } from "@/components/ui/reveal";

import { Band, Eyebrow, RichText, Ticks } from "./primitives";
import { SnippetBlock } from "./snippet-block";

// Agent quickstart (build-prompt §(a)) — the env-var REST path, the recommended agent
// setup. It CONTINUES the Connect dark band as one "built for agents" territory: same
// scheme-independent `--kb-band-dark`, divided from Connect by a single `--kb-border-
// on-dark` hairline (Band `hairline` re-points to the on-dark tier in this scope). Copy
// + ticks left; the setup column (top → bottom, 14px gaps) right: the ~/.zshenv exports
// → the `.env` trap note → the one-line health check with its 200/401 legend.
export function AgentQuickstart() {
  return (
    <Band
      tone="dark"
      id={AGENT_QUICKSTART.id}
      hairline
      className="overflow-hidden"
    >
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <Eyebrow>{AGENT_QUICKSTART.eyebrow}</Eyebrow>
          <h2 className="font-display text-heading-2">
            {AGENT_QUICKSTART.title}
          </h2>
          <p className="mkt-lede mt-5 text-body-lg">{AGENT_QUICKSTART.lede}</p>
          <div className="mt-7">
            <Ticks items={AGENT_QUICKSTART.ticks} />
          </div>
          <div className="mt-9">
            {/* Link-variant CTA — text link, not a pill (`text-green` steps to the
                on-dark teal in this dark scope). Auth-gated dashboard panel is fine. */}
            <a
              href={AGENT_QUICKSTART.cta.href}
              className="inline-flex items-center text-body-md-medium font-semibold text-green hover:text-green-deep"
            >
              {AGENT_QUICKSTART.cta.label}
            </a>
          </div>
        </Reveal>

        <Reveal className="flex flex-col gap-3.5">
          {/* 1 · ~/.zshenv exports — display floats the comment onto its own hint line
              above the exports; the copy pill writes the byte-exact two locked lines. */}
          <SnippetBlock label={AGENT_QUICKSTART.zshenvLabel} copyText={ZSHENV_COPY}>
            <span className="mkt-snip__cmt">{ZSHENV_COMMENT}</span>
            {"\n"}
            <span className="mkt-snip__kw">export</span>
            {ZSHENV_EXPORT_BASE.slice("export".length)}
            {"\n"}
            <span className="mkt-snip__kw">export</span>
            {' KB_API_TOKEN='}
            <span className="mkt-snip__val">{ZSHENV_TOKEN_VALUE}</span>
          </SnippetBlock>

          {/* 2 · The .env trap — dashed hairline, bronze mono kicker. */}
          <div className="mkt-trap">
            <span className="mkt-trap__kicker">{AGENT_QUICKSTART.trapKicker}</span>
            <p className="mkt-trap__body">
              <RichText text={AGENT_QUICKSTART.trap} />
            </p>
          </div>

          {/* 3 · One-line health check + 200/401 legend (codes in teal-strong). */}
          <SnippetBlock
            label={AGENT_QUICKSTART.healthLabel}
            copyText={HEALTH_CHECK_CURL}
            legend={
              <>
                <span>
                  <span className="mkt-snip__ok">
                    {AGENT_QUICKSTART.health.ok}
                  </span>{" "}
                  {AGENT_QUICKSTART.health.okLabel}
                </span>
                <span aria-hidden>·</span>
                <span>
                  <span className="mkt-snip__ok">
                    {AGENT_QUICKSTART.health.err}
                  </span>{" "}
                  {AGENT_QUICKSTART.health.errLabel}
                </span>
              </>
            }
          >
            {HEALTH_CHECK_CURL}
          </SnippetBlock>
        </Reveal>
      </div>
    </Band>
  );
}
