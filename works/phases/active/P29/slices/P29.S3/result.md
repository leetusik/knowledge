# P29.S3 — result

- status: done
- tier: high
- model: opus
- effort: medium
- summary: Settled reader state and spaced-repetition review as data contracts in phase.md. All durable state is in Postgres, keyed by user_id and (tenant, project, document stem) plus a cross-language unit. Settings are a per-device kb_reader cookie, and anonymous readers save nothing. The schema is seven tables in one additive alembic revision. Re-anchoring runs on the server, with block and orphan statuses. FSRS (py-fsrs, MIT) runs on the server with two-button Again/Good ratings, and a quiz's first attempt seeds its card. The routes live under /app/reader/ plus one beacon handler, with per-user isolation and a readability re-check on every call. Three operator questions were added (Q6–Q8).
- files_changed: works/phases/active/P29/phase.md; works/phases/active/P29/slices/P29.S3/result.md
- validation: `python3 scripts/workflow.py validate` — pass; `git status --porcelain` — only phase.md, this slice's folder and the engine's generated files; scratch dir `p29-s3/` — never created (no probe was needed), and the scratchpad draft file was removed
- deviations: (1) The plan's chapter-variant key `(tenant, project, book, key, lang)` is replaced as the **row key** by the document stem, with `unit` (`c:<book>/<key>` | `d:<doc>`) carrying the chapter grouping. The stem identifies the same variant, and state also survives binding a loose document into a book. The reasons are in §2. (2) The loose-document key `(project, slug)` is rejected (§2). (3) S2's quiz payload is amended: `doc_slug` → `doc`. No other deviations.
- doc_impact: none
- operator_need: none (Q6–Q8 are on phase.md's `## Operator Questions` for DECOMP2's planning gate)

The contracts are in `works/phases/active/P29/phase.md`:
- `## Decisions` → *Reader state and review — data contracts (P29.S3)*;
- Operator Questions 6–8;
- the notes `(from P29.S3, for P29.DECOMP2)` and `(from P29.S3, for P30's DECOMP)`;
- `## Now`.

This file holds the evidence and the alternatives that were rejected.

## 1. Facts verified in the code (2026-10-18)

- **`server/persistence/models.py`:**
  - The tables are `users`, `tenants` (`slug` nullable, unique), `tenant_members` (`role` text),
    `projects` (unique `(tenant_id, name)`, `visibility` default `'private'`), `project_credentials`,
    `auth_tokens` and `usage_events`.
  - FKs to `users` and `tenants` are `ON DELETE CASCADE`.
  - **No per-user state table** exists.
  - `alembic/versions/` runs `0001`–`0005`, and the newest is `0005_tenant_slug.py`. Confirmed.
- **`server/accounts/auth.py`:** `require_user` and `optional_user` both resolve to
  `AuthContext(user, tenants[0])`, and `optional_user` returns `None` on every miss. Confirmed.
- **`server/documents_api.py`:**
  - `_resolve_readable_doc` is the member fast-path (scoped to `ctx.tenant.id`), with a public fallback
    through `_is_publicly_readable`. That check is the legacy-mode guard, then the registry-less-owner
    guard, then `project.visibility == "public"`, looked up by project **name**.
  - Every miss is a 404.
  - The reader-state readability re-check copies this predicate.
- **No route deletes an account, a project or a tenant.**
  - The only deletes are `DELETE /app/documents/{id}` (plus the metered `/api` route) and credential
    deletes.
  - So the account and org cascades are FK insurance. Document deletion is the one live purge path, and
    it must be done in the application, because documents live in SQLite and on disk.
- **Duplicate slugs exist.** `_owns_its_canonical_path` documents that "a re-publish *without*
  `new_version` computes a different `rel_path` … and inserts a second row". `(project, slug)` is
  newest-wins, so keying state on it would silently move a reader's state onto a different document.
  That is why the key is the stem.
- **Web:**
  - `web/src/lib/rail-cookie.ts` holds the cookie-first rationale (first paint, no `localStorage`).
  - `localStorage` is used nowhere.
  - `sessionStorage` is used only in `graph-canvas.tsx`.
  - The `knowledge_session` cookie is `SameSite=Strict` and `httpOnly`. A same-origin
    `navigator.sendBeacon` carries it, so the beacon handler can unseal it.
  - `auth-guards.ts` → `requireIdentity` redirects to a bare `/login`, which is D32.
  - The `web/src/app/api/` route handlers are auth login, signup and logout, plus the two raw relays.
    Confirmed.
- **P28's `## Doc impact`** (grep of L608–838) says the console root carries `data-kb-scheme="auto"`,
  following the OS dark mode, while public surfaces "stay light in OS dark mode". The reader's
  `System` theme default is therefore a deliberate exception, and it is flagged to DECOMP2.
- **D18 and D32** are both still `deferred` (`works/deferred/open/`).

## 2. Decisions — evidence and rejected alternatives

**Stores per reader.**
- **Postgres keyed by `user_id`.** This is the only durable per-user store, and SQLite is disposable
  (S1). A member and a signed-in non-member share one model. Membership only changes readability, which
  is re-checked on every call.
- **The anonymous reader** is Operator Question 6:
  - Rejected: browser storage plus a merge on sign-in. It is a second store and a merge protocol, and
    it is a `localStorage` exception the codebase avoided on purpose.
  - Rejected: a cookie per position. The 4 KB limit, and the cookie would ride on every request.
- **Settings stay a per-device cookie.**
  - Rejected: syncing them. Text size is legitimately per device. Syncing would also need a cookie
    anyway for the first paint, so there would be two sources of truth.

**Keys.**
- **The stem** `<date>-<slug>`:
  - it is unique per document;
  - it is re-derived by a reindex;
  - it survives `html → native` (S1: archive, alias and `document_versions` are stem-based);
  - it survives a later binding into a book.
- **Rejected:**
  - `(project, slug)`: duplicates, see §1.
  - `documents.id`: S1 forbids it.
  - `(book, key, lang)` as the row key: it breaks when a loose document is bound into a book, which is
    exactly what P30 does to the 42 documents. If reader state shipped first, every row would need
    re-keying.
- **`unit` is denormalized** so that chapter-level grouping (finished-any-variant, one review card per
  quiz item across languages) is a plain index lookup.

**"Finished".**
- A 0.95 fraction, or the end sentinel, or the explicit control. This works the same for native, md
  and legacy, because the legacy bridge reports `fraction`.
- Rejected: "all quizzes answered". Legacy chapters have no saved quizzes, and the rule would block
  progress on optional work.
- Rejected: "per variant". The operator reads a chapter in one language, and book progress should not
  double-count.

**Notes.** A highlight may carry a note, or a block note stands alone; this follows S2's anchor unit.
- Rejected: notes only on highlights. A reader wants to comment on a diagram, which has no text to
  select.

**Anchoring on the server.**
- **One implementation, in Python.** Lists, review cards and the reader all get statuses from it, and
  the first paint is correct with no client re-anchoring jump.
- Rejected: anchoring in the client DOM. Every list would need the chapter opened, and there would be
  two implementations.
- **The risk is offset agreement** between the Python projection and the TS-rendered text. It is
  covered by extending S2's conformance fixtures, which is a P30 core test.
- **Ladder and orphans** follow the W3C Web Annotation layered selectors (TextQuote + TextPosition)
  and Hypothesis's fuzzy anchoring and orphan tab:
  - Hypothesis's TextQuoteSelector keeps a 32-character prefix and suffix, which is why ours is ≤ 32;
  - orphans are shown struck through in an "Unanchored" tab, never deleted.

**Language switch.** A quote does not translate, so painting a Korean highlight onto English text is
impossible. The block marker keeps the highlight discoverable without inventing a mapping.

**FSRS.**
- **py-fsrs** is MIT. It offers `desired_retention` 0.9, learning steps (1m, 10m), relearning (10m),
  `maximum_interval` 36500 and fuzzing. It works in UTC only. The optimiser is an optional `fsrs[optimizer]`
  extra. Ratings are Again, Hard, Good and Easy, and `to_json`/`from_json` serialization is available.
- **ts-fsrs** is MIT, implements FSRS v6, and has a `repeat()` that previews all four ratings.
- **Anki** has supported FSRS since 23.10. Its default desired retention of 90% is "a good balance".
  It advises learning steps under a day ("10m or 30m are good"), which is why we use a single 10m step.
  It warns that pressing Hard on a failure inflates intervals: a reason to keep only Again/Good on a
  surface where the grade is objective.
- **The benchmark caveat.** srs-benchmark compares FSRS against a *trainable SM-2 variant*; plain SM-2
  produces no recall probabilities. So we claim no precise efficiency figure, only that FSRS models
  retention and SM-2 does not. SuperMemo disputes the benchmark, which does not affect a choice limited
  to free, open-source options.
- **Running it on the server** keeps one runtime, server-trusted state and the server's clock. The
  previews come from the server, so ts-fsrs is not needed.

**Two buttons.** In the review, the grade of a choice or cloze item is objective, and recall in the
reader is already got/missed. So 4 buttons would add Hard/Easy decisions with nothing to inform them.
Rejected: 4 buttons, which is FSRS's native set.

**Daily boundary at 04:00 local.** This follows Anki's "next day starts at" convention, from prior
knowledge; the fetched deck-options page did not state the default hour. It lives in `reader_profiles`
and is editable.

**Resume conflicts.** E-book readers differ:
- Kindle Whispersync offers to jump to the "furthest page read" (prior knowledge, not fetched).
- KOReader-compatible clients offer prompt or latest strategies, and a Kavita guide warns that
  automatic progress sync can undo progress.
- Our choice: last write wins for the position, with a **monotonic `max_fraction` and `finished`**.
  This avoids the "sync undid my progress" failure for progress, while the resume point follows the
  device used last.
- Rejected: a conflict prompt. There is no offline mode, so true conflicts are rare.

**Highlights in review.** Readwise-style daily review resurfaces highlights for re-reading (prior
knowledge, not fetched). Our design is an opt-in toggle, a resurfacing card and an Again/Good self-rating.
- Rejected: every highlight becomes a card. This floods the queue.
- Rejected: reader-written recall cards from notes. That is a new authoring surface, out of scope for v1.

**Deletion and access loss.**
- When access is lost, the rows are hidden and kept. An accidental private toggle must not destroy
  readers' work, and the constant 404 makes "hidden" indistinguishable from "deleted".
- A document delete purges the rows (Operator Question 8).

## 3. Sources

- py-fsrs README (MIT; defaults; optimiser extra; UTC): https://github.com/open-spaced-repetition/py-fsrs
- py-fsrs on PyPI: https://pypi.org/project/fsrs
- ts-fsrs README (MIT; FSRS v6; `repeat` previews): https://github.com/open-spaced-repetition/ts-fsrs
- The Open Spaced Repetition organisation: https://github.com/open-spaced-repetition
- r-fsrs (FSRS-6, 21 parameters): https://github.com/open-spaced-repetition/r-fsrs
- Anki manual, deck options (FSRS since 23.10, 90% retention, steps under a day, the Hard misuse):
  https://docs.ankiweb.net/deck-options.html
- srs-benchmark caveats (SM-2 gives no probabilities; the trainable variant):
  https://forums.ankiweb.net/t/fsrs-vs-sm2-in-2-seperate-profiles/52171,
  https://ftp.fau.de/cran/web/packages/srsbench/readme/README.html
- The SuperMemo dissent: https://supermemo.com/en/blog/supermemo-is-better-than-fsrs-by-far
- Hypothesis: fuzzy anchoring, https://web.hypothes.is/blog/fuzzy-anchoring/; orphans,
  https://web.hypothes.is/blog/showing-orphaned-annotations; unanchored annotations,
  https://web.hypothes.is/help/what-are-unanchored-annotations/; selectors, https://web.hypothes.is/?p=1317
- W3C robust anchoring slides: https://www.w3.org/2014/04/annotation/slides/RobustAnchoring.pdf
- Orphan rates: https://arxiv.org/pdf/1512.06195
- KOReader sync behaviour (indirect): https://wiki.kavitareader.com/guides/3rdparty/koreader/,
  https://www.mobileread.com/forums/showthread.php?p=4326913
- From prior knowledge, not fetched this session: Kindle Whispersync's "furthest page read" prompt;
  Readwise Daily Review; Anki's 04:00 day boundary.

## 4. Commands run

- `grep`/`sed` over `server/persistence/models.py`, `server/accounts/auth.py`,
  `server/documents_api.py`, `server/db.py`, `web/src/lib/{rail-cookie,session,auth-guards}.ts`,
  `web/src/lib/knowledge/client.ts`, `web/src/app/api/`, `alembic/versions/`, and P28 `phase.md`
  L608–838.
- Reads of `works/deferred/open/D18` and `D32/deferred.json`: both `deferred`.
- Web: 4 searches and 3 fetches (py-fsrs, ts-fsrs, Anki deck options).
- Edits to `phase.md` were scripted in Python, appending to the append-only sections and rewriting
  Notes and Now. The `## Slices` block was untouched.
- `python3 scripts/workflow.py validate`; `git status --porcelain`.

Dead ends: none. No throwaway probe was needed, because the question was design over verified code, not
corpus measurement.
