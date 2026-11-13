# P28.DECOMP — plan (orchestrator native plan, gated for operator approval 2026-09-21)

## Context

P27 is `done`: four design rounds (03 foundation · 04 console surfaces · 05 graph · 06 document views + print) are signed, immutable, and complete under `web/design/rounds/`. P27 wrote **no product code**. P28 is the apply half of that `design-only` pair — it builds what those rounds settled, fixes the graph, adds the project documents list, the chrome-less HTML-only view and print-pipeline PDF export, and verifies the result in a real browser at phone/tablet/desktop.

This slice decomposes P28. Executor: **`slice-executor-high`**. It creates the middle slices as bare folders and records the breakdown in the notebook. **No product code, no plan.md for any created slice, no commits, no doc versions.**

## Your job (and only this)

1. Read the inputs in *Binding inputs* below — the four `build-prompt.md` contracts especially. Spot-check the *Grounded facts* against the code yourself.
2. Create the middle slices as **bare folders**: `python3 scripts/workflow.py new-slice --phase P28 --slice P28.S<n> --name "..." --kind <implementation|qa> --risk high --order <n> [--depends-on ...]`. Never pre-fill any created slice's `plan.md`. `P28.DECOMP` is `order 0`, `P28.REVIEW` is `order 9999`.
3. Edit `works/phases/active/P28/phase.md` (the bounded notebook): the slice breakdown with a per-slice risk rationale, the **build inventory** (which contract sections and which files each slice owns), `## Decisions` (including the three resolutions in *Open items you must resolve* below), `## Notes for later slices` tagged `**(from P28.DECOMP, for P28.S<n>)**`, `## Operator Questions` for anything genuinely the operator's, and rewrite `## Now` (≤ 15 lines). Never touch the generated `## Slices` block.
4. Run `python3 scripts/workflow.py validate`.
5. Write `result.md` (verdict block first) and return the structured verdict.

Do **not** run `defer-job` / `promote-deferred` / `accept-gate` / `doc-new-version`. D18's absorb-or-promote is a **recommendation** you record; the orchestrator runs `promote-deferred` and declares the gate (`accept-gate P28 --require`) right after `finish-slice`, in the same commit.

## Operator-confirmed decisions (fixed — decompose around these, do not relitigate)

1. **RESPECT THE DESIGN.** The four `build-prompt.md` files are the binding implementation contract: self-contained, stylesheets verbatim, with their own definition-of-done / acceptance-check lists. Never drop, simplify, restyle or "improve" an approved element. A **gap** in a record goes on `## Operator Questions`; it is never filled by inventing a visual decision.
2. **Order of work:** groundwork/backend first → design implementation per surface → fidelity + functional sweep.
3. **Acceptance gate `--require`.** The operator walks the running product on phone, tablet and desktop before the review can pass.
4. **Out of scope:** new visual decisions; landing rounds 01/02 (report breakage, never redesign); server-rendered PDF (**D25**, stays deferred). PDF export is a browser **print pipeline** — print stylesheet + an Export PDF control calling `window.print()`.
5. **Copy defaults.** D28 (round-03 state copy), D29 (round-05 graph strings incl. the Korean halves), D30 (round-06's 19 document/print strings) each default to **adopt the card copy verbatim** if the operator says nothing. Record which slice lands each set; the review routes the entries.
6. **Verification runtime and instrument:** `docs/current/operations.md` → `## Operator Runtime` (operations v0023). Dev `pnpm --dir web dev` → `http://127.0.0.1:3030` with the API at `127.0.0.1:8766`; production build `pnpm --dir web build`; acceptance origin `https://knowledge.hi2vi.com`. Instrument: **Aside, `aside repl --account u1 "<js>"`** over Bash — never `u0` (the operator's own profile).

## Binding inputs (read in this order)

- `works/phases/active/P28/intent.md` — the operator's ask, verbatim + confirmed.
- `works/phases/active/P27/phase.md` — the four `## Decisions` round lines (what is settled), the four remaining `for P28` notes in `## Notes for later slices` (apply-time traps), and the five routed `## Operator Questions`.
- The contracts, in load order: `web/design/rounds/03-foundation/output/build-prompt.md` (628 ln) · `04-console-surfaces/output/build-prompt.md` (715 ln) · `05-graph/output/build-prompt.md` (687 ln) · `06-document-views/output/build-prompt.md` (905 ln). Each has a **Files / File map / Apply map** table and a **Definition of done / Acceptance checks** list — those are the per-slice scope and the per-slice validation.
- `docs/current/operations.md` → `## Operator Runtime`. Read other `docs/current/` sections just in time.

Do **not** copy contract text into `phase.md` — cite it by path and section. The cards live only in the Claude Design project and P28 needs no access to them.

## Grounded facts (verified this session — spot-check, then record what the slices need)

**Stylesheet load order the rounds require** (round 06 §1): `kb-tokens.css → kb-console.css → app-frame.css → kb-console-responsive.css (R03) → kb-console-r4.css (R04) → graph-r5.css (R05) → kb-docview.css → kb-print.css (R06)`. Each round declares earlier rounds' stylesheets **Do not touch**. This chain is why the apply slices are ordered 03 → 04 → 05 → 06 and not parallelised.

**New files the contracts create:** `kb-console-responsive.css`, `kb-console-r4.css`, `(app)/graph/graph-r5.css`, `kb-docview.css`, `kb-print.css`, `components/app-shell/navbar-nav.tsx`, `error.tsx` + `loading.tsx` (none exist anywhere today), `(public)/documents/[id]/{export-pdf-button,full-width-exit,print-blocks}.tsx`. **Deleted:** `(public)/documents/[id]/prose.css` and `explainer.css` (bodies move into `kb-docview.css`; `.kb-prose { max-width }` must never return).

**Sizes of the main edit targets:** `graph-canvas.tsx` 1711 ln · `dashboard/page.tsx` 415 · `documents/page.tsx` 382 · `projects/[projectId]/page.tsx` 275 · `(public)/documents/[id]/page.tsx` 216 · `version-history.tsx` 150 · `explainer-frame.tsx` 130 · `document-view.tsx` 123 · `public-shell.tsx` 40 · `markdown-body.tsx` 19. Round 04's apply map alone touches 14 files; round 06's file map touches 16.

**Backend:** `server/graph_api.py:87` emits a doc node's `"url": f"/documents/{d['id']}"` (308 ln total; `_graph_canonical_path` at `:192` already builds the graph's own pretty path). Tests: `tests/test_graph_api.py`, `tests/test_public_read.py`. Web tests: `web/tests/*.test.ts` (vitest).

**Framing headers are already correct.** `web/next.config.ts` carries the per-path `X-Frame-Options: SAMEORIGIN` + `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'` exemptions for `/api/documents/:id/raw` and `/api/documents/:id/versions/:v/raw`. The chrome-less view is `?view=full` **on the document's own URL** and frames the same relay, so **no new `next.config.ts` entry is needed** — do not invent one, and never put raw document HTML on the app origin.

**Gates:** `pnpm --dir web typecheck · lint · test · build`; server-side `uv run pytest` for the graph API change. No CI gate for `web/`. **D22: never run `prettier --write` on existing web files** (the repo is red repo-wide; formatting drift is a separate job).

**Regression checklist** (`docs/current/qa.md` → `## Regression Checklist`) is 4 lines today, all build/validate-level. The review re-runs what falls inside `phase-scope P28` and appends P28's headline checks.

## Open items you must resolve and record in `## Decisions`

1. **Doc node URL form.** `intent.md` asks for **`canonical_path` node URLs instead of `/documents/{id}`**; round 05 §4.6 states the read link as `/documents/{id}` (member) and `{publicBase}/documents/{id}` (public). Reconcile them. The additive reading — the payload carries `canonical_path` **beside** `url`, and the engine prefers it when present (P25's legacy `/documents/{id}` redirect keeps the fallback honest) — satisfies the operator's ask without contradicting a signed visual decision; adopt it unless your read says otherwise. State which slice owns the server half and which the engine half. If you conclude it *does* contradict the record, that is an `## Operator Questions` entry, not a silent choice.
2. **Where `graph-r5.css` loads.** Round 05 §1 says `graph-canvas.tsx` imports it; round 06 §1 puts it in the `globals.css` chain. It matters: `graph-r5.css` §3 also carries `.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr) }`, the **fix for a trap round 04 creates on every public page** (round 04 left the 15rem rail track under a public `<main>`). A component-scoped import leaves non-graph public pages broken at desktop widths. Decide where it loads (or where that one line lands) and say so; whichever you choose, the round-04 apply slice must not ship the trap unfixed.
3. **D18 — absorb or promote.** Round 05 §4.6 needs both its halves: the public tag pill becomes a **tag lens** (no navigation) and the non-public read link becomes `/login?next={publicBase}/documents/{id}`. Check whether `/login` honours a `next` param today; if it does not, that work is real and belongs to a named slice. Recommend absorb-into-`P28.S<n>` or promote; the orchestrator runs the command.

## Suggested shape (you own the final breakdown — adjust with reasons)

Roughly **7–10 middle slices**, **every one `--risk high`**: each writes real code across several files, so none qualifies for the `low`/mid tier. A defensible cut:

| Slice | kind / risk | Covers |
|---|---|---|
| `P28.S1` | `implementation` / `high` | Graph groundwork on the server: `canonical_path` on doc nodes (+ `tests/test_graph_api.py`), and whatever the public payload needs for round 05's public/non-public read-link split |
| `P28.S2` | `implementation` / `high` | **Round 03** apply — tokens, `kb-console-responsive.css`, shell/topbar/navbar/page-frame, tables/fields/buttons (contract §§1–4) |
| `P28.S3` | `implementation` / `high` | **Round 03** apply — system states (§5): `error.tsx`, `loading.tsx`, the seven not-found pages, `.kb-editorial` / `.kb-empty` / skeletons / toast; lands D28's copy |
| `P28.S4` | `implementation` / `high` | **Round 04** apply — shells, dashboard, project page + the **new documents panel** (§§4.1–4.6) |
| `P28.S5` | `implementation` / `high` | **Round 04** apply — documents page, disclosures/confirms, auth gate (§§4.4, 4.7, 4.8) |
| `P28.S6` | `implementation` / `high` | **Round 05** apply — the graph engine, the dock/panel/lens work, the off-frame fit contract; lands D29's strings |
| `P28.S7` | `implementation` / `high` | **Round 06** apply — document views + the chrome-less `?view=full` view (§§3.1, 4.1–4.4, 5); lands D30's screen strings |
| `P28.S8` | `implementation` / `high` | **Round 06** apply — the print layer + Export PDF control (§§3.2, 4.5, 5) |
| `P28.S9` | `qa` / `high` | Closing fidelity + functional sweep: every changed surface at 390×844 / 820×1180 / 1024×768 / 1440×900, in the dev runtime **and** the production build |

Merge or split with reasons — the contracts' own section boundaries are the natural seams. Two constraints on any cut you choose: (a) the stylesheet chain forces 03 → 04 → 05 → 06 ordering; (b) **each apply slice verifies its own surfaces in a real browser** against its contract's definition-of-done, and the closing sweep is the cross-surface pass, not the only browser work in the phase.

## Notes the notebook must carry (`## Notes for later slices`)

- **(for every apply slice)** Validate against **that round's own** Definition of done / Acceptance checks, not a generic pass: R03 §8 (10 items), R04 §9 (12), R05 §8, R06 §8 (24). Plus the standing gates `pnpm --dir web typecheck · lint · test · build`. Never `prettier --write` (D22).
- **(for every apply slice)** Append a one-line `## Doc impact` note — the round-03–06 provenance in `frontend` / `experience` / `decisions` is **P28's** debt (P27 owed none, by the repo's own precedent at P20). A docs phase consolidates it later; no slice runs `doc-new-version`.
- **(for the first browser-verifying slice)** Establish and record **how narrow viewports are reached** with Aside: `page` has no `setViewportSize` and no `waitForTimeout` (use the global `sleep(ms)`); each CLI call is its own session whose tabs close at the end, so open the page inside the call and never attach to `tabs[0]`; screenshots take a relative path and land under `~/.aside/u/1/sessions/<id>/`. Rounds 03/05 made the console and the graph respond to their **container**, so a resized container approximates the layout — but the phone/tablet claims in this phase need real device emulation or a real device. Record the method in `phase.md` so the later slices reuse it rather than re-deriving it.
- **(for the round-04 apply)** Two facts the contract states and the code does not: delete the trend figure's `h-[120px]` utility on dashboard **and** project page (round 03's `.kb-trend-wrap` clamp owns the height), and the `min-[720px]:` utilities on the documents page go with `.kb-searchbar__actions`. Round 03's card 04 carries a stale annotation (a 940px claim); the CSS is correct and the card is **never** edited.
- **(for the round-05 apply)** The operator's off-frame graph was **never reproduced** and **D26** (the screenshot) is still open. §4.2 is a *behaviour contract* — fit on first paint; a stored view restored only into a plate of the size it was saved in — not a diagnosis. If the defect survives the apply, capture the stored `sessionStorage` view record and the plate's measured size at first paint **before** changing anything else. Round 05 also found a real unreported case: landscape on a 390-tall viewport puts the Fit control below the fold.
- **(for the round-06 apply)** The exit pill **must** mount as a sibling of `.kb-app` (the shell declares `container: kbapp / inline-size`, so a fixed child pins to the document and the pill vanishes on a long explainer — acceptance check 13 catches exactly this). Two things to **find out** rather than assume: whether the browser engine prints a tall content-sized iframe in full (Chromium/WebKit do; Gecko has clipped), and whether 4s is the right `[data-unmeasured]` wait (raise it if real relays are slower; never remove the state). Record both findings in `phase.md`.
- **(for `P28.REVIEW`)** Gate is `--require`: the review opens the running product itself in the manifest runtime, spot-checks the phase's headline claims, walks the changed surfaces with fresh eyes, re-runs the `## Regression Checklist` lines inside `phase-scope P28` and appends this phase's headline checks, verifies the `## Doc impact` list, and routes every `## Operator Questions` entry.

## Validation for this slice

`python3 scripts/workflow.py validate` (state integrity). Nothing else — this slice writes no code.

---

## Two things for you at this gate (no answer needed to approve)

- **D26 — the off-frame graph screenshot is still open.** Round 05 designed a *behaviour contract* around the defect without ever seeing it. If you can send a screenshot of the wires off the frame on your Mac (member `/graph`, public `/@leetusik/graph`) — and check your phone — before the graph slice runs, the apply gets a diagnosis instead of a guess. If not, the slice proceeds on the contract and captures the diagnostics itself if the defect survives.
- **Three copy decisions default to "adopt the card copy verbatim"** — D28 (round-03 error/not-found/empty lines), D29 (round-05's graph strings, **including the Korean halves**, which are your product's voice), D30 (round-06's 19 document/print strings, English-only as written). Say nothing and the slices adopt them verbatim; say the word at any point before the owning slice runs and they use yours instead.
