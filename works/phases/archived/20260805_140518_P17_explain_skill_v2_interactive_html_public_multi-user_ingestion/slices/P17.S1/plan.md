# Plan — P17.S1: Explain skill v2 rewrite (canonical copy)

Operator-approved at the plan gate (2026-07-21). Read `../../phase.md` first — its
*Findings & Notes* and *Constraints* are the shared context this plan builds on (gist
target format, P16 pipeline facts, hard pins). `../../intent.md` is the confirmed
operator intent.

## Job

Rewrite the **canonical** explain skill — `plugin/skills/explain/SKILL.md` — so
`/knowledge:explain` **always** emits a single self-contained interactive HTML explainer
(gist-modeled) for **both** modes (topic; code-change/diff/phase), including the
default-on, citation-backed **"Best practices & next steps"** web-research section, and
POSTs it with `format:"html"`. Bump the plugin version. Touch nothing else.

**Files in scope (only these):**

- `plugin/skills/explain/SKILL.md` — the rewrite.
- `plugin/.claude-plugin/plugin.json` — version `0.2.1` → `0.3.0`; description updated to
  name interactive HTML explainers (quiz + cited best-practices research).
- `.claude-plugin/marketplace.json` (repo root) — sync the plugin entry description to
  the same text.
- `plugin/README.md` — update the `/knowledge:explain` blurb to describe the v2 output
  (interactive HTML explainer with quiz; cited best-practices section; still API-first
  with file fallback).
- `plugin/skills/setup/SKILL.md` — **version strings only** (stale `0.2.1` at ~L157,
  `0.1.0` at ~L170 and ~L180 → `0.3.0`, or reword to a non-stale placeholder where prose
  allows). Real setup-flow work is S3's — do not touch anything else in that file.

**Out of scope:** the other three skill copies (S2), the setup flow (S3),
`plugin/templates/` (S4 — `plugin_parity.py` stays red, known), all server/web/mcp code,
doc versioning (append Doc-impact lines to `phase.md` instead).

## Operator-ratified design decisions (implement these; refine wording, not substance)

1. **Document flow:** Background → Intuition → Code → **Best practices & next steps** →
   Quiz, one long page with a ToC at top (no tab nav). When the judgment gate skips the
   research section it is simply absent (ToC adjusts); the document carries no "skipped"
   note — the chat report (§8) explains why instead.
2. **Argument surface:** trailing standalone words, same pattern as the existing `here`:
   `research` forces the section ON, `no-research` forces it OFF; both stripped from the
   topic before use. `here` (project copy) keeps working and composes with them.
3. **Mode detection (§1):** change mode when the arguments reference a diff / branch /
   PR / commit range / phase / "what we just changed", or when no-args follows a
   just-completed change in the conversation; topic mode otherwise. **Both modes use the
   same four section names** — only the lens differs (change mode: Background = the
   system before + context; Intuition = why the change, toy-data examples; Code =
   walkthrough of the changes grouped logically. Topic mode: Code = how it works here,
   walking the real code).
4. **Research step (§3):** change mode reads the actual diff (`git diff` / `git log` /
   `git show`) plus the changed files; every claim grounded in real files, as today. The
   web-research step (for the best-practices section) runs by default through the
   judgment gate: **skip** for purely-internal subjects (repo-private glue, personal
   conventions) and trivial fixes; **degrade gracefully offline** — if WebSearch/WebFetch
   are unavailable or the first couple of attempts error/time out, skip the section and
   move on. Never hang, never retry-loop, never fail the save because research failed
   (bootstrap P8 runs this skill unattended at phase reviews).
5. **Best-practices section content:** where the implementation aligns with prevailing
   practice, where it deliberately diverges (and why that can be legitimate), and 2–4
   concrete suggested next steps. **Every claim carries a source link to a page actually
   opened during research — no citation, no claim.** Citation anchors must keep the
   source visible in plain text (e.g. link text plus the bare domain in parentheses):
   search/MCP consume only the *extracted text*, and `href` attributes are not text, so
   a bare "source" link would lose provenance in the searchable/agent surface.
6. **HTML spec (§4 replaces the markdown house style entirely):**
   - Single self-contained page: **inline CSS + inline vanilla JS, zero external
     requests** — no CDN, no webfonts (system font stack), no images fetched from the
     network (inline SVG/CSS diagrams are the norm), no `fetch`/XHR anywhere. This is a
     hard constraint: the P16 viewer renders the doc in an opaque-origin
     `sandbox="allow-scripts"` iframe where any external request is blocked/broken.
   - Starts exactly at `<!DOCTYPE html>`; proper `<title>` matching the document title;
     `<meta name="viewport">`; responsive/mobile styling; readable width, comfortable
     typography, callout boxes for key concepts/definitions/edge cases; `<pre>` blocks
     with `white-space: pre-wrap` (or `pre` + horizontal scroll in a container).
   - **All diagrams as HTML/CSS (or inline SVG), never ASCII art**; use concrete toy
     data in examples and figures.
   - **Quiz:** 5 medium-difficulty MCQs testing substantive understanding; immediate
     feedback on click (correct/incorrect + a one-line "why"); plain buttons/divs with
     JS click handlers — **no `<form>`** (sandbox has no `allow-forms`), **no
     `target="_blank"`** (no `allow-popups`; plain `<a href>` is fine), keyboard-friendly
     where easy.
   - Tone: Kleppmann-clear, essay flow with smooth transitions, jargon defined on first
     use; audience novice-programmer by default. No hard length cap — as long as the
     teaching requires (typical explainers run a few hundred lines of HTML).
   - Put a compact skeleton + a short quiz markup/JS example **in the SKILL.md** as the
     spec (precise structural contract + one worked quiz item), not a full literal
     template — the authoring model generates the rest per document.
7. **Save (§5):** body file becomes `<tmp>/body.html` holding the raw document from
   `<!DOCTYPE html>` (never any frontmatter — the API writes the `<!--kb -->`
   comment-frontmatter itself); `meta.json` gains `"format": "html"`; the merge command
   stays the same shape (`m["markdown"]=open(body).read()` — the raw HTML rides the
   existing `markdown` field per the P16 contract); same two curl forms, same
   201/409/422/401 branches and wording.
8. **Fallback (§6, API unreachable + `KB_LOCAL_FALLBACK=yes`):** write
   `docs/<project>/<date>-<slug>.html` with **exactly the comment-frontmatter the API
   writes** — copy the precise syntax from the write path in `server/documents.py`
   (leading `<!--kb` block carrying the same title/date/tags/source fields, then a blank
   line, then the raw HTML) so a later reindex ingests it identically to an API write.
   Landing creation (still a `.md` landing), Recent-bullet insertion (linking the
   `.html` rel_path), and the two git commands stay as they are.
9. **Project copy (§7):** `here` writes `<TOPIC>_EXPLAINED.html` (raw HTML, no
   frontmatter). **Report (§8):** unchanged in shape; add the research-section outcome
   (included / skipped-by-judgment / skipped-offline, one line of why).
10. **Frontmatter of the skill itself:** update `description` (interactive HTML
    explainer, quiz, cited best-practices — still "your own personal knowledge base");
    `argument-hint: <topic or change-ref> [here] [research|no-research]`;
    `allowed-tools`: keep `Read, Grep, Glob, Write, Bash(curl -sS --max-time 5:*),
    Bash(python3 -c:*)` and add `WebSearch`, `WebFetch`, `Bash(git diff:*)`,
    `Bash(git log:*)`, `Bash(git show:*)`. The §2 config resolver stays **byte-identical**.

## Validation (terse — no test-file sprawl)

1. Author `sample-explainer.html` **in this slice folder** — a miniature but complete
   spec-conformant explainer (real toy topic, all five sections incl. a genuinely cited
   best-practices section, 5-question working quiz). It is the conformance evidence and
   a reusable fixture for S5's hosted E2E.
2. Grep-prove self-containment on the sample: no external `src=` / `<link` href /
   `@import` / `url(http`; no `fetch(` / `XMLHttpRequest`; no `<form`; no
   `target="_blank"`; first line `<!DOCTYPE html>`.
3. Run the §2 resolver snippet once (it must behave byte-identically) and
   `python3 -c 'import json; json.load(open("plugin/.claude-plugin/plugin.json"))'`-style
   sanity on the two JSON files. If the `claude` CLI is available, `claude plugin
   validate .` and `claude plugin validate ./plugin`; if not, note it and move on.
4. Do NOT run `plugin_parity.py` as a gate (red until S4, known); do not boot services.

## Wrap-up

Write `result.md` (free-form: what changed, decisions finalized, sample location,
validation outcomes). Append to `phase.md`: cross-slice notes for S2 (what the copies
must now derive from — e.g. which sections are Claude-specific vs portable) and the
concrete **Doc impact** lines (product/experience: always-HTML interactive explainer +
cited research section; decisions: flow/force-args/mode-detection calls). Never commit;
never transition status.
