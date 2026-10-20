# P30.DECOMP — result

- status: done
- tier: high
- model: opus
- effort: high
- summary: Recorded the operator's A1–A5 answers, with every recommendation accepted, and cut P30 into 28
  bare middle slices. S1 is the A5 superseding wave. S2–S11 are the server backing plus `/explain` and the
  CLI, S12–S26 are one signed surface each, S27 is the sweep and S28 is the handoff note. Twelve
  implementation slices are `high`, each for a named core invariant. The estimate is about $580 and about
  23 span-hours, a floor.
- files_changed:
  - `works/phases/active/P30/phase.md` (`## Slice breakdown` added; `## Decisions`, `## Notes for later
    slices` and `## Now` replaced)
  - `works/phases/active/P30/topics/slice-breakdown.md` (new)
  - `works/phases/active/P30/slices/P30.S1` … `P30.S28` (each folder holds only `slice.json`, from
    `new-slice`)
  - this `result.md`
- validation:
  - `python3 scripts/workflow.py validate` passed. Only the existing warnings remain: legacy kinds, the P28
    consolidation, stale docs and oversized sections.
  - `next` reports `next_slice=P30.S1`.
  - No middle slice has a `plan.md`.
  - `git diff --stat -- web/ server/ cli/ plugin/ mcp-server/` is empty.
  - `phase.md` is 20,380 B against a 40,960 B budget.
- deviations:
  1. D37 is promoted into **S25** (the legacy reader), not the image-assets slice. S25 rewrites both raw
     relays, and that change is D37's trigger.
  2. The A5 wave is grouped into **three** superseding rounds (`01-reader`, `05-annotations`,
     `06-library`), not one per affected job. The border defect sits in the reader's signed controls,
     which `quiz` and `review` draw in. There is a fallback if a quiz or review board must be redrawn.
  3. The library migration is its own slice (S6). Its production run is an orchestrator step on the
     operator's word, not a slice.
  4. `/explain` and the CLI (S7) are placed after the native backing and before the web, not after the web
     surfaces.
- doc_impact: none (a decomposition ships no durable truth; the owed notes are listed for later slices)

## Deferred-job actions for the orchestrator (after `finish-slice`)

- **Promote D37 → `P30.S25`** (the legacy reader: `Cache-Control: no-transform` on both raw relays).
- **Promote D18 → `P30.S11`** and **D32 → `P30.S11`**. Both cover the sign-in return address; D18 was
  re-scoped at P28.REVIEW to the member guard.
- **Keep D38, D39 and D40 open.** P30.REVIEW drops them as obsolete once S25's full-screen frame is live.
- **Keep D25, D36, D13 and D41–D46 as they are.** D36 (7)'s device checks are inputs to S27.
- **File the new A1 job:**
  - **Title:** "A private content remote for tenant #1".
  - **Reason:** tenant #1's "private" documents are world-readable on the public GitHub repo (P29
    Operator Question 1, decision A1). P30 takes no repo action on it. Images stay out of git (A2,
    `.assets/` gitignored), so they have no off-box backup until the content has a private home.
  - **Trigger:** the operator's word, or the first private subject book.
  - **Source:** P30.DECOMP.

## How the cut was made

Everything below was read just in time:

- P30's `intent.md` and `phase.md`;
- from P29's `phase.md`: `## Decisions` (all of it, since it is the contract), the inventory, the notes and
  `## Now`;
- `P29.REVIEW/result.md` §5–9;
- every job's `job.json` and the headings of each signed `build-prompt.md`;
- P29.S1's book map header;
- the D18, D32 and D37 records;
- the code tree: `server/` routes, `alembic/versions/` (head `0005_tenant_slug`), `web/src/app` routes,
  `web/src/lib`, `web/tests`, `cli/`, `mcp-server/` and `scripts/skills_parity.py`;
- the `## Operator Runtime` manifest;
- the `dispatch-summary` `means`.

No `Explore` dispatch was needed.

**Findings that shaped the cut:**

1. **The border defect is one shared value.** `kb-border-strong` serves both as a structural hairline and as
   a control boundary. The 3:1 rule binds only controls. The quiz's `.rd-opt` and the review's
   `rd-btn--secondary` are signed parts of the reader. So the fix is one control-border role in the
   `01-reader` round. `library` needs its own round because its controls sit in the app frame, where
   changing the `kb` token would reach the console. This gives three rounds where there could have been
   five.
2. **D18 is not what its title says.** P28.REVIEW re-scoped it to the member-guard return address, the
   same ground as D32. So both go into S11.
3. **Where sign-in lands moves.** `DEFAULT_NEXT_PATH` is `/dashboard` (`web/src/lib/next-path.ts`).
   `library` 3 moves the landing after sign-in to `/library`, and S22 does that where it is drawn.
4. **A tenant with no org slug is undrawn.** `tenants.slug` is nullable and the reader URLs are
   `/@{org}/…`. No signed job draws what a member without a slug sees. This is a note for S11, to be raised
   rather than invented.
5. **The migration input is dated.** P29.S1's map was taken at `ed8dba0`. S6 must re-read `origin/main` and
   reconcile documents published since.
6. **`skills_parity.py` fails today** because `.agents/skills/` is absent. Every slice before S7 records
   that failure as known.
7. **Production is where the operator accepts.** Books must exist there before the walkthrough, so the
   pre-gate sequence is: push (with permission), deploy, run S6's binding on production, then walk. This is
   in the notes for S27 and REVIEW.
8. **The cheap route resolves to `sonnet @ high`** (`executor-route P30.S27`), so the sweep at `qa / low`
   is not on haiku. The orchestrator may still bump it at planning.

**What was written to the notebook** (by path, not restated here):

- `phase.md`:
  - `## Slice breakdown`: the table, the estimate and the link;
  - `## Decisions`: A1–A5, the contract, the shape, the granularity, the wave grouping, the ratings, the
    deferred routing, the migration run and the gate;
  - `## Notes for later slices`: the gates, the core tests, the `origin/main` rule, the `kb-api` wrinkle,
    dev fixtures, the missing slug, the CSP, the device checks, the pre-gate steps, the handoff items and
    the Doc impact owed;
  - `## Now`.
- `topics/slice-breakdown.md`: each slice's scope, the contract sections it reads, and its trigger.

**Estimate inputs** (`dispatch-summary` `means`, per kind):

| Kind | $ per slice | Span-minutes per slice |
|---|---|---|
| co-work | 72.26 | 402.6 |
| implementation | 18.91 | 34.8 |
| qa | 22.06 | 55.3 |
| docs | 1.97 | 1.7 |
| review | 10.96 | 30.5 |
| fix | 4.94 | 21.8 |

One co-work slice, 25 implementation, one qa, one docs and the review come to $580.00 and 1,360.1
span-minutes, plus $15–25 for 3–5 fixes. These are floors: 64% of requests are output floors, the
implementation mean comes from nine smaller slices, and the main thread is excluded.
