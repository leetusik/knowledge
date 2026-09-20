status: done
summary: Drafted the exact `## Operator Runtime` text (ready to paste, verified against `web/.env.example` + the doc's own *Local Development* / *Web app local build/run (P12)* / *Web app production deploy (P14)* sections) into this file for `P27.REVIEW` to write via its carve-out; appended the Doc impact line and edited `phase.md`'s Decisions/Notes/Now per the plan. No product code, no doc versions, no browser drive, no commits.
files_changed:
  - /Users/sugang/projects/personal/knowledge/works/phases/active/P27/slices/P27.S1/result.md
  - /Users/sugang/projects/personal/knowledge/works/phases/active/P27/phase.md
validation:
  - "python3 scripts/workflow.py validate — passed (`Workflow validation passed.`); pre-existing warnings only (legacy slice kinds on P22/P26, oversized doc sections unrelated to operations.md) — see Validation section below for full output"
deviations: none — every fact in the draft below was verified against the repo (see Verification notes) and matched `intent.md` / the plan exactly; the one thing worth flagging (not a deviation) is that `aside account list` right now shows `u1` **signed out**, not holding the admin tab the operator described — noted as a live observation in the draft's caveat line, the operator's account choice (`u1`) is unchanged.
doc_impact: "operations.md: add \`## Operator Runtime\` (dev + production runtimes, acceptance origin, devices/viewports, Aside agent account u1) — exact text in slices/P27.S1/result.md (gate section — written at REVIEW) (P27.S1)"
review_verdict: none — not a review slice
explain: not written — run /explain for this phase (fixed pointer; not applicable to a non-review slice, included per instructions)

---

## Draft — ## Operator Runtime (exact text for P27.REVIEW to paste)

Insert as a new `##` section in `docs/current/operations.md` (placement left to the reviewer; a natural spot is right after `## Local Development` or near the end of the doc, whichever the doc-new-version diff reads cleaner — content is fixed, position is not a fact this slice owns).

```markdown
## Operator Runtime

How the operator runs and views the product, and what any browser-verifying slice must match — the dev runtime and the production build when the two differ, never whichever is most convenient for the executor.

- **Dev runtime:** `pnpm --dir web dev` → `http://127.0.0.1:3030`. The BFF calls the API server-to-server at `KB_API_BASE_URL` (dev default `http://127.0.0.1:8766`, see *Web app local build/run (P12)*); run the API on the host with `uv run uvicorn server.main:app --port 8766` (see *Local Development*).
- **Production build check:** `pnpm --dir web build` (standalone output). Part of the doc's own gate list — `typecheck · lint · test · build` (see *Web app local build/run (P12)*) — run this locally to catch build-only drift before trusting a dev-only pass.
- **Production / acceptance origin:** `https://knowledge.hi2vi.com` — container `knowledge-web`, `NEXT_PUBLIC_APP_URL` baked in at image build (see *Web app production deploy (P14)*). **The operator accepts on production.** A slice verifies on dev and additionally in the production build when the two differ.
- **Devices / browsers:** iPhone (Safari + Chrome), iPad (Safari + Chrome), Mac Chrome.
- **Viewports:** phone 390×844; tablet 820×1180 portrait and 1024×768 landscape; desktop 1280–1440 wide (1440×900 reference).
- **Instrument:** Aside, `repl` surface over Bash — `aside repl --account u1 "<js>"`. **Agent account id: `u1`** (operator's word, 2026-09-21). `u0` is the operator's own signed-in profile (Google, `leetusik@gmail.com`) — never drive it. Caveat: `u1` has been seen holding a signed-in admin tab for another product of the operator's; `u2` is a clean, signed-out alternative if the operator asks to switch.
  - Repl sharp edges: each CLI call is its own session and its tabs close at the end — open the page inside the call, never attach to `tabs[0]` blindly. `page` has `evaluate` / `screenshot` / `goto` / `locator` / `getByRole('button', 'Zoom in')` (string form) / `mouse`, but **no** `setViewportSize` and **no** `waitForTimeout` (use the global `sleep(ms)`). Screenshots take a **relative** path and land under `~/.aside/u/1/sessions/<id>/`. Narrow viewports come from Chrome device emulation or real devices — the app has no width media queries beyond `documents/page.tsx`'s single `min-[720px]:`, so constraining document width only approximates layout.
  - Fallback when Aside is unavailable: the same checks, at the same viewports, through any real browser — the demands bind, the instrument does not.
```

## Verification notes (repo checks this session)

- `web/.env.example:10` — `KB_API_BASE_URL=http://127.0.0.1:8766` with the comment "Local dev: http://127.0.0.1:8766 (the dev-compose api port)." Confirms the dev default cited above.
- `docs/current/operations.md` `## Local Development` (lines 16-22) — confirms `uv run uvicorn server.main:app --port 8766` as the host-run form.
- `docs/current/operations.md` `## Web app local build/run (P12; full deploy = P14)` (lines 458-465) — confirms `pnpm --dir web dev` → `127.0.0.1:3030`, `pnpm --dir web build` (standalone), the `typecheck · lint · test · build` gate list, and the `KB_API_BASE_URL` dev-default line matching `.env.example`.
- `docs/current/operations.md` `## Web app production deploy (P14)` (lines 467-486) — confirms `knowledge-web` container, `NEXT_PUBLIC_APP_URL` as a **build arg** baked into the client bundle, and the production origin `https://knowledge.hi2vi.com`.
- Confirmed `## Operator Runtime` is **absent** from `docs/current/operations.md` today (`grep -n "Operator Runtime" docs/current/operations.md` → no match) — matches `phase.md`'s Decisions and `intent.md`'s Notes.
- Ran the optional `aside account list` (allowed, read-only): shows `u0` (google, `leetusik@gmail.com`) signed in, `u1` and `u2` both currently **signed out**. This doesn't change the operator's chosen account (`u1`) or the caveat text (which describes a state seen previously, not a permanent one) — recorded as a live observation, not evidence either way about which account to use.

## phase.md edits made

- `## Decisions` — replaced the open-ended line "**Runtime manifest is a P28 prerequisite, not a P27 one.** ..." with a line recording route (b): S1 drafts the exact text into `result.md`; `P27.REVIEW` writes it verbatim into `docs/current/operations.md` on a pass, under its `## Operator Runtime` carve-out, via `doc-new-version --doc operations --source P27.REVIEW`, then `rebuild-docs` — settling the authority conflict `P27.DECOMP` raised.
- `## Doc impact` — appended the one line specified in the plan (see `doc_impact` above), verbatim.
- `## Notes for later slices` — removed the consumed note `(from P27.DECOMP, for the orchestrator planning P27.S1)` (the authority-conflict note; it is now resolved and recorded in Decisions); added `**(from P27.S1, for P27.REVIEW)**` pointing to this file and stating the review writes the section verbatim (only that section) via `doc-new-version --doc operations`.
- `## Now` — rewritten (≤ 15 lines): S1 done; S2 (round 03) next; the two open `## Operator Questions` (graph off-frame screenshot, sweep round 07) still open; the runtime-manifest authority question is now closed.

## Validation

```
$ python3 scripts/workflow.py validate
warning: slice P22.S1 has unknown kind 'feature'; ...
warning: slice P26.S1..S4 have unknown kind 'knowledge'; ...
warning: oversized_doc_sections=11 (H2 sections over 10,240 B ...): decisions.md, backend.md, product.md, +8 more -- split at next consolidation
Workflow validation passed.
```
All three warning categories pre-exist this slice (legacy `kind` values on P22/P26 slices from before the closed-set enum; oversized doc sections in `decisions.md`/`backend.md`/`product.md`/others, none of them `operations.md`) — nothing introduced by `P27.S1`. `Workflow validation passed.`
