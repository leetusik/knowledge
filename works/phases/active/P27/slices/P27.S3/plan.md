# P27.S3 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Design round 04 — console surfaces at phone / tablet / desktop.** `kind: co-work`, `risk: high`.
Runs **inline** on the main thread: `DesignSync` is main-thread-only and no executor has it. `intent.md`
`## Design Style` says `Mockup: on request` and the operator has not asked for one, so this round has **no
dispatched span at all** — two inline spans around **one** operator stop (PENDING #1), two commits.
No product code. No doc version. P28 applies everything this round decides.

## What this round covers

Six surfaces, composed from the kit round 03 settled:

| # | Surface | Real source |
|---|---|---|
| 1 | Member shell assembled | `components/app-shell/{app-shell,app-frame,rail-nav,logout-button}.tsx` |
| 2 | Anonymous public shell | `components/public-shell.tsx` (composed 1:1 from the member pieces) |
| 3 | Dashboard | `app/(app)/dashboard/page.tsx` (415 lines) + its four client islands |
| 4 | Project page **+ a documents list (new)** | `app/(app)/projects/[projectId]/page.tsx` + `getDocuments(token, {project})` |
| 5 | Documents browse / search / pager | `app/(app)/documents/page.tsx` (382 lines) |
| 6 | Auth gate — login + signup | `app/(auth)/{layout,auth-card,credentials-form}.tsx`, `login/`, `signup/` |

Out of this round by construction: the graph (round 05), document views + HTML-only + print (round 06),
the landing page (rounds 01/02, never touched).

## Round 03 is an input, never a question

Round 03 is **signed** (`web/design/rounds/03-foundation/SIGNOFF.md`, operator's literal "done"). Its eight
decisions — container queries on `kbapp`/`kbmain`, the `.kb-navbar` phone/tablet pattern, the phone topbar
with `<details class="kb-account">`, OS-following dark scheme via `data-kb-scheme="auto"`, `data-pri` +
stacked `data-label` tables, fluid display type, phone density, the `.kb-editorial` / `.kb-empty` state rule
— are **settled inputs**. The handoff states them as given and poses none of them again. RESPECT THE DESIGN:
a round-04 card may compose round 03's classes and may add new ones, but may not restyle, drop or "improve"
an approved element. The contract to cite is `web/design/rounds/03-foundation/output/build-prompt.md`.

## Procedure

### Span 1 — inline, now

1. `mkdir -p web/design/rounds/04-console-surfaces` and write `handoff.md`: the OUT half. Structure follows
   round 03's handoff (§0 before the session … §7 DoD). It decides no colour, type, layout or copy — every
   design question goes back to the operator in §6.
2. Card contract in §5: paths **`17-…` … `26-…`**, numbered in reading order, continuing round 03's
   numbering; a card that supersedes 01–16 keeps its path and number; groups
   `⏳ P27.S3 · Shells` / `· Console pages` / `· Auth`; line-1 marker `<!-- @dsCard group="…" viewport="…"
   name="…" subtitle="…" -->`; every surface card carries **real-width `.r3__frame` frames at 390 / 768 /
   1180**, because the console queries its container and a 390px frame *is* the phone layout.
3. `start-slice P27.S3`; rewrite `phase.md` `## Now` for the stop; `set-slice-status P27.S3 pending`;
   `validate`; commit `feat(design): P27.S3 handoff — round 04 console surfaces`.
4. **STOP at PENDING #1** and report: what the operator runs, that their "done" on return **signs the
   round** (no mockup requested), and that they can still ask for a mockup in their own words before that —
   which would re-declare the gate `accept-gate P27 --require`.
   **I do not push.** `git push` is not mine to run here; the operator pushes `main` so Connect GitHub sees
   the new handoff, or points the session at this checkout with a local-directory connection.

### Span 2 — inline, on the operator's return

5. Read the project back with `DesignSync` (`get_project`, `list_files`, `get_file`). **Two checks, and
   nothing is signed if either fails:**
   - **Card contract** — every listed path present, numbering contiguous from 17, `_ds_manifest.json`
     compiled, no monolithic "design system" page, the stylesheet delta present and additive.
   - **Concreteness** — every §6 question answered *in the design*; nothing left for P28 to invent; the
     record + `build-prompt.md` buildable by an implementer who cannot open the pane.
   On a failure: report exactly the failing points, `set-slice-status P27.S3 pending` again, STOP, sign
   nothing.
6. Land the returned record **as-is** into `web/design/rounds/04-console-surfaces/output/` (read-only data,
   never edited): `result.md`, `build-prompt.md`, any stylesheet delta. Cross-check any CSS that claims to
   be verbatim against the contract it appears in, as in round 03.
7. Write `SIGNOFF.md` quoting the operator's **literal** words, the read-back checks and what was verified,
   what supersedes what, and how the regroup was done.
8. **The regroup — the round's only DesignSync write, and it must be pure.** Line 1 of each round-04 card
   only: `⏳ P27.S3 · X` → `X`. Everything after line 1 byte-identical. `finalize_plan` (with `writes`,
   `deletes: []`, `localDir`) → `write_files` (`localPath` relative to `localDir`, ≤256 per call), then
   re-fetch two cards to confirm line 1. Round 03's cards and `shipped/` are not touched.
9. Edit `phase.md`: add the round-04 decision line to `## Decisions` (settled, RESPECT THE DESIGN, record
   paths), append any operator question the round raises, drop the notes this slice consumed, retag the
   notes that now carry round-04 answers forward to S4/S5, rewrite `## Now` for S4. Never touch
   `## Slices`.
10. `set-slice-status P27.S3 in_progress` → `finish-slice P27.S3 --outcome "…"` → `validate` → commit
    `feat(design): P27.S3 signoff — round 04 console surfaces` → continue the loop into **S4**.

## Constraints

- **Never design.** Claude Design + the operator make every visual decision. The handoff supplies real
  context, real paths, real data shapes and real copy sources — never a proposal, never lorem.
- **Two sanctioned DesignSync writes exist in this workspace** (grounding already-existing components; the
  post-approval regroup). This round uses **only the regroup**. The project was already grounded in S2.
- **Copy is locked** to `web/src/content/*`. Specimen copy on a card is a specimen; if the round wants new
  strings, that is an operator question, not a design decision (card 14's copy is already such an entry).
- **Additive only**, as in round 03: no existing `--kb-*` name or value changed, no edit to `kb-console.css`
  or `app-frame.css`, no edit to the Round 03 block. A delta goes in its own marked block or its own file.
- **The acceptance gate stays waived** unless the operator asks for a mockup; then
  `accept-gate P27 --require` before the round closes.
- Deferred jobs already filed: **D18**, **D22**, **D25**. Do not duplicate.

## Validation

`python3 scripts/workflow.py validate` after each state transition (state integrity only — this slice runs
no tests and writes no product code). The handoff commit must leave the tree clean apart from the generated
`works/` files it regenerates.
