# P39-hk — breakdown

`P39-hk.DECOMP` wrote this file on 2026-11-02. `intent.md` is the record; its *Scope Added at Execution* (A, B, C) wins over the earlier *Confirmed Intent* where they conflict. This file says how the work is cut and what each slice must not trip over. Line numbers below are for `plugin/skills/explain/SKILL.md` at `cac3ed32` (3,347 lines). They drift as the chain edits the file, so **each slice re-finds its passages by heading** (`grep -n '^#'`).

## Passes

- **DECOMP** (2026-11-02), style `build-after`, `Mockup: on request`: one design slice (D1, critique `critic`), one research slice (R1), five groundwork slices (S1–S5, a declared chain; R1 runs beside S1), then `DECOMP2`. **No build slice for the designed surfaces is cut now**: `DECOMP2` cuts them from D1's signed round and R1's findings.
  - D1 comes first because the operator is engaged now; its PENDING #1 is the run's only stop before the acceptance gate.
  - R1 was cut because the survey could not settle the formula approach into one (see *R1* below): no math engine exists on either side, the web re-parses chapters with a TypeScript twin of the parser, and annotations anchor on projection offsets.
  - Not an explain phase (no `## Explain`). The gate is `--require` (the explain confirmation, the term window, the glossary and the formulas are operator-visible); the orchestrator declares it after `finish-slice`.

## Estimate

**Time** comes from `dispatch-summary`'s `means`. This worktree's metered means are thin (one span: high 2.7 min/span, this DECOMP in flight). The closest analog is **P38-e1** (metered from the main checkout's transcripts, `dispatch-summary --phase P38-e1`): high 21.4 min/span, mid 4.1 min/span; implementation 8.3 span-min/slice, decomposition 22.2, review 26.0. Design has no metered analog; the only evidence is the workspace's recorded (pre-v61, not metered) rows: design 33.3 min/span (n=31), critic 67.9 min/span (n=12).

| Slice | Route | Span time |
|---|---|---|
| D1 | design + critic rows, inline | ≈ 6–9 h of span time (frame, 3–4 page passes at once, a page critic each, the join, the cross critic, the answers); ≈ 3–5 h wall clock, plus the operator's sitting |
| R1 | research | ≈ 25–45 min (throwaway probes in the scratchpad) |
| S1 | mid | ≈ 10–20 min |
| S2 | high | ≈ 30–50 min (the biggest text change: §3 and §9) |
| S3 | mid | ≈ 10–15 min |
| S4 | mid | ≈ 15–25 min (deletions, guard edit, copy) |
| S5 | high | ≈ 30–50 min (P31's package as the model) |
| DECOMP2 | high | ≈ 20–25 min |
| build (DECOMP2's, rough) | high/mid | ≈ 2–4 h: the grammar twin, the reader and print to the canvas, the skill's §4 grammar text, the release, a fidelity fix if any |
| REVIEW | high, gated | ≈ 30–120 min (a real-browser walk of the reader) |

- The phase, with this DECOMP and the main thread's planning (≈ 5 min a slice): about **12–18 h of span time**, about **7–10 h wall clock** plus the operator's two sittings (D1's canvas, the acceptance gate).
- **Spend:** no slice spends money. Every span is the workspace's own dispatch. No vendor API, no paid service, no live explain run (a metered live trial of the new explain is a deferred-job candidate for the review, as `D84-8s` was for P38-e1).

## Join-rebuilt artifact

None. Every skill slice regenerates the two skill copies and the agent bodies inside its own set, and S1–S5 run one at a time. R1, the one slice that runs beside another, writes only its own topic file.

## Build inventory

What `DECOMP2` builds, not how. The design may add to it or cut from it.

- **Native grammar (backing work, first):**
  - a glossary block, one per chapter: term id, term, optional aliases, a short definition (about 40 words), an optional longer one;
  - term links `[text](term:<id>)`, written explicitly, refused at publish when the id names no glossary term;
  - inline math and a display formula block carrying a plain-words reading and a "where" legend, validated at publish;
  - the search projection indexes the glossary text (and whatever R1 settles for formulas);
  - **it lands four places together:** `server/native/*` + `server/native_ingest.py`; their byte copies in `plugin/templates/kb/server/` (`plugin_parity.py`); the TypeScript twin `web/src/lib/native/*` (`parse.ts`, `refs.ts`, `schema.ts`, `tree.ts`, `project.ts`, `validate.ts`); and the shared fixtures `tests/fixtures/native/*` (+ their template copies), which `tests/test_native_format.py` and `web/tests/native-conformance.test.ts` both read.
- **Reader and print, built to the signed canvas:**
  - the term marker and its definition window (hover, tap, keyboard, Esc, short → longer definition, a link to the glossary section);
  - the glossary section;
  - inline formulas and the display formula block with its reading and legend;
  - each one's print form (the glossary as an appendix; `.pp-only` blocks and the quiz's paper form are the precedent), phone and desktop, light and dark;
  - the renderer is `web/src/lib/native/render.tsx` (server-only), the chapter view `web/src/components/reader/reader-article.tsx`, print `kb-print.css` + `print-*.tsx`, tokens `web/src/app/kb-tokens.css`.
- **The skill's §4 grammar text** for the glossary and formulas (ids, `term:` links, math), the outline listing the reader's terms, every definition and formula tracing to code or records, translation keeping term ids and formulas verbatim, the critic flagging jargon unlinked on first use (and a bare symbol string, which S3 adds); the three copies and the critic's agent body synced.
- **The plugin release:** `plugin.json` version **0.10.0** (no changelog file exists: the release notes live in `plugin/README.md` and the commit), `plugin/README.md`, `plugin/skills/setup/SKILL.md`'s `plugin_version`, the landing's hardcoded skill line count (`web/src/content/marketing/content.ts` L251, L261), `.claude-plugin/marketplace.json`'s description.
- **D1's one job** (critique level **`critic`**): the reading aids inside the chapter view, one connected group: the term marker and its definition window; the glossary section the window links to; the inline formula; the display formula block with its plain-words reading and "where" legend. Each in its print form, phone and desktop, light and dark, extending the reader's `kb` system (`docs/reference/design/design.json`, jobs 01–09; this is job 10). Candidate pages for the handoff (the orchestrator decides): *reading a term* (marker → window → glossary section), *formulas* (inline, display, legend, a long formula on a phone), *print* (glossary appendix, formulas on paper).

## Pins for every skill slice (S1–S4)

- **The shipped set:**
  - `plugin/skills/explain/SKILL.md` (canonical);
  - `.agents/skills/explain/SKILL.md`: the canonical body byte-equal, frontmatter without `argument-hint:` / `allowed-tools:`;
  - `web/public/SKILL.md`: a full-file copy (`cp`);
  - `plugin/agents/*.md`, regenerated by `python3 scripts/skills_parity.py --write-agents` whenever Part B changes; never hand-edited;
  - `works/phases/active/P39-hk/topics/skill-headings.md`: the heading crosswalk (below).
- **Validation, every skill slice:** `python3 scripts/skills_parity.py` → PASS; `python3 scripts/plugin_parity.py` → PASS; `uv run pytest tests/test_explain_resolver.py -q` (or `python3 -m pytest …`) → passes; `git status --porcelain .claude/` shows nothing of the slice's.
- **Headings may change in this phase** (the research sections go), unlike P38-e1. Keep a surviving section's number and heading where its job survives. Every heading a slice adds, renames, renumbers or deletes goes into `topics/skill-headings.md` (old → new, or → deleted), which S5 uses to re-cite every plugin section the workspace route names.
  - P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85) runs against the **vendored** route in `.claude/`, which this phase never edits. It is expected to regress from S1 on; record its count in `result.md` and do not chase it. The vendored route updates at the next `/update-workspace`, after the bootstrap applies S5's package.
- **No `plugin.json` version bump in S1–S4.** `plugin/README.md` says any change under `plugin/**` ships only with a bump; it rides in `DECOMP2`'s release slice, and the branch never merges without it.
- **Codebase-only binds the explain skill only.** The server, the CLI (`--subject`, `--book-kind subject`) and the reader keep subject books and subject-filed documents already published; no grammar or data change. `scripts/publish_fixture_book.py` and `tests/fixtures/book/*` stay.
- **Tests:** none new. Prose rules are not tested; the resolver test must keep passing.
- **Deferred overlap.** `D86-sd` (wording drifts after 0.9.0) triggers at this phase's start, and `D69` on the next §1 change. Where a slice rewrites a passage one of their items names, the rewrite settles it; the slice names which items in `result.md`, and the review lists the job for the orchestrator to close or drop. Never widen a slice to reach an item its rewrite does not touch.

## P39-hk.D1

- **Goal:** the operator signs, on one canvas, how the reading aids look and behave: the term marker and definition window, the glossary section, the inline formula and the display formula block (reading + "where" legend), each with its print form, phone and desktop, light and dark.
- **Shape:** `co-work`, inline on the main thread per the `design-cowork` skill; drafting on the design row, page critics and the cross critic on the critic row. One round open at a time; the canvas waits for the operator's literal sign-off. No mockup unless the operator asks.
- **Inputs for the handoff:** this file's *Build inventory*; the `kb` system (`web/src/app/kb-tokens.css`: light `default`, dark `slate`; `kb-print.css` for paper); the reader's precedents: `annotations.tsx`'s `an-pop` popover (role=dialog, Esc) and the reader's sheets (`reader-frame.tsx`), the quiz's print form; a realistic chapter (a codebase subject with real jargon and one or two formulas, e.g. a trading or caching chapter).
- **Set:** `docs/reference/design/**` (the job's canvas and round folders, `design.json`). A barrier: runs alone.
- **Risk:** `high` (kind co-work, never `low`). **Critique:** `critic`.
- **spends money:** no.
- **Depends on:** — (a barrier; undeclared).

## P39-hk.R1

- **Goal:** findings, no product code. Settle into one approach each, honoring D1's signed canvas:
  1. **The glossary grammar:** the block's form (a typed fenced block in `TYPED_BLOCKS`, `schema.py` L39), the term id namespace (shared with `#id`s or its own), `term:` in `refs.py` / `refs.ts` and its refusal code, one per chapter, its relation to the `DEFINITION` callout, its search and annotation projection.
  2. **The math grammar:** the inline delimiter (`$…$` with currency guards, e.g. `mdit_py_plugins`' dollarmath rules, or an explicit form; explain subjects carry prices), the display block (a typed block with tex / reading / where), and how inline math counts in the annotation projection (`data-an-skip` / `data-an-len`).
  3. **The engine:** KaTeX or Temml (MathML) in the server-only renderer `render.tsx`: rendering quality against the signed canvas, print, dark, fonts and the CSP (`web/src/lib/csp.ts`: `style-src` open), weight.
  4. **Validation at publish** with no Python math engine: e.g. a TeX allowlist validator twinned in Python and TypeScript, held by shared fixtures, with a test proving the renderer accepts every allowlisted command. Prefer no new Python dependency (`pyproject.toml` and `uv.lock` are template-identical files).
  5. **The term window's wiring:** one chapter-level client controller with event delegation versus per-term islands, given `paint.ts`'s static-markup assumption (no client island inside a stamped paragraph), its Esc beside `annotations.tsx`'s document-level Esc, and `TAP_IGNORE` (`chrome.ts`).
  6. **Translation:** what keeps term ids and formulas verbatim, and where a check enforces it.
- **Output:** gist lines in `## Decisions` and `## Notes for later slices` (for `DECOMP2`), long detail in `topics/glossary-and-math.md`; `## Now` says whether DECOMP2's build cut changes from the inventory above. Throwaway probes live in the scratchpad (a scratch copy for any `pnpm add`), never in `web/` or `server/`.
- **Set:** `works/phases/active/P39-hk/topics/glossary-and-math.md`. In a wave beside S1, it returns its notebook entries for the orchestrator to write.
- **Risk:** research (kind routes to the research row); trigger: open design (an architecture choice: the engine and the validation twin).
- **spends money:** no.
- **Depends on:** `P39-hk.D1` (it reads the signed canvas).

## P39-hk.S1

- **Goal (A, and C's front door):** the confirmation suggests the reader and the shape, the explain is codebase-only, and a subject no phase covers gets a research-phase offer.
- **Pins:**
  - **The reader line** is a concrete guess from the request and the operator's situation (who they are, what they know, what they are new to), never a stock "a novice" (L298, L571; also L316, L371).
  - **The sections** follow the subject: the questions this reader asks, in the order they ask them, not Background → Intuition → Code → Best practices → Quiz. The confirmation also offers **one or two other shapes**, one line each; the operator picks or edits, still one confirmation. Sources and the short "In one paragraph" box stay; the Quiz is suggested only when the subject earns it; best practices go (S3 writes next steps).
  - **Codebase-only:** general mode goes (§1 L146–164, `mode: general` L161–164, the loose document's subject slug L170–174, book kind `subject` L194–200, and the mentions the skill map lists); a non-code subject is declined plainly, writing nothing.
  - **Coverage → research-phase offer:** the phases that cover the subject are found from the records: the commits that touched the subject's files (`git log --format=%s -- <paths>`, the Commit Convention's `(P<N>)` scope) and the phases whose `intent.md` / `phase.md` name it. None covers it → the confirmation says so and offers to create a research phase first (it reads the code and records findings); the explain runs afterwards on the operator's word, never automatically. The handoff to `create-phase` for that research phase is written so S5 can mirror it.
  - **The cost line** becomes one writer plus one critic. The quick / full / no-research offer (card L65–78, flags L123–128, step 6 L294–296, L342, L360–361) and the price table (L401–411) go; `argument-hint` (L4) loses `[quick|no-research]`. The `## Explain` field set the hand-off writes changes (`run:` and general `mode:` go): S1 states the new field set in `## Decisions` for S5.
- **Set:** the shipped set.
- **Risk:** `low`, no trigger: the intent pins the confirmation's content, and the coverage lookup is pinned above.
- **spends money:** no.
- **Depends on:** none.

## P39-hk.S2

- **Goal (C):** the explain writes only from the code and the records of the phases that built the subject; no research of its own.
- **Pins:**
  - **The run card** (L40–109) and **§3** (L552–1323) are rewritten around one writer: read the covering phases' records (intent, decisions, slice results, research findings) and the code; every sentence traces to a code range or a record line. D0b's preflight, `run.md`, D1–D5 (plan, waves, merge, gap rounds, verification, the evidence gate), §3.9 and team sizing (L960–995) go. D6 (the reader's path) becomes the outline from the signed shape.
  - **v2** = the prior plus the phases since (L590–740, the delta reshaped). **Translation** stays (L741–760).
  - **No new things:** an idea the code relies on is explained only as far as the code and the records state it; nothing from outside.
  - **§4's evidence rules** (L1427–1443), **§4.6 Sources** (sources are code ranges and phase records), **§8's report** (L1980–1997) follow.
  - **§9 A book** becomes codebase books only, chapters drawn from phases (§9.2 / §9.3's research and top-up go).
  - **The critic** (§4.10 L1746–1788, **B5** L2440–2768) checks the draft against the code and the records on a second model; its `with=` list and the shared extracts it keeps are re-scoped. Researcher briefs B1–B4 stay in the file for S4 to delete (their bodies may regenerate if a shared extract changes).
  - `## 2` (the KB resolver, L427–551) stays; the resolver test must keep passing.
- **Set:** the shipped set.
- **Risk:** `high`. Trigger: **open design**: the evidence model (what the writer reads, how a sentence traces, how v2 and books draw from phases) is the phase's new abstraction, which the plan cannot pin.
- **spends money:** no.
- **Depends on:** `P39-hk.S1`.

## P39-hk.S3

- **Goal (B, and A's body):** easy reading and visuals first, in the writer's and the critic's rules.
- **Pins:**
  - **§4's prose rules** (L1382–1425): a diagram, chart or figure wherever a picture explains better than a paragraph; short paragraphs, no dense stretch; "novice-friendly by default" (L1388, L1504) goes for the signed reader.
  - **§4.2's outline** (L1473–1505) loosens to the signed, subject-shaped sections; Sources and "In one paragraph" stay; the Quiz only when signed.
  - **§4.5** (L1627–1678): best practices go; **next steps** come from the workspace (open deferred jobs, open operator questions, decisions not yet built), suggested only when something is open, each tracing to its record.
  - **The critic** (B5) flags hard reading, a missing visual and a bare symbol string in prose (pointing at the formula grammar `DECOMP2`'s skill slice adds).
- **Set:** the shipped set.
- **Risk:** `low`, no trigger: the intent pins every rule.
- **spends money:** no.
- **Depends on:** `P39-hk.S2`.

## P39-hk.S4

- **Goal (C):** retire the research machinery and make every copy and promise true.
- **Pins:**
  - Delete Part B's researcher briefs (B1 web, B2 code, B3 gap, B4 verifier) and every shared extract no remaining brief includes (B7 ladder, B10 search, B11 pages, B12 `pagetext` if unused), and their markers.
  - Delete `plugin/agents/{web-researcher,code-researcher,gap-reviewer,verifier}.md`; `explain-critic.md` stays, regenerated.
  - `scripts/skills_parity.py`: `AGENT_ROLES` → `("explain-critic",)`; drop the `pagetext` compile check if the extract goes; its docstring.
  - Frontmatter `allowed-tools` loses WebSearch, WebFetch, pdftotext and the `pagetext.py` path; the `description:` (L3) says codebase-only, from what was built, no research.
  - **Copy:** `plugin/README.md` (L6–20, *Explain: modes and flags* L43–103, *research agents* L105–116, *permissions and the search cap* L118–152, L182); `plugin/skills/setup/SKILL.md` (L170–171, L460–461; not `plugin_version`); `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` descriptions (not the version); `web/src/content/marketing/content.ts` (L251's "research the topic … cite sources"; the line count stays for the release slice); `README.md` (L12–15); the template page `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md` (L72; `template_only`).
  - `.claude/skills/explain/` (the stale vendored copy) stays: `D79-we` owns it.
- **Set:** the shipped set; the four deleted agent files; `scripts/skills_parity.py`; `plugin/README.md`; `plugin/skills/setup/SKILL.md`; `plugin/.claude-plugin/plugin.json`; `.claude-plugin/marketplace.json`; `web/src/content/marketing/content.ts`; `README.md`; `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`; `.github/workflows/plugin-ci.yml` (only if a guard's invocation changes).
- **Validation:** the skill-slice checks, plus `cd web && pnpm typecheck` (content.ts), and `grep -rn "web-researcher\|code-researcher\|gap-reviewer\|knowledge:verifier" plugin web/public .agents README.md` → none.
- **Risk:** `low`, no trigger: located deletions and copy; the guard edit is a one-tuple change.
- **spends money:** no.
- **Depends on:** `P39-hk.S3`.

## P39-hk.S5

- **Goal (C, the workspace side):** the workspace's explain route rewritten for the new flow, plus the research-phase offer, written as a **handoff package in this phase folder**, as P31 did (`works/phases/active/P31/package/` + `handoff-explain.md`).
- **Pins:**
  - `package/` mirrors the bootstrap's `payload/` (`package/<path>` → `payload/<path>`), with `package/README.md` (the files and the order) and `package/PATCHES.md` (every edit to a file the bootstrap already has, found by quoted text); `handoff-explain.md` at the phase root is the index.
  - **Files it covers:** `claude/skills/create-phase/` *The explain route* (the one confirmation, the `## Explain` field set S1 recorded, the cost line, the plugin minimum **0.10.0**, the research-phase route: how a research phase for an explain is created, cut and recorded so a later explain reads it); `claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md` and the `do-next-slice` copies (a book's DECOMP and chapters draw from phases, no research run or top-up, the critic only); `claude/agents/slice-executor.md`'s explain carve-out (no research roles); any other payload line naming the research agents or `run: full|quick|no-research`.
  - Every plugin section the route cites is re-cited by number **and** heading from `topics/skill-headings.md`.
  - **The bootstrap boundary:** S5 reads the bootstrap repo at a pinned HEAD (named in the handoff) to quote text, and **never edits or commits there**. The operator's bootstrap session applies the package; `/update-workspace` later brings it here.
  - `D85-qk`'s items (the critic-model pin, create-phase's confirmation layout, explain-review step 1) sit in the files S5 rewrites: settle them in the package and say which.
- **Set:** `works/phases/active/P39-hk/package/**`, `works/phases/active/P39-hk/handoff-explain.md`.
- **Risk:** `high`. Triggers: **open design** (the research-phase route for an explain is not pinned) and a **wide blast radius** (the plugin ↔ workspace interface every explain run passes through: four route files, their copies and the executor's carve-out).
- **spends money:** no.
- **Depends on:** `P39-hk.S1`, `P39-hk.S2`, `P39-hk.S3`, `P39-hk.S4`.

## P39-hk.DECOMP2

- **Goal:** cut the build once D1 is signed, from the signed round's `## Build`, R1's findings and the *Build inventory*: the native grammar twin first (backing), then the reader and print built to the signed canvas, then the skill's §4 grammar text, then the plugin release (0.10.0); rewrite this file in place with a `Breakdown (DECOMP2): …` gist line.
- **Set:** `works/phases/active/P39-hk/**` (this file, `phase.md`, the new slice folders).
- **Risk:** `high` (kind decomposition). A barrier; undeclared.
- **spends money:** no.
- **Depends on:** — (a barrier; ordered after S5).
