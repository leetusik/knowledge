# P30.DECOMP — decompose the learning-reader apply phase

## Context

P29 (design) passed review on 2026-10-20. All nine design jobs are signed under
`docs/reference/design/jobs/01-reader … 09-legacy-and-print`, and the research contracts are in P29's
`phase.md` → `## Decisions`. P30 builds them. The build covers the server backing (books, chapters,
native format, images, reader state, review), the web surfaces with one scroller and no iframe height
handshake, `/explain` and the CLI, a fidelity sweep, and the bootstrap handoff note. This slice cuts that
build into slices. It writes no product code.

P29's review sent five decisions (A1–A5) to you, to settle **before this DECOMP**. They change the cut, so
they come first. **Approving this plan accepts all five recommendations as written.** To answer any of
them differently, reject the plan and give your answer, and I will fold it in.

## Operator decisions (A1–A5): my recommendations

- **A1. Tenant #1's "private" docs are world-readable on the public GitHub repo.** Your earlier
  instruction made this report-only.
  - **Recommendation:** P30 takes no repo action on it. I file a deferred job, "a private content remote
    for tenant #1", triggered by your word or by the first private subject book.
  - **Trade-off:** today's exposure stays as it is until then. P30 adds no new exposure, because images
    stay out of git (A2).
- **A2. Chapter images in git?**
  - **Recommendation:** no. `.assets/` is gitignored for every tenant.
  - **Cost:** tenant #1's images live only on the box disk, with no off-box backup, until A1 gets a
    private home.
- **A3. The portable `/explain` copy (`.agents/skills/explain/SKILL.md`).** `skills_parity.py` FAILS
  today, so P30's standing gate cannot pass until this is answered.
  - **Recommendation:** (a) restore it in P30's `/explain` slice, rewritten for the native format.
  - The handoff note asks the bootstrap's updater to stop deleting `.agents/skills/explain/`.
  - **Trade-off:** until the bootstrap changes, a workspace update can delete the copy again, so check it
    after every update.
- **A4. Confirm the five working assumptions (Q4–Q8):**
  - no JS widgets in v1;
  - no math in v1;
  - an anonymous reader keeps only the settings cookie, and every save shows "Sign in to save";
  - highlights enter review only through "Review this";
  - deleting a document purges readers' notes on it.

  **Recommendation:** confirm all five. They are already drawn. A different Q6 or Q7 answer would reopen
  signed jobs.
- **A5. One small superseding design wave** (`co-work`, critique level `critic`) for:
  - (i) C07, the reader's chapter bar overprinting at 150–200% text and below 320 px;
  - (ii) `annotations` 10, keyboard reach to a highlight's popover;
  - (iii) the control and rating-button border at about 1.58:1, raised to 3:1 (`quiz` C09, `review` 12,
    `library` C11);
  - (iv) `book-page` 7, the back link reading "‹ Back to the book".

  **Recommendation:** yes to all four, as **P30's first slice**. Under RESPECT THE DESIGN, the build may
  not fix three accessibility defects in code. Running the wave first puts its one `pending` stop at the
  start of the run, and the build after it can then run unattended.
  - **Cost:** a co-work slice meters at about $72 and about 400 span-minutes. A four-fix wave should
    come in under that.

## What the DECOMP executor does (`slice-executor-high`)

1. **Read just in time:**
   - P30's `intent.md`;
   - P29's `phase.md`, one section at a time: `## Decisions`, *Slice breakdown and build inventory* (the
     25-line inventory) and `## Notes for later slices`;
   - P29's `slices/P29.REVIEW/result.md` §5–6;
   - each job's `job.json` and signed round under `docs/reference/design/jobs/<job>/`, especially
     `build-prompt.md`;
   - the code it cuts against: `server/`, `alembic/versions/` (head is `0005_tenant_slug`), `web/src/`
     (including `lib/explainer-height.ts`), `cli/`, `mcp-server/`, `plugin/skills/explain/`,
     `scripts/skills_parity.py` and `tests/`.

   It reads the library from `origin/main` with `git show` and never pulls. It uses `Explore` for bulky
   reads.
2. **Record in P30's `## Decisions`:** A1–A5 as answered here, and the reasons for the cut.
3. **Cut the slices** with `new-slice`, as bare folders with no `plan.md`, in this order: the A5 wave,
   then the backing, then the surfaces, then the sweep. The shape below is a suggestion. The executor
   decides the final cut and justifies it.
   - **S1. Superseding wave (A5):** `--kind co-work --risk high`. Its jobs are superseding rounds of the
     affected signed jobs: `reader`, `annotations`, `book-page`, and the border across `quiz`, `review`
     and `library`. The executor may group them into fewer rounds. Critique level `critic`.
   - **Server backing.** Rate each slice `high` only for a named trigger:
     - books and chapters (manifests, order, version chain, KO/EN), plus migrating every existing document
       into the book model with no broken shared link (**core invariant**);
     - native format ingest: the CommonMark+GFM parser, typed blocks, the SVG allowlist and 422 at
       ingest, ids, references, search and the MCP path (**core invariant**: sanitizing);
     - image assets: upload, a content-addressed store, `/raw` served with the chapter's visibility,
       `.assets/` gitignored, and D37's `no-transform` on the raw relay;
     - reader state: revision `0006_reader_state` (7 tables), the `/app/reader/` API, the pagehide beacon,
       server-side re-anchoring and the purge on delete (**core invariant**), with the four core tests
       from P29's notes;
     - review on FSRS (py-fsrs, pinned) (**core invariant**: state transitions);
     - D18 and D32 (the login return address) and reader URLs on the org slug.
   - **`/explain` and the CLI:** the native format, book and chapter metadata, the general-learning mode
     and `--asset`, across the three parity-gated copies, with the portable copy restored (A3).
   - **Web, one slice per signed surface, under RESPECT THE DESIGN.** The surfaces are: the reader (shell,
     settings, themes, prose kit), figures, diagrams, quiz, annotations, library (with the app-shell
     entries and `/@{org}`), book page, review, and legacy and print. The legacy slice retires the height
     handshake (`explainer-height.ts` and its parent half). These default to `low`; a `high` needs a named
     trigger, for example the selection-anchoring logic.
   - **QA sweep** (`qa`): the manifest viewports in the operator runtime and the production build, through
     Aside `--account u1`. It checks that every control works, that state persists, and that no inner
     scroller appears at DPR 2, with classic scrollbars, or across width changes (P28's checklist lines).
     It also covers D36 (7)'s device checks; the physical-device items are recorded as operator-run.
   - **Handoff note** (`docs`, `low`), the last slice before REVIEW. It is saved in P30's folder and covers
     the five items in `intent.md`. It never edits the bootstrap repo.
4. **Write to `phase.md`:**
   - the breakdown as a section, with each slice's trigger and its estimate from `dispatch-summary`
     `means` (implementation about $19 and 35 minutes per slice; co-work about $72; qa about $22);
   - `## Notes for later slices`: the device checks, the core tests, the parity gate, D22 (no
     `prettier --write`) and the `kb-api` push wrinkle;
   - `## Now`.

   Long material goes to `topics/`, and the file stays under the 40 KB budget.
5. **List the deferred-job actions for me to run** after `finish-slice`. The executor never runs them.
   - Promote D37, D18 and D32 into their slices.
   - Keep D38–D40 for dropping at the review.
   - Keep D25, D36, D13 and D41–D46 as they are.
   - File the new A1 job.
6. **Return the verdict.** The executor validates with `python3 scripts/workflow.py validate` and returns
   a structured verdict.

## After the executor returns (orchestrator)

- Run `record-dispatch`, then `finish-slice P30.DECOMP --outcome …`.
- Run `accept-gate P30 --require` in the same commit. `intent.md` requires the gate: you walk the reader on
  phone, iPad and desktop.
- Run `promote-deferred` and `defer-job` as listed, then `validate`.
- Commit as `chore(P30): P30.DECOMP …`, attributed to Claude Opus 5.5.
- Continue the loop in `auto`. It stops first at S1's wave `pending`.

## Verification

- `validate` passes.
- `next` points at the first cut slice.
- No middle slice has a `plan.md`.
- The product diff is empty: `git diff --stat -- web/ server/ cli/ plugin/ mcp-server/`.
- `phase-section P30` stays under budget.

## Dispatch

slice=P30.DECOMP
phase=P30
kind=decomposition
risk=high
attempt=1
route=high
reason=kind decomposition
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
