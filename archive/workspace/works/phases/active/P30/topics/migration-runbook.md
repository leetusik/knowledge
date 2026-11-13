# P30 library migration — the production runbook (from P30.S6, for the orchestrator's pre-gate step)

Linked from `phase.md` → `## Notes for later slices`. The tool is `scripts/migrate_books.py`; the binding
is `scripts/migrations/p30_books.json` (P29.S1's map, reconciled against `origin/main` `ed8dba0` on
2026-10-21: 42 documents, none new). The local proof and its numbers are in `slices/P30.S6/result.md`.

**When:** step 3 of *Before the gate* (`topics/notes-later.md`): after `main` is pushed (kb-api commits
integrated first) and Production Deploy is green, **on the operator's word**. Never before the deploy:
`PUT /api/books` does not exist on the old server.

## What it does and never does

- Reads every document and book, plans one `PUT /api/books/{project}/{book}` per mapped book, and
  checks every reader URL before and after.
- Never calls `POST /api/documents`, never sends a document body, never binds a "loose" document.
- A mapped book that already exists (say `/explain` placed a chapter after the deploy) is **merged**:
  the server's fields, chapters and order are kept, and only missing chapters/variants are added. Any
  disagreement refuses the whole run, exit 2, before any write.
- Each `PUT` commits only `docs/.books/<project>/<book>.json` (`docs(<project>): update book <slug>`),
  pushed to `origin/main` by the box like any kb-api write.

## Steps

1. **Reconcile again.** `git fetch origin`, then list documents published since the map:
   `git diff --name-only --diff-filter=A ed8dba0 origin/main -- docs/ | grep -E '^docs/[^/.][^/]*/[0-9]{4}-'`.
   A new document is fine: the tool lists it as `unmapped (stays loose)`. If it plainly belongs to a
   mapped book (a phase explainer of `glide-ilab`), add it to the map (with a `reason`) and re-run
   `uv run pytest -q tests/test_migrate_books.py` before going on. If it is ambiguous, leave it loose.
2. **Credentials, from the environment only** (never on the command line, never echoed):
   ```sh
   export KB_API_BASE_URL=https://knowledge.hi2vi.com
   read -rs KB_API_TOKEN && export KB_API_TOKEN          # the master bearer (tenant #1's library)
   export KB_LOGIN_EMAIL=<operator email>
   read -rs KB_LOGIN_PASSWORD && export KB_LOGIN_PASSWORD # the tool logs in and out for the /app checks
   ```
   (Or `KB_SESSION_TOKEN` instead of the email and password.)
3. **Dry run** (the default; writes nothing):
   `uv run python scripts/migrate_books.py --report /tmp/p30-books-dry.json`
   Expect: `documents on the server: 42` (more if step 1 found new ones), four `[create]` books
   (`changple5/curriculum` 20 chapters, `glide-ilab/phases` 4, `knowledge/maintainer-guide` 5,
   `vocky/maintainer-guide` 4), `loose (never bound): 8`, no `CONFLICT`, and
   `pre-flight: 167 URL checks, 0 not resolving` (42 × api + `/documents/{id}` + `/@org/…`, plus 41 html
   raw reads). **Review every printed `PUT` body and the `unmapped` lines with the operator's brief.**
4. **Apply:** `uv run python scripts/migrate_books.py --apply --report /tmp/p30-books-apply.json`
   Expect four `PUT …: 200 created=True committed=True`, then `verify: 167 URL checks after; 0 failure(s)`,
   exit 0.
5. **Verify:**
   - run step 4 again: every book `[unchanged]`, no `PUT`, exit 0 (the idempotence check);
   - `git fetch origin && git log origin/main -5 --name-only`: four kb-api commits, each touching only
     `docs/.books/…json`. Integrate them into local `main` before the next push (the kb-api wrinkle);
   - spot-check with `curl`, not Python `urllib`: two `/documents/{id}` and two `/@{org}/…` URLs.
6. Keep both reports with the slice that records the run.

## If it goes wrong

- **Exit 2:** refused before any write (bad map, a conflict, a URL not resolving in the pre-flight, or
  missing credentials). Nothing changed; read the printed reason.
- **Exit 1:** a `PUT` failed (the run stops at the first one) or a check differs after. Documents are
  never touched, so the worst case is a partial set of book manifests. Undo by reverting the kb-api
  `docs(<project>): update book …` commits on `origin/main` and running `POST /api/reindex` on the box
  (manifests are canonical; the book tables are derived).
- **Every call 403s at the edge** (an HTML body): the edge filters user agents. The tool sends
  `kb-migrate-books/1`; report it rather than spoofing a browser.
