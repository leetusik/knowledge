# P28.S1 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Graph server groundwork: `canonical_path` on doc nodes.** Executor: `slice-executor-high`. Server only — **touch nothing under `web/`**; the engine half is `P28.S6`'s.

Read `works/phases/active/P28/phase.md` first (the notebook): the `## Decisions` line "Doc node URL form", the `## Notes for later slices` entry tagged `(from P28.DECOMP, for P28.S1)`, and the inventory row for this slice. This plan does not restate them.

## What to build

`server/graph_api.py`'s `build_tenant_graph` emits each doc node's `"url": f"/documents/{d['id']}"` (`:87`, `:127`). **Add `canonical_path` beside it** — the document's pretty public path `/@{org_slug}/{project}/{slug}`, or `null`. `url` is unchanged; nothing is replaced. Both graph payloads (member and public) carry the new key; which one the engine *prefers* is S6's decision and is already settled in the notebook (public only).

Three conditions must all hold or the value is `null`:

1. the owning tenant has claimed an org slug (`tenants.slug` is nullable with no backfill);
2. the row **owns** its pretty path — the P25.F1 round-trip guard (below);
3. the row actually has a non-empty `project` and `slug` (never assemble a path with an empty segment).

Reuse, do not re-derive: `documents_api._canonical_path(org_slug, doc)` already builds the string and already answers `None` for a slug-less owner. Import it or lift it to a shared home — your call, but state which and why in `result.md`; do not write a second copy of the format.

### The round-trip guard, batched — verify this argument before you rely on it

`documents_api._owns_its_canonical_path` costs **one `find_latest_document_by_slug` read per document**, and `build_tenant_graph` sees up to `MAX_DOC_NODES = 2000` rows. Calling it per node is 2000 extra queries on a page load. Skipping it is not an option: advertising a superseded duplicate's pretty path would 307 an already-shared link to a **different document** (that is exactly what P25.F1 fixed).

There is an exact zero-query batch, and the reason it is exact is worth checking yourself rather than taking from me:

- `db.find_latest_document_by_slug` (`server/db.py:294`) resolves `(project, slug)` with `ORDER BY date DESC, id DESC LIMIT 1`.
- `db.list_documents` (`:367`) — the single windowed fetch `_build_graph` uses — orders by **the same** `date DESC, id DESC` and takes `LIMIT n OFFSET 0`.
- So the window is a **prefix** of the global newest-first order: if any row of a `(project, slug)` group is in the window, that group's newest row is in the window too, and it is the group's **first occurrence** in the window.

Therefore: walk the window once in order, and the first row seen for each `(project, slug)` is precisely the row the DB primitive would return. Every later occurrence is a superseded duplicate and gets `null`. No extra query, and the truncated case (>2000 docs) stays correct because truncation drops the *oldest*, never a group's newest.

Two things to confirm while you check it: the `projects` allowlist on the public path narrows by **project name**, and `project` is part of the key — so the allowlist cannot hide a group's newest row from the window (satisfy yourself that this holds); and both paths are single-tenant, so the primitive's `tenant_id` scoping is already matched by the window's.

If your reading finds a case where the prefix argument fails, **do not silently fall back to per-row queries** — say so in `result.md`, pick the correct behaviour (emitting `null` where ambiguous is always safe), and record the reasoning as a `## Decisions` line in the notebook.

### Signature and call sites

`build_tenant_graph(docs)` is a pure function with existing direct callers in the test suite. Extend it with a **keyword-only, defaulted** parameter (e.g. `*, org_slug: str | None = None`) so every existing call keeps working unchanged and a caller that passes nothing gets `canonical_path: None` on every node.

Both call sites live in `_build_graph`'s callers, and each already has the slug in hand for free:

- member path (`graph_api.py:283`) — `ctx.tenant.slug`, already loaded on the session tenant;
- public path (`:305`) — `owner.slug`, already fetched for the graph's own `canonical_path`.

Pass it through `_build_graph`. **Add no new accounts-plane call and no new Postgres read** — that is the whole reason both slugs are already resolved at those two lines.

R05 §4.6 also states the public payload need **not** distinguish public from private documents (the public endpoint already filters to public projects), so **add no visibility field**.

## Tests

Extend `tests/test_graph_api.py` — **no new test file, no new fixtures**. The workspace rule is core behaviour only, and the core behaviour here is the guard. Three minimal cases:

1. a normal doc under a slug-claiming tenant carries `canonical_path == "/@{slug}/{project}/{slug}"` and still carries its unchanged `url`;
2. a tenant with **no** org slug gets `canonical_path: None` on every node (and nothing else about the payload changes);
3. **the guard** — two rows sharing `(project, slug)` at different dates: the newer carries the path, the older carries `None`.

Keep them in the file's existing idiom (`_seed`, `_by_id`, the Postgres-gated `documents_client`). Find how a tenant claims its slug in the existing suites (`tests/test_public_read.py` and `web/tests/set-tenant-slug.test.ts` point at the surface) rather than writing to the accounts plane by hand. Tag/missing nodes have no `canonical_path` at all — do not give them a `null` key unless the existing node shape makes that natural; say which you chose.

## Validation

1. `uv run pytest tests/test_graph_api.py tests/test_public_read.py`
2. then the full suite: `uv run pytest`

These tests are **Postgres-gated** (they skip without `KB_TEST_DATABASE_URL` / `DATABASE_URL`). A skipped run is **not** a pass: if the gate skips, say so plainly in `result.md`, state what you could and could not verify, and do not claim the guard is tested. Note the two pre-existing gated failures already on file — **D15** (`test_documents_api` projection format key) and **D21** (`test_documents_list_detail_and_project_bridge`) — as known, not as your regressions; do not fix them here.

No browser work in this slice (nothing user-visible changes yet) and no `pnpm` gates (no `web/` file is touched).

## Before you finish

- Append **one** `## Doc impact` line to `works/phases/active/P28/phase.md` — the graph payload's new `canonical_path` key is durable API truth (`api.md`, and `backend.md` for the batched guard). Run **no** `doc-new-version`.
- Edit the notebook as the contract requires: consume the `(for P28.S1)` note (remove it), record any decision you had to make under `## Decisions`, add a note for `P28.S6` stating the **exact key name, its null semantics, and the shape it emits**, and rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first.

You never commit and never transition slice or phase status.
