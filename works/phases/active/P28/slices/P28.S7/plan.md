# P28.S7 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Round 06 apply, screen half: the document views and the chrome-less `?view=full` view.** Executor: `slice-executor-high`.

Scope is round 06's contract **§3.1 (`kb-docview.css`), §4.1–4.4, §5's screen half, §6, and §7's screen strings** (`web/design/rounds/06-document-views/output/build-prompt.md`). **RESPECT THE DESIGN.** **§3.2 (`kb-print.css`), §4.5's print blocks, the Export PDF control and §7's print strings are `P28.S8`'s — do not touch them.**

Read `works/phases/active/P28/phase.md` whole first. Binding and not restated here: **the cascade rule**, **the exit-pill / `@container kbapp` conflict** (S5 hit the identical problem on the key reveal — read both that note and the `## Decisions` entry before you mount anything fixed), **the Aside recipe** and its addenda, the **live runtime and fixtures**, and the **deaf dev server** trap.

## Where the stylesheet goes

`web/src/app/kb-docview.css`, byte-identical to §3.1, imported from `globals.css` **after `graph-r5.css` and before `kb-record-fixes.css`** — that file's header says exactly this and the comment there is load-bearing. `kb-print.css` follows yours in S8, also before the corrections sheet.

Two deletions the contract orders: `(public)/documents/[id]/prose.css` and `explainer.css` are **removed**, their bodies moving into `kb-docview.css`. **`.kb-prose { max-width }` must never come back** — the grid is the measure now, and check 4 greps for `46rem`.

Nothing else is a verbatim record you may edit: `kb-tokens.css`, `kb-console.css`, `kb-console-responsive.css`, `kb-console-r4.css`, `graph.css`, `graph-tokens.css`, `graph-r5.css` are all **do not touch**, and so are the round records under `web/design/rounds/`.

## What this slice is really for

Three things in round 06 are net-new capability rather than restyling, and they are what the operator asked for:

1. **The reading column becomes a grid, not a max-width** — a centred text track at `--kb-measure` (42rem) and a full track at `--kb-app-read-w` (64rem), so prose and code fences stop fighting over one width, and a member page and a public page finally read identically.
2. **The chrome-less view is `?view=full` on the document's own URL** — both body kinds, all three surfaces, one always-visible exit pill, the superseded stamp the only chrome that stays, and the **same sandboxed relay frame**. This is the operator's "HTML only view".
3. **The framed explainer takes the full 64rem** with a flat reserved height per tier (26/32/40rem), replacing the magic number round 05 killed for the graph, plus a stated 70rem `[data-unmeasured]` fallback and an honest line after 4s.

## The security boundary — do not move it

The `?view=full` view is **the document's own URL with a query param**, so it frames the same BFF relay through the same sandboxed opaque-origin iframe. `web/next.config.ts` already carries the per-path `X-Frame-Options: SAMEORIGIN` + `sandbox allow-scripts; frame-ancestors 'self'` exemptions for the two `raw` relay routes, so **no new `next.config.ts` entry is needed — do not invent one**. Never serve raw document HTML on the app origin, never add `allow-same-origin`, and keep `explainer-frame.tsx`'s existing two postMessage listeners, its 120–40000px clamp and its child-ward `kb-explainer-request` re-post **verbatim** (that re-post fixes an unrelated hydration race).

## Two things to find out rather than assume

- **Whether 4s is the right `[data-unmeasured]` wait.** Measure a real relay in the manifest runtime. Raise the value if real relays are slower; **never remove the state**. Record what you measured and what you chose.
- **Whether the exit pill's rules are container queries at all.** Check round 06 §4's at-rules first: if they are plain rules or `kbmain` queries, S5's portal-root problem does not arise and you should not build a portal you do not need.

## Section notes

- **§4.1** — the article on all three routes (`(public)/documents/[id]`, `(public)/[org]/[project]/[slug]`, `(public)/documents/[id]/versions/[v]`), wrapped in `<article class="kb-doc">`, with the actions row built per the contract: **two groups** (where you came from · what you can do), Delete behind a hairline and below a full-width rule on a phone, and the claim hint **out of the row** as the sentence it is.
- **§4.2 / `document-view.tsx`** — `.kb-docmeta`, `.kb-dochead`, `.kb-doc__body`; Source reordered before Tags; the empty-body line as `<p class="kb-prose__empty">` **inside** `.kb-prose`, not beside it. It stays a server component with no auth import.
- **`markdown-body.tsx`** — three additions to the components map: a `table` wrapped in `.kb-prose__wide` that **must be a direct child of `.kb-prose`** to reach the full track; an `a` that absolutizes a relative href against the document's canonical URL (passed in as a prop) and sets `data-bare` when the text equals the href; and `pre` with `tabIndex={0}` + `role="region"` + an `aria-label` from the fence language, because it scrolls and must be keyboard-reachable.
- **`version-history.tsx`** — `data-pri`/`data-label`, the phone View link as a ghost `sm` button carrying the version in its visible label, and the new `ok?: boolean` prop whose `false` renders the panel head plus `.kb-editorial` ("Unavailable", the §7 sub line, **no button**). `versions.length === 0 && ok !== false` still returns `null`. **`loadVersions` returns `{ ok: false }` on catch instead of an empty array** — today a fetch failure is indistinguishable from a document with no history, which is the bug this closes.
- **The three `page.tsx`** — read `searchParams` for `view=full` and pass it to the shell; mount the Full width link on every surface. **`<ExportPdfButton>` is S8's** — the contract mounts it in the same actions row, so build the row so S8 can drop it in, and say in your notes exactly where.
- **§7 copy (D30, screen half)** — the ten screen/control strings into `web/src/content/documents.ts`, **adopted verbatim** (the recorded default). The nine print-only and failure strings are S8's. If you find a string you need that is in neither half, that is a record gap: report it.

## Tests

`web/tests/` has no jsdom and no component rendering, so **write no new test file** for markup. The two places a small test could earn its keep are the relay route behaviour (already covered by `raw-route.test.ts` / `version-raw-route.test.ts` — extend only if you change that contract, which you should not) and the link-absolutizing helper if you factor it out as a pure function. Prefer live verification; do not build a harness.

## Validation

1. `pnpm --dir web typecheck` · `lint` · `test` · `build`. **Never** `prettier --write` an existing web file (**D22**).
2. **Round 06 §8, acceptance checks 1–13 and 21–23.** Checks 14–20 and 24 are S8's print checks — do not attempt them. **Check 13 is written to catch the exit pill vanishing on a long explainer** — that is the one that fails if the pill is mounted wrong, so prove it on a genuinely long document, not a short one.
3. **In the operator runtime, in a real browser**, on all three document routes, with **both body kinds** — a markdown document and a framed HTML explainer. Prove: the two-track grid (prose at 42rem, a code fence and a table reaching 64rem); `?view=full` showing the document alone with the exit pill visible **after scrolling to the bottom of a long explainer**; Escape and the pill both exiting without stacking a history entry; the explainer's waiting line, its 4s unmeasured state, and its relay-failure branches (404 with no retry, 502 with Reload); a version-history fetch failure rendering the panel instead of vanishing.
4. Narrow viewports through S2's harness — **layout there is trustworthy, interaction is not**. Drive the interactive checks at the top level and state plainly in `result.md` anything phone-*and*-interactive you could not reach.

## Before you finish

- Append **one** `## Doc impact` line (`frontend.md` for the docview layer and the retired stylesheets; `experience.md` + `product.md` for the chrome-less view as a capability; `security.md` only if you touched the sandbox boundary, which you should not have).
- Edit the notebook: consume the notes addressed to you, record **what you measured for the relay wait**, add `## Decisions` for any reading of the record you acted on, leave `P28.S8` a note saying exactly where the Export PDF control mounts and what the print layer must not disturb, and rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first, listing checks 1–13 and 21–23 with how each was verified.

You never commit and never transition slice or phase status.
