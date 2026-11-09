# P39-hk — breakdown

`P39-hk.DECOMP` wrote this file on 2026-11-02; `P39-hk.DECOMP2` rewrote it in place on 2026-11-03. `intent.md` is the record; its *Scope Added at Execution* (A, B, C) wins over the earlier *Confirmed Intent* where they conflict. This file says how the work is cut and what each slice must not trip over. Skill line numbers drift as slices edit the file, so **each skill slice re-finds its passages by heading** (`grep -n '^#'`). Code line numbers below are at `d79891d0`.

## Passes

- **DECOMP** (2026-11-02), style `build-after`, `Mockup: on request`: one design slice (D1, critique `critic`), one research slice (R1), five groundwork slices (S1–S5, a declared chain; R1 ran beside S1), then `DECOMP2`. No build slice was cut before the design was signed. Not an explain phase (no `## Explain`); the gate is `--require`.
- **DECOMP2** (2026-11-03): six build slices from D1's signed round (`10-reading-aids/01-reading-aids`, canvas `1793661304-517d`), R1's findings (`topics/glossary-and-math.md`) and the code: **S6** glossary grammar → **S7** math grammar → **S8** math in the reader and on paper, with **S10** the skill's §4 grammar text beside it → **S9** terms in the reader and on paper → **S11** the 0.10.0 release → REVIEW. Every slice is declared; `parallel-plan`: `DECOMP2 -> S6 -> S7 -> S8 + S10 -> S9 -> S11 -> REVIEW`.
  - **Refined from R1's cut** (R1 *Build cut impact*: a → b → c → d → skill §4 → release, no wave):
    - S10 runs beside S8, because its set (the skill and its copies) is disjoint from every reader file;
    - S9 is **high**, not mid: the phone sheet's placement is unpinned (see *P39-hk.S9*);
    - S8 owns the √ correction's helper and its article pass, and S9 calls it on each window it opens (R1 had it all in the term controller);
    - S7 gives inline math an interim render so the anchor invariant test stays green until S8;
    - S8 also keeps a formula visible on a Review card (OQ9, built on its recommendation, like OQ7).
  - **Label map** (the DECOMP2 plan's B1–B6): B1 = S6, B2 = S7, B3 = S8, B4 = S9, B5 = S10, B6 = S11.

## Estimate

**Time** comes from `dispatch-summary`'s `means`, metered in this worktree on 2026-11-03: high 17.1 min/span (4 spans), mid 5.6 min/span (3), research 33.0; implementation 14.1 span-min/slice. Those spans were skill-text and package slices. These build slices write and twin code and verify live, so they are scaled up from the high spans S2 (24.8 min) and S5 (29.1 min).

| Slice | Route | Span time |
|---|---|---|
| S6 | high | ≈ 25–40 min (the four places, three fixture pairs) |
| S7 | high | ≈ 35–55 min (a new twinned module, the TSV, three fixture pairs, two 422s, the interim render) |
| S8 | high | ≈ 50–90 min (a dependency, the MathML rebuild, CSS and a font, a scratch stack, a live sweep in dev and the standalone build, paper, the Review card) |
| S10 | mid | ≈ 6–15 min (beside S8; S3 took 4.9 min) |
| S9 | high | ≈ 50–90 min (the sheet placement decision, the controller, keyboard paths, the paper appendix, the live sweep) |
| S11 | mid | ≈ 10–20 min (copy, counts and the whole-suite release gate) |
| REVIEW | high, gated | ≈ 45–120 min (a real-browser walk of the reader) |

- The build and review: about **4–7 h of span time**. S10 overlaps S8, and the main thread adds about 5 min a slice for planning. That is about **3.5–6.5 h wall clock**, plus the operator's acceptance sitting. A fidelity `fix` slice after the review is not counted.
- **Spend:** no slice spends money. `temml` (MIT) comes from the npm registry, and STIX Two Math (OFL) from fontsource or Google Fonts; both are free. Every span is the workspace's own dispatch. There is no vendor API, no paid service and no live explain run.

## Join-rebuilt artifact

None.
- `web/pnpm-lock.yaml` regenerates in S8 only (the only new dependency).
- `plugin/agents/explain-critic.md` regenerates in S10, inside its own set (`skills_parity.py --write-agents`). S11 regenerates it only if it changes Part B, which it should not.
- S8 and S10, the one wave, share no file and no generated file. S10 runs only Python checks, and S8 holds the ports, `web/node_modules` and the agent's Chrome.

## Build inventory

What the build ships, not how. Updated from R1 and the code survey.

- **Native grammar, in four places together.** These are `server/native/*` + `server/native_ingest.py`; their byte copies in `plugin/templates/kb/`; the TS twin `web/src/lib/native/*`; and the shared fixtures `tests/fixtures/native/*` with their template copies.
  - The glossary block (`` ```glossary #glossary ``) and `term:` links, with `ref-missing-term` and `ref-scheme`, and the search text (S6).
  - Inline math `` $`…`$ `` and the `formula` block (`tex`, `alt`, `reading`, `where`), checked by `formula-legend`; the TeX allowlist validator twinned as `tex.py` / `tex.ts` with `tex-allowlist.tsv` (`math-syntax`, `math-command`, `limit`); the ingest 422s `translation-term-ids` and `translation-math` (S7).
  - `syntax: 1` stays: the new forms are additive.
- **Reader and print, built to the signed canvas.**
  - Math (S8): the new web dependency **`temml` 0.14.0, pinned exactly** (web-only, server-only, about 480 KB of server bundle, 0 bytes of client JS). `mathml.ts` rebuilds Temml's output through a MathML allowlist into React elements. Then the inline, display and legend markup, `FormulaBox`, the screen and paper CSS, and the per-instance √ correction.
  - The font (S8): **STIX Two Math 2.12** woff2, unmodified (OFL 1.1; its Reserved Font Name is "TM Math"), 403 KB, vendored in `web/public/fonts/reader/` with its line in `web/public/fonts/README.md`. It loads only on pages with math.
  - Terms (S9): `planTerms`, the markers, the hidden windows, the desktop window and the phone sheet, the glossary section and its way back, `TermLayer`, the 3-line `annotations.tsx` touch, and the paper appendix.
  - Every one in light and dark, phone and desktop, English and Korean.
- **Undrawn surfaces the grammar reaches.**
  - The Review card draws quiz text on the client (`web/src/components/review/inline.tsx`), where math would vanish. This is **OQ9**, and S8 builds on its recommendation.
  - The old-version page (`web/src/app/(public)/documents/[id]/versions/[v]/page.tsx`) renders `NativeChapter` without the reader's layers: markers must land on their entries, and math must not degrade (S8, S9).
- **The skill's §4 grammar text** (S10): the glossary, `term:` links, inline math and the formula block, R1's gotchas, the translation keep-list, the critic's unlinked-jargon check, the three copies and the critic's body.
- **The plugin release** (S11): `plugin.json` **0.10.0**, the release notes in `plugin/README.md` and the commit, setup's `plugin_version`, `marketplace.json`, and the landing's line count. The front-door readiness test moves to workspace **v92** plus `**phases**` (S5's handshake). The release notes carry the checklist line **"before deploying, scan the stored native sources once for `` ```glossary ``, `` ```formula `` and `` $` ``; a hit means `syntax: 2`"**. That scan is a line, never a slice.
- **After the build** (the orchestrator, not a slice): `design-canvas 10-reading-aids --implemented`. The `kb` Design System re-sync from code cannot run on this login (D1 published from the local cache), so it is a deferred-job candidate for REVIEW.
- **D1's one job** (done, critique `critic`): the reading aids inside the chapter view: the term marker and window, the glossary section, the inline formula, and the display block with its reading and legend. Each comes in print, phone and desktop, light and dark, extending the `kb` system (job 10).

## Pins for every build slice (S6–S9)

- **The four places (S6, S7).**
  - Change `server/native/*` + `server/native_ingest.py`, their byte copies in `plugin/templates/kb/server/` (`scripts/plugin_parity.py`), the TS twin `web/src/lib/native/*`, and `tests/fixtures/native/*` with its copies in `plugin/templates/kb/tests/fixtures/native/`, together.
  - **Every new file is registered in `plugin/templates/manifest.json`'s `identical` list**, or the parity guard's completeness check fails. That covers a fixture, `tex.py` and any new Python test.
  - Four suites read the fixtures automatically: `tests/test_native_format.py`, `web/tests/native-conformance.test.ts`, `web/tests/native-render.test.ts` (every case renders, refused ones with the placeholder) and `web/tests/reader-anchor.test.ts`.
- **The anchor invariant.** `reader-anchor.test.ts` slices the rendered page of **every accept fixture** against Python's projection `.txt`.
  - Typed blocks (glossary, formula) contribute nothing to it.
  - A `term:` link counts as its children's text. Until S9 it renders through the existing missing-link path, which keeps the text.
  - Inline math counts as its TeX. So the render must stamp an atom (`data-an-len`) from the slice that adds the node (S7's interim), and S8's MathML keeps the count.
  - `paint.ts` assumes static markup: no client island inside a stamped paragraph.
- **RESPECT THE DESIGN (S8, S9).**
  - Build from the signed round, never the live canvas: `docs/reference/design/jobs/10-reading-aids/rounds/01-reading-aids/result.md` `## Build`, `frame.md` F1–F36, and the snapshot `rounds/01-reading-aids/canvas/project/` (boards and `frame.css`).
  - The `## Build`'s **canvas-only** list is never built. That includes the state bars, `Main.dc.html`, the phone boxes and sheet dock (F21), the print desk, and the fixed `.ra-m msqrt { margin-inline-end: -0.38em }`.
  - Never drop, simplify, restyle or "improve" a signed element.
  - A state the record never drew is a line on `## Operator Questions`, never an invention.
  - Put this rule and `## Operator Runtime` in each plan and dispatch prompt (`design-cowork` `reference/build.md`).
- **The stack (S8, S9, REVIEW).**
  - `:3030` and `:8766` are the **main checkout's** servers, running `main`'s code (on 2026-11-03 their cwd was `/Users/sugang/projects/personal/knowledge`). Never restart them, and never publish this branch's grammar to them: a glossary is a `ref-scheme` 422 there.
  - Run this worktree's own throwaway stack on free ports instead:
    - an API with scratch `KB_ROOT` / `KB_DB_PATH` and the fixture book, using P30's recipe (`works/phases/active/P30/topics/notes-later.md` *Loading the fixture book*; `P30/slices/P30.REVIEW/result.md` *Stack and instruments*);
    - `pnpm --dir web exec next dev -H 127.0.0.1 -p <port>` with `KB_API_BASE_URL` pointed at that API;
    - the standalone production build in a scratch copy, as `## Operator Runtime` describes.
  - Name the ports in `result.md`, and stop everything at the end.
- **The verification chapter.** S8 adds a fixture chapter to the dev fixture book, published by `scripts/publish_fixture_book.py --base-url <scratch>`: `tests/fixtures/book/reading-aids.en.md` and its Korean translation `reading-aids.ko.md`.
  - It carries the signed fixture's text (F12: the excerpt's three sections, F29), its four display blocks, its inline formulas, its 12-term glossary and the quiz item (F30).
  - S9 and REVIEW reuse it. The fixture book is root-only (`manifest.json` `root_only`).
- **The instrument.** Claude in Chrome on the agent profile: `list_connected_browsers`, then `select_browser` on the recorded `deviceId` before any other browser tool.
  - DECOMP2 checked on 2026-11-03 that `## Operator Runtime` is filled, not `UNFILLED`, with deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`.
  - The window size is fixed: read `innerWidth`. For a true phone or tablet viewport, use the manifest's same-origin iframe harness against the standalone build.
  - Paper goes by the manifest's P30 note: CDP `Page.printToPDF` on the same runtime, at A4 and letter.
  - If the extension's site permissions refuse the scratch port, or Chrome or the id is missing, return `needs_operator`. Never borrow another browser.
- **Signed out.** The agent profile holds no session, so the checks run anonymous. The *highlight meets term* states (F2) need a signed-in member: the plan either asks the operator to sign the profile in to the scratch stack, or leaves those states to the gate walkthrough, named.
- **The sweep.** It runs at the manifest's viewports (phone 390×844, tablet 820×1180 and 1024×768, desktop 1440×900), light and dark, English and Korean, then paper. The functional sweep (`reference/build.md`) applies: every control does something, and focus, hover and keyboard work on every one.
- **Merge risk.** P36-1s (Hermes) edits `annotations.tsx` and the reader page on its own branch, so keep those edits small and located.
- **Tests.** Only the core ones R1 names (topic §1–§6 *Tests (core)*). Look and behaviour are verified live, never by a test.

## Pins for every skill slice (S1–S4, S10, S11)

- **The shipped set:**
  - `plugin/skills/explain/SKILL.md` (canonical);
  - `.agents/skills/explain/SKILL.md`: the canonical body byte-equal, frontmatter without `argument-hint:` / `allowed-tools:`;
  - `web/public/SKILL.md`: a full-file copy;
  - `plugin/agents/explain-critic.md`, regenerated by `python3 scripts/skills_parity.py --write-agents` whenever Part B changes, never hand-edited;
  - the heading crosswalk `topics/skill-headings.md`. Every heading a slice adds, renames, renumbers or deletes lands there.
- **Validation:**
  - `python3 scripts/skills_parity.py` → PASS;
  - `python3 scripts/plugin_parity.py` → PASS;
  - `uv run pytest tests/test_explain_resolver.py -q` passes;
  - `git status --porcelain .claude/` shows nothing of the slice's;
  - after S5, `package/checks/cites.py plugin/skills/explain/SKILL.md <the five package texts> works/phases/active/P39-hk/handoff-explain.md` still reports missing=0 (S5's run: 113 citations, missing 0).
- **Vendored route.** The vendored route in `.claude/` is never edited. P33-n3's citation check against it regresses: record the count, never chase it.
- **Codebase-only binds the explain skill only.** The server, the CLI and the reader keep subject books, and `scripts/publish_fixture_book.py` and `tests/fixtures/book/*` stay.
- **Deferred overlap.** `D86-sd`, `D69` and `D85-qk` (e) and (f): a rewrite that settles an item says so in `result.md`. Never widen a slice to reach one.

## P39-hk.D1

Done: `10-reading-aids/01-reading-aids` signed as drawn ("accept", canvas `1793661304-517d`); see `## Decisions` and `topics/decisions.md` § Decisions 5.

## P39-hk.R1

Done: glossary and math grammar, Temml + MathML allowlist, the TeX twin, `TermLayer`, translation 422s → `topics/glossary-and-math.md`.

## P39-hk.S1

Done: the front door suggests the reader and the shape, is codebase-only and offers a research phase.

## P39-hk.S2

Done: the evidence model (the code at one commit plus the covering phases' records) → `topics/evidence-model.md`.

## P39-hk.S3

Done: the writing rules: visuals first, short paragraphs, typeset formulas, next steps from the workspace.

## P39-hk.S4

Done: the research agents are retired, and every copy says codebase-only.

## P39-hk.S5

Done: the bootstrap handoff package (`package/`, `handoff-explain.md`), with the v92-first handshake.

## P39-hk.DECOMP2

Cut S6–S11 from the signed round, R1 and the code; rewrote this file. Set: `works/phases/active/P39-hk/**`. A barrier.

## P39-hk.S6

- **Goal:** the glossary block and `term:` links in the native grammar, in all four places at once (R1 §1).
  - `"glossary"` joins `TYPED_BLOCKS`. Its body is `terms` (1–100): `id`, `term`, `aliases` (1–8), `short` *(md)* and `long` *(md)*.
  - It has its own term-id namespace, scoped to the block. A second block is refused with `limit`; the position is free.
  - `parse_ref` / `parseRef` gain `term:<id>`. A link to no term is the new **`ref-missing-term`**; a `term:` image, or a `term:` link inside the glossary, is `ref-scheme`.
  - `_search_block` indexes `term`, `aliases`, `short` and `long`. The annotation projection is unchanged.
  - README: the tree node, the codes table, the ref kinds.
  - No render change: the block renders nothing (`typed()` `default`) and a term link renders as a missing link with its text, until S9.
  - Translation is S7's (the 422s).
- **Fixtures (core tests):**
  - `glossary.md/.json/.txt`: terms, aliases, term links in prose, a caption and quiz text, the glossary after the links, and the search text;
  - `err-glossary.md/.err`: a second block, a duplicate term id, a malformed id, a missing `short`, a term link inside a definition;
  - `err-terms.md/.err`: `ref-missing-term`, a `term:` image.
  - Inline math in a definition, and a term in a legend, wait for S7.
- **Set:**
  - `server/native/{schema,parse,refs,project}.py`, `server/native/README.md`, `server/native/ids.py` (only if the namespace check needs it);
  - their copies `plugin/templates/kb/server/native/{schema,parse,refs,project,ids}.py` and `README.md`;
  - `web/src/lib/native/{schema,parse,refs,tree,project}.ts`; `web/src/lib/native/{ids,links,validate}.ts` (only if needed);
  - `tests/fixtures/native/{glossary.md,glossary.json,glossary.txt,err-glossary.md,err-glossary.err,err-terms.md,err-terms.err}` and the same seven under `plugin/templates/kb/tests/fixtures/native/`;
  - `plugin/templates/manifest.json` (the new fixtures in `identical`);
  - `tests/test_native_format.py` + its template copy (only if a search-text assertion needs a line).
- **Validation:**
  - `uv run pytest tests/test_native_format.py tests/test_native_ingest.py -q`;
  - `python3 scripts/plugin_parity.py`;
  - `pnpm --dir web exec vitest run tests/native-conformance.test.ts tests/native-render.test.ts tests/reader-anchor.test.ts`;
  - `pnpm --dir web typecheck`.
- **Risk:** `high`. Trigger: **core invariant**, the stored chapter format (a new block, a new ref kind and a new refusal at publish), and the projection that stored annotations anchor on.
- **spends money:** no.
- **Depends on:** none (the first build slice; ordered after `DECOMP2`).

## P39-hk.S7

- **Goal:** math in the native grammar, in all four places (R1 §2, §4, §6).
  - **Inline math** `` $`…`$ ``: a post-pass over the inline children both parsers produce, at every depth, native only, becoming `{type:"math", tex}`. `_plain` and `plainText` treat it like code, and the projection counts its TeX.
  - **The `formula` block** (`tex`, `alt`, `reading` *(md)* with no math allowed in it, `where` 1–20 of `{sym, means}`), checked by **`formula-legend`**.
  - **The TeX allowlist validator**, twinned as a new `server/native/tex.py` ↔ `web/src/lib/native/tex.ts`, with data in `tests/fixtures/native/tex-allowlist.tsv`: `math-syntax`, `math-command`, and `limit` (inline 300, display 2,000, depth 20).
  - **`translation_check`** gains the 422s `translation-term-ids` and `translation-math`, Python only.
  - **Search:** R1 left formulas open. The figure precedent (alt and caption indexed) suggests `alt`, `reading` and each `means`. S7 settles it as a `## Decisions` line.
  - **The interim render:** `render.tsx` gets only an interim inline `math` case, the TeX counted as an atom (`data-an-len`), so `reader-anchor.test.ts` and `native-render.test.ts` stay green. S8 replaces it, and `formula` stays `default` null until S8.
  - README: the tree, the codes, the no-escape rule for `$`.
- **Fixtures (core tests):**
  - `math.md/.json/.txt`: inline math in prose, a table cell and a YAML *(md)* field; a formula block; the TeX counted; `$5`, `$HOME/$USER` and `` $ `ls` `` staying text. It also covers a term in a legend's `means`, and math in a glossary definition (OQ4, F31).
  - `err-formula.md/.err` and `err-math.md/.err` (R1 §2, §4).
  - A Python and a TS test, each asserting its allowlist equals the TSV.
  - `test_native_ingest.py`'s translation cases: term ids differ, display `tex` differs, a legend `sym` differs, inline TeX missing (each a 422), and the same set reordered (accepted).
- **Set:**
  - `server/native/{schema,parse,project}.py`, new `server/native/tex.py`, `server/native/README.md`, `server/native_ingest.py`;
  - their copies under `plugin/templates/kb/server/` (`native/{schema,parse,project,tex}.py`, `native/README.md`, `native_ingest.py`);
  - `plugin/templates/manifest.json`;
  - `web/src/lib/native/{schema,parse,tree,project}.ts`, new `web/src/lib/native/tex.ts`, `web/src/lib/native/validate.ts` (only if needed);
  - `web/src/lib/native/render.tsx` (the interim inline `math` case only);
  - `tests/fixtures/native/{math.md,math.json,math.txt,err-formula.md,err-formula.err,err-math.md,err-math.err,tex-allowlist.tsv}` and the same under `plugin/templates/kb/tests/fixtures/native/`;
  - `tests/test_native_ingest.py` + its template copy;
  - the Python TSV test, in `tests/test_native_format.py` or a new `tests/test_native_tex.py`, + template copy + manifest;
  - new `web/tests/native-tex.test.ts`.
- **Validation:** S6's commands, with `web/tests/native-tex.test.ts` added to the vitest list.
- **Risk:** `high`. Trigger: **core invariant**, as S6, plus the publish-time validator every stored chapter passes.
- **spends money:** no.
- **Depends on:** `P39-hk.S6` (both edit `schema.*`, `parse.*`, `tree.ts`, `project.*`, the README and the manifest).

## P39-hk.S8

- **Goal:** typeset math in the reader and on paper, to the signed canvas (R1 §3; `## Build` *Inline formula*, *Display formula block*, *Paper*; F7, F8, F24, F27, F36).
  - **The engine.** `pnpm --dir web add --save-exact temml@0.14.0`. A new `web/src/lib/native/mathml.ts`: `temml.renderToString` with `throwOnError`, `trust: false` and no `annotate`, parsed by `saxes` and rebuilt through R1's element and attribute allowlists into React elements. It drops every `style`, applies F24's `lspace="0"` rule, and never inserts raw HTML.
  - **The markup.** It replaces S7's interim inline case with `math.ra-m` + `data-an-len`. The inline `alttext` is derived linear text (R1's OQ7 recommendation). The `formula` block is `figure.ra-mb`; `aligned` becomes stepped rows on the relation; the caption carries the reading, "where" (ko 여기서) and `dl.ra-legend` (one symbol column per chapter, F27).
  - **`FormulaBox`.** It reuses `scroll-box.tsx`'s measured overflow: `role="region"` "Formula, scrolls sideways" only when it scrolls, with the mask fade.
  - **The √ correction.** A helper (e.g. `web/src/lib/reader/radicals.ts`) measures each `msqrt` / `mroot` after `document.fonts.ready` and sets a per-instance `marginInlineEnd`, run over the article by a small client mount. Hidden windows are skipped, because S9 calls it on open. Never the fixed −0.38em.
  - **STIX Two Math** is vendored, with `--font-math` (`"STIX Two Math", "Cambria Math", math`), `local()` first, and the OFL line in the fonts README.
  - **The CSS** covers screen and paper (`kb-print.css`).
  - **The Review card** (OQ9, built on its recommendation unless the operator answers otherwise): a quiz card shows a formula as its linear text, made on the server where the queue is read. It never drops the formula.
  - **The old-version page** must not break on math.
- **Tests (core):** `web/tests/native-math.test.ts`.
  - Every TSV row renders through Temml in its context.
  - Every element and attribute Temml emits for them is in the rebuild allowlist.
  - The F24 rule holds.
- **Verification:** live, in this worktree's stack and its standalone build, per *Pins for every build slice*.
  - The *Formulas* states of `## Build` *Pages and states*.
  - The *Print* page's formulas, at A4 and letter.
  - The √ in Chromium against WebKit's zero gap, where the harness allows.
  - Dark `currentColor`, and the font loading only on pages with math.
- **Set:**
  - `web/package.json`, `web/pnpm-lock.yaml`;
  - new `web/src/lib/native/mathml.ts`, `web/src/lib/native/render.tsx`;
  - new `web/src/components/reader/formula-box.tsx`, `web/src/components/reader/scroll-box.tsx` (only if a prop is needed);
  - new `web/src/lib/reader/radicals.ts`, a new client mount `web/src/components/reader/math-layer.tsx`, `web/src/components/reader/reader-article.tsx` (the mount line);
  - `web/src/content/chapter.ts`;
  - `web/src/app/reader.css` (or a new `web/src/app/reader-aids.css` imported beside it), `web/src/app/kb-print.css`, `web/src/app/reader-fonts.css`;
  - new `web/public/fonts/reader/stix-two-math.woff2` (and its OFL text, if vendored beside it), `web/public/fonts/README.md`;
  - `web/src/components/review/inline.tsx`, `web/src/app/review/page.tsx`, `web/src/lib/review/actions.ts`, `web/src/lib/review/types.ts` (the OQ9 card);
  - `web/src/app/(public)/documents/[id]/versions/[v]/page.tsx` (only if math needs its CSS there);
  - new `tests/fixtures/book/reading-aids.en.md` and `reading-aids.ko.md`, `scripts/publish_fixture_book.py`;
  - new `web/tests/native-math.test.ts`.
- **Validation:**
  - `pnpm --dir web typecheck`;
  - `pnpm --dir web lint`;
  - `pnpm --dir web exec vitest run tests/native-math.test.ts tests/native-render.test.ts tests/reader-anchor.test.ts tests/native-conformance.test.ts tests/csp.test.ts`;
  - the standalone build in a scratch copy;
  - the live sweep, with the instrument named.
  - In the wave beside S10, the whole web suite and the full pytest run are `deferred: whole-tree` to REVIEW.
- **Risk:** `high`. Trigger: **core invariant**, the renderer's no-raw-HTML guarantee (`render.tsx` L1–19): the one place an engine's output enters the page.
- **spends money:** no.
- **Depends on:** `P39-hk.S7` (the math node and the formula block). It runs beside S10.

## P39-hk.S9

- **Goal:** terms in the reader and on paper, to the signed canvas (R1 §5; `## Build` *The term marker*, *The window*, *The phone sheet*, *Highlight meets term*, *The glossary section*, *Paper*; F2–F6, F17–F19, F22, F25, F32, F33).
  - **`planTerms`** (new `web/src/lib/native/terms.ts`, after `planCitations`) numbers `tm-<id>-<n>` across the text and the legends, in render order.
  - **The markers:** `a.ra-term`, `href="#gl-<id>"`, with `aria-*`.
  - **The windows:** hidden `tw-<id>`, `role="dialog"`, `tabindex="-1"`, in one `.ra-float`, with Close, Read more / Show less in one box (F32), and In the glossary →.
  - **The glossary section:** `<h2 id="glossary">Glossary</h2>`, A to Z by the chapter's collator, `gl-<id>` entries, the arrived mark, and ‹ Back to the text to the very occurrence (F33).
  - **`TermLayer`** (new `web/src/components/reader/term-layer.tsx`) is mounted beside `AnnotationLayer` and delegates over static markup.
    - It handles hover rest and leave, click, tap, Enter and Space, Tab out, and Esc.
    - Capture-phase pointerdown and Esc compose with annotations: never two floating things open at once.
    - It places each window and calls S8's √ helper on every window it opens.
  - **The 3-line `annotations.tsx` `onKey` touch**, and nothing else there.
  - **`.ra-term:has(> mark.an-m)`**, since paint puts the mark inside the `<a>`.
  - **The paper appendix** (`.ra-pgl`, after the quiz, before the sources, with no Back link).
  - **Mark-ups only where the author wrote a link.** A chapter with no terms has no section.
- **The trigger, located.** The phone sheet is `position: fixed` to the viewport bottom (F4). R1 §5 keeps every window inside the chapter's static markup and never moves a React-rendered node. But the chapter renders inside `main.rd-page` (`reader-frame.tsx` L591), which is the `rd` size container (`reader.css` L352–356, `container: rd / inline-size`).
  - The reader's own CSS records that `container-type` makes that box the **containing block of fixed descendants** (`reader.css` L20–26). The annotation layer therefore portals its fixed bottom slot outside `.rd-page` (`reader.css` L1488–1493; `annotations.tsx` `createPortal`).
  - **First step:** confirm in the browser whether a fixed `.ra-sheet` inside `.rd-page` pins to the viewport.
  - **If it does not,** choose the placement and record it in `## Decisions`. The candidates are: a client-held portal outside `.rd-page`, with no definitions shipped twice and no MathML on the client (R1 rejected both); a frame-level server slot outside `.rd-page`, which touches `reader-frame.tsx` / `reader-page.tsx`, the P36-1s merge risk; or `position: sticky` from the article's end.
  - The window's form switch at 40rem can stay a container query on `rd`.
- **Verification:** live, per *Pins for every build slice*.
  - Every *Terms* state of `## Build` *Pages and states*, and a legend term on *Formulas*.
  - The phone sheet at 390 and 320 through the harness, and the cross-page way back (F33).
  - Dark, Korean (가나다 order), and paper.
  - *Highlight meets term* needs a signed-in member (see *Signed out*).
- **Tests (core):** new `web/tests/native-terms.test.ts`: `planTerms` numbering in render order across text and legends, and an unknown id left as plain text.
- **Set:**
  - `web/src/lib/native/render.tsx`, new `web/src/lib/native/terms.ts`, `web/src/lib/native/links.ts` (the `term` kind, if resolved there);
  - new `web/src/components/reader/term-layer.tsx`, `web/src/components/reader/reader-article.tsx` (the mount);
  - `web/src/components/reader/annotations.tsx` (the 3-line touch only);
  - `web/src/components/reader/reader-frame.tsx` and `reader-page.tsx` (only if the chosen sheet placement needs a slot outside `.rd-page`);
  - a new `web/src/components/reader/print-glossary.tsx` (only if the paper appendix is its own component, as `PrintQuiz` is);
  - `web/src/app/reader.css` (or S8's `reader-aids.css`), `web/src/app/kb-print.css`;
  - `web/src/content/chapter.ts`;
  - `tests/fixtures/book/reading-aids.{en,ko}.md`, `scripts/publish_fixture_book.py` (only if the fixture must grow);
  - new `web/tests/native-terms.test.ts`.
- **Validation:**
  - `pnpm --dir web typecheck`;
  - `pnpm --dir web lint`;
  - `pnpm --dir web exec vitest run tests/native-terms.test.ts tests/native-render.test.ts tests/reader-anchor.test.ts tests/reader-chrome.test.ts`;
  - the standalone build in a scratch copy;
  - the live sweep, with the instrument named.
- **Risk:** `high`. The DECOMP2 plan said low, and this is refined from the code. Trigger: **open design**: the phone sheet's placement inside the `rd` container is not pinned (above). The rest of R1 §5 is pinned.
- **spends money:** no.
- **Depends on:** `P39-hk.S8`. Both edit `render.tsx`, the reader CSS and `chapter.ts`; the windows carry inline math; and S9 calls S8's √ helper.

## P39-hk.S10

- **Goal:** the skill's §4 grammar text for the new forms (R1 *Build cut impact* 4; Notes from R1 and S3).
  - **§4.4** gains the glossary block, with the convention `` ```glossary #glossary ``, after the quiz and before `## Sources`, and the about-40-word `short`.
  - **§4.4** also gains `term:` links: explicit, never auto-detected, and when to use a glossary entry versus a `DEFINITION` callout.
  - **§4.4** also gains inline `` $`…`$ ``, with its no-escape rule (a space before a literal `$`), and the `formula` block (`tex`, `alt`, `reading`, `where`). The `formula-legend` rule goes beside it: every symbol, in order, in the critic's hands.
  - **R1's gotchas:** TeX in YAML in a block scalar or single quotes; `\lvert` for `|` in a table cell.
  - **The refusal codes:** §5's 422 bullet (*Common ones*) gains `ref-missing-term`, `math-syntax`, `math-command`, `formula-legend`, `translation-term-ids` and `translation-math`.
  - **Two "until then" clauses** are replaced with the forms: S3's in §4 *Formulas that look good*, and B5's *A bare symbol string*.
  - **§4.2's list** gains the glossary: In one paragraph, the signed sections, Next steps, Quiz (when kept), Glossary, Sources.
  - **The outline** lists the reader's terms, and every definition and formula traces to evidence.
  - **The translation step** keeps every term id, every `` $`…`$ `` and every `tex` and `sym` byte for byte. It translates terms, aliases, definitions, readings, legend meanings and `alt`. Formula words stay English.
  - **The critic (B5)** flags jargon left unlinked on first use.
  - The inline form carries no written alt, built on OQ7's recommendation.
- **Set:**
  - `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`;
  - `plugin/agents/explain-critic.md` (regenerated only);
  - `works/phases/active/P39-hk/topics/skill-headings.md` (only on a heading change);
  - `works/phases/active/P39-hk/package/**` and `handoff-explain.md` (only if `cites.py` finds a heading they cite moved).
- **Validation:** the skill-slice checks (*Pins for every skill slice*), including `cites.py` missing=0. Nothing of `web/` beyond `web/public/SKILL.md`.
- **Risk:** `low`, no trigger: R1 and the S3 note pin every rule, and the text documents a settled grammar.
- **spends money:** no.
- **Depends on:** `P39-hk.S6`, `P39-hk.S7` (the grammar it documents).
- **Runs beside:** `P39-hk.S8` (declared). Its set is disjoint from S8's and S9's, it shares no generated file and no numbered sequence, and its checks are Python-only. S8 holds the ports, `web/node_modules` and Chrome.

## P39-hk.S11

- **Goal:** release plugin **0.10.0**, without pushing.
  - **`plugin/.claude-plugin/plugin.json`**: version `0.10.0`; its description goes from v86 to v92.
  - **`.claude-plugin/marketplace.json`**: the description.
  - **`plugin/README.md`**: the 0.10.0 release notes (codebase-only from the phases' records, one writer plus one critic, the suggested reader and shape, the research-phase offer, the glossary, `term:` links, typeset formulas, the v92 handshake). They carry the stored-sources scan checklist line (*Build inventory*). L15 and L46 move to v92.
  - **`plugin/skills/setup/SKILL.md`**: `plugin_version` 0.9.1 → 0.10.0 (L342, L356); L170 and L461 move to v92.
  - **The front door** (`plugin/skills/explain/SKILL.md` L3, L25, step 2 L283–L294, with its copies): `workspace_version` **92 or later** and a create-phase `## The explain route` listing `**phases**`; the two refusal texts name v92.
  - **Root `README.md` L37** and the KB template page `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md` L71.
  - **`web/src/content/marketing/content.ts` L251 and L261:** the skill's line count, recounted after S10's and this slice's own edits.
  - **The commit message** carries the release notes; the orchestrator writes it.
  - **No push** (OQ8: bootstrap v92 first).
- **Set:**
  - `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`;
  - `plugin/README.md`, `plugin/skills/setup/SKILL.md`;
  - `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`;
  - `plugin/agents/explain-critic.md` (regenerated, only if Part B changes);
  - `README.md`;
  - `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`;
  - `web/src/content/marketing/content.ts`.
- **Validation:**
  - the skill-slice checks;
  - `pnpm --dir web typecheck`;
  - `wc -l plugin/skills/explain/SKILL.md` equals `content.ts`'s count;
  - `grep -rn "v86" plugin README.md .claude-plugin web/public/SKILL.md` shows none left of the handshake;
  - the release gate: `uv run pytest -q`, `pnpm --dir web lint`, `pnpm --dir web test`, and `pnpm --dir web build` (in the worktree's own `web/`, with no worktree dev server left running).
- **Risk:** `low`, no trigger: located version strings, copy and a count, all named by the S4 and S5 notes.
- **spends money:** no.
- **Depends on:** `P39-hk.S6`, `P39-hk.S7`, `P39-hk.S8`, `P39-hk.S9`, `P39-hk.S10` (it ships them all).
