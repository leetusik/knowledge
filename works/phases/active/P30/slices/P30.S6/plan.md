# P30.S6 — Library migration into books (tool plus local proof)

## Goal

Build an idempotent binding tool that puts the existing library into the book model through S2's
`PUT /api/books/{project}/{book}`, following P29.S1's book map and reconciled against what is on
`origin/main` today. Prove it locally against a copy of the `origin/main` library:
- every existing `/documents/{id}` and `/@{org}/{project}/{slug}` URL resolves before and after;
- no document file is rewritten.

**The production run is not this slice's.** The orchestrator runs it after deploy, on the operator's word.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S6**.
- `works/phases/active/P29/slices/P29.S1/result.md` → *The book map* (4 books, 33 chapters, 8 loose
  documents).
- P29 *S1 Phase or slice → chapter* and *Compatibility*, via `phase-section P29 Decisions`.
- `works/phases/active/P30/phase.md` → `## Notes for later slices`, plus `topics/notes-server.md` (S2 `PUT`
  semantics: 422 for an unknown or foreign document, 409 for a document bound twice, no commit on a no-op;
  documents named by path, OQ1) and `topics/notes-later.md`.
- The library: `git fetch origin`, then `git ls-tree -r --name-only origin/main docs/` and
  `git show origin/main:<path>`. **Never pull or merge.** Documents are `docs/<project>/<date>-<slug>.{html,md}`,
  and past versions are under `docs/.versions/…`.

## Approach (pinned)

1. **Reconcile:** list every document on `origin/main`, compare with P29.S1's map (made at `ed8dba0`), and
   place every document published since.
   - It becomes a chapter where it obviously belongs to a mapped book (a phase explainer of a mapped
     project). Otherwise it stays loose.
   - Record each placement in the map file with a one-line reason.
   - An ambiguous placement is decided conservatively (loose), recorded on `## Operator Questions` as
     `decided: …` (the run is unattended).
2. **Map file:** check in the binding as data, `scripts/migrations/p30_books.json` or similar:
   `project → book → {title, chapters: [{key, title, variants: {lang: rel_path}}]}`, exactly what `PUT`
   takes. Include the 8 loose documents as an explicit "stay loose" list, so the tool asserts it never
   binds them.
3. **Tool:** `scripts/migrate_books.py` (or a `server/` CLI entry, whichever matches how other operator
   scripts run).
   - `--dry-run` (the default) prints every `PUT` it would make and the diff against the server's current
     books.
   - `--apply` makes the calls, using an API base URL and key from the environment or arguments. Never
     hard-code a key.
   - **Idempotent:** a second `--apply` makes no change, since S2's `PUT` makes no commit on a no-op.
   - **Never** rewrites a document file and never calls the document publish endpoint.
   - Before and after, it records every document id, its `/documents/{id}` URL and its
     `/@{org}/{project}/{slug}` URL, and asserts they all resolve with the same content hash.
4. **Local proof (core test, the migration's link preservation):**
   - Build a throwaway local content root from `origin/main`'s `docs/` (copy the files out with `git show`
     or `git archive`; never check out or merge into the working tree).
   - Run the server against it locally, reindex, and run the tool `--dry-run` then `--apply` twice.
   - Assert: every URL resolves before and after, document files are byte-identical (hash every file
     before and after), the books exist as mapped, and the second run is a no-op.
   - Make this a pytest that runs on a small synthetic subset (a few documents across two books, with one
     html and one md), so it stays fast and committed. Run the full `origin/main` proof once by hand and
     paste its summary (counts, zero failures) into `result.md`.
   - Delete the throwaway root afterwards. It must not land in the repo.
5. **Runbook:** append the exact production steps (env vars, dry run, review the diff, apply, verify) to
   `topics/migration-runbook.md` for the orchestrator.

## Out of scope

- Running against production or `knowledge.hi2vi.com`.
- Changing any document.
- Converting html to native.
- Web.

## Validation

- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`.
- The full local `origin/main` proof summary.
- `python3 scripts/skills_parity.py` fails as known (A3, S7).
- `python3 scripts/workflow.py validate`.
- `git status` shows no stray library copy.

## Notebook

- `phase.md` is at about 39 KB of the 41 KB budget, a soft cap. Keep every Doc impact line to one short
  line (≤ 120 characters) and put the detail in `topics/doc-impact-detail.md`. Move any long note to
  `topics/`.
  - Doc impact: `operations.md` (the migration runbook) and a `decisions.md` ADR line.
  - Notes for S7 and the pre-gate step.
  - `## Now`.
- `result.md`: verdict block first.

**Unattended run:** settle placements and open choices conservatively. Record them on
`## Operator Questions` as `decided: …`, and return `done`. Return `blocked` only for a real impediment.

## Dispatch

slice=P30.S6
phase=P30
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
