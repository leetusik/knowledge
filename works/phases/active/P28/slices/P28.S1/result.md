# P28.S1 — result

- **status**: `done`
- **summary**: `/app/graph` doc nodes now carry an additive, nullable `canonical_path`
  (`/@{org}/{project}/{slug}`) beside their unchanged `url`, on both the member and public
  payloads, with the P25.F1 round-trip guard batched to zero extra queries by exploiting that the
  windowed `list_documents` order is a prefix of `find_latest_document_by_slug`'s. Gated pytest ran
  for real: 128 passed, 0 failed, 0 skipped.
- **files_changed**:
  - `/Users/sugang/projects/personal/knowledge/server/graph_api.py`
  - `/Users/sugang/projects/personal/knowledge/tests/test_graph_api.py`
  - `/Users/sugang/projects/personal/knowledge/tests/test_public_read.py`
  - `/Users/sugang/projects/personal/knowledge/plugin/templates/kb/server/graph_api.py` (parity mirror)
  - `/Users/sugang/projects/personal/knowledge/plugin/templates/kb/tests/test_graph_api.py` (parity mirror)
  - `/Users/sugang/projects/personal/knowledge/plugin/templates/kb/tests/test_public_read.py` (parity mirror)
  - `/Users/sugang/projects/personal/knowledge/works/phases/active/P28/phase.md`
  - `/Users/sugang/projects/personal/knowledge/works/phases/active/P28/slices/P28.S1/result.md`
- **validation**:
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb .venv/bin/python -m pytest tests/test_graph_api.py tests/test_public_read.py -q` — **PASS** (17 passed, 0 skipped)
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb .venv/bin/python -m pytest -q` — **PASS** (128 passed, 0 failed, 0 skipped)
  - `python3 scripts/plugin_parity.py` — **PASS** (failed first; fixed by mirroring — see deviations)
  - `python3 scripts/workflow.py validate` — **PASS** (pre-existing warnings only; none from P28)
- **deviations**: two, both additive — the parity mirror under `plugin/templates/kb/` (a CI gate the
  plan's file list omitted) and two assertions added to an existing `tests/test_public_read.py` test
  to cover the second call site. Detail below.
- **doc_impact**: one line appended to `phase.md` — `api.md + backend.md: /app/graph doc nodes now
  carry an additive, nullable canonical_path (/@{org}/{project}/{slug}) beside the unchanged url
  (/documents/{id}) on both the member and the public payload — null for a slug-less tenant, an empty
  project/slug, or a superseded duplicate — with the P25.F1 round-trip guard batched to zero extra
  queries (the windowed list_documents order is a prefix of find_latest_document_by_slug's);
  build_tenant_graph gains a keyword-only, defaulted org_slug. Mirrored into plugin/templates/kb/.
  (P28.S1)`. No `doc-new-version` run.

---

## What landed

`server/graph_api.py`, four places:

1. **`build_tenant_graph(docs, *, org_slug: str | None = None)`** — keyword-only and defaulted, so
   every existing direct caller (the test suite included) is untouched and gets `canonical_path:
   None` on every node. Each doc node's dict gains `"canonical_path"` immediately after its
   unchanged `"url"`.
2. **`_build_graph(..., org_slug: str | None = None)`** threads it to `build_tenant_graph`.
3. **Member endpoint** passes `org_slug=ctx.tenant.slug` (already on the session tenant).
4. **Public endpoint** passes `org_slug=owner.slug if owner is not None else None` (`owner` is
   already fetched above that line for the graph-level `canonical_path`).

No new accounts-plane call, no new Postgres read, no new SQLite read, no visibility field (R05 §4.6).
`url` is untouched everywhere.

### Reuse, not a second copy of the format

`graph_api` now imports `documents_api._canonical_path` alongside the `_resolve_project_name` /
`get_conn` it already imports from that module — so the import seam is the one the file established,
not a new one, and no lift-to-a-shared-home was needed. **Why import rather than lift:** the function
is four lines whose only job is the format string, its two other users are both in `documents_api`,
and moving it would have rewritten three call sites plus the parity mirror for no gain. One builder
means a future change to the pretty-path shape cannot fork between the document and graph surfaces.
It is called as `_canonical_path(org_slug, {"project": project, "slug": slug})` — it takes a dict, and
the graph's own coerced strings are passed rather than the raw row, so the coercion happens once.

### The round-trip guard: I checked the prefix argument, and it holds

Verified in the source, not taken from the plan:

- `db.find_latest_document_by_slug` (`server/db.py:294`) — `WHERE project = ? AND slug = ?`
  (+ `tenant_id`), `ORDER BY date DESC, id DESC LIMIT 1`.
- `db.list_documents` (`server/db.py:367`) — the single windowed fetch `_build_graph` uses —
  `ORDER BY documents.date DESC, documents.id DESC LIMIT ? OFFSET 0`.

Same ordering expression, and it is a **total** order (`documents.id` is `INTEGER PRIMARY KEY`, hence
unique), so there is no tie the two queries could break differently. With `OFFSET 0` the window is a
**prefix** of the global newest-first order. Therefore if any row of a `(project, slug)` group is in
the window, that group's newest row is too, and it is the group's **first** occurrence in the window.
Walking the window in order and taking the first row seen per `(project, slug)` is *exactly* what the
DB primitive would return — zero extra queries instead of up to `MAX_DOC_NODES = 2000`.

The two things the plan asked me to confirm while checking:

- **The allowlist cannot hide a group's newest row.** Both narrowing filters — `project = ?` (member
  path) and `documents.project IN (...)` (the public path's `projects` allowlist, `db.py:_filtered`)
  — predicate on **project name**, and `project` is the first component of the group key. Every row of
  a `(project, slug)` group therefore shares the same project name and the filter's verdict is the
  same for all of them: a group is either wholly in the window's candidate set or wholly absent.
  It can never admit an older row while excluding its newer sibling. (The `tag` filter, which is *not*
  part of the key and **could** break this, is never passed by `_build_graph`.)
- **Tenant scoping matches.** `_build_graph` always passes a concrete `tenant_id` (`str(ctx.tenant.id)`
  on the member path, `str(org_id)` on the public one), and `documents_api._owns_its_canonical_path`
  scopes the primitive by `doc["tenant_id"]` — the same tenant, since the window was selected by it.
- **Truncation stays correct.** `limit = min(total, MAX_DOC_NODES)` with `OFFSET 0` keeps the
  *newest* rows; truncation only ever drops a group's older members, never its newest.

No case was found where the argument fails, so no fallback to per-row queries exists in the code —
there is only the batch. The whole argument is written into `build_tenant_graph`'s docstring so the
next reader does not have to re-derive it, and the short form is in `phase.md` → `## Decisions`.

### Two conditions beyond the guard

- **Slug-less owner** — `_canonical_path` already answers `None` for a falsy `org_slug`, so the
  slug-less case needs no second check; passing `org_slug=None` makes every doc node `null`.
- **Empty `project`/`slug`** — guarded explicitly (`bool(project and slug)`), so a path with an empty
  segment is never assembled. Such a row is also excluded from the `seen_groups` bookkeeping, since
  `("", "")` is not a meaningful group.

### The node-shape choice

**Tag and missing nodes carry no `canonical_path` key at all.** Their existing shape is minimal —
`{id, type, title}` plus the `degree` added later; they do not carry `url`, `date`, `project` or
`tags` either. Giving them a `null` key would have been the odd choice, not the natural one. The
contract is recorded for `P28.S6` in `phase.md` → `## Notes for later slices`, which tells the engine
to read it as `node.canonical_path ?? null`.

## Tests

Three cases added to `tests/test_graph_api.py`, in the file's existing idiom (`_seed`, `_by_id`, the
Postgres-gated `documents_client`), no new test file and no new fixtures:

1. `test_doc_nodes_carry_canonical_path_beside_unchanged_url` — a slug-claiming tenant's node carries
   `/@{org}/alpha/a` **and** its unchanged `/documents/{id}`.
2. `test_doc_nodes_have_null_canonical_path_without_an_org_slug` — every doc node `null`, `url`
   unchanged, the graph-level `canonical_path` still `null`.
3. `test_canonical_path_round_trip_guard_only_the_newest_duplicate_owns_it` — **the guard**: two rows
   at `(alpha, dup)` dated `2026-01-01` and `2026-02-01`; the newer carries the path, the older
   carries `None`, and both keep distinct exact-row urls.

A tenant claims its slug through the real `PATCH /app/tenant` surface via `_set_slug`, **imported from
`tests/test_public_read.py`** rather than re-written — the slug is globally unique so it must be freshly
generated per call, and that helper already encodes it. Nothing is written to the accounts plane by hand.

## Deviations from `plan.md`

1. **Parity mirror (required, not optional).** The plan scoped the slice to `server/graph_api.py` +
   `tests/`. `scripts/plugin_parity.py` is a CI gate (`.github/workflows/plugin-ci.yml`) whose
   `shipped_dirs` completeness + byte-identical check covers `server/**` and `tests/**`, and it
   **failed** on the first server edit (`FAIL — [identical] byte drift: server/graph_api.py`). Every
   prior server slice (P18/P19/P21/P23/P24/P25) mirrored, and `docs/current/backend.md` records the
   rule. So all three edited files were copied byte-for-byte into `plugin/templates/kb/` and the gate
   is green again. This is still a server-only slice — nothing under `web/` was touched.
2. **Two assertions added to an existing `tests/test_public_read.py` test.** The plan's three cases all
   exercise the **member** endpoint; the **public** endpoint is a second call site with its own slug
   expression (`owner.slug`). Rather than add a fourth test or a fixture, two assertions went into the
   existing `test_public_graph_is_org_scoped`: before the slug is claimed the public doc node's
   `canonical_path` is `null`, and after `_set_slug` it is `/@{org}/pub/p` with `url` still
   `/documents/{id}`. The phase inventory already listed `tests/test_public_read.py` as this slice's,
   "if the public payload moves" — it moved.

## Validation detail

The suite is Postgres-gated and my shell had no DSN, so per `docs/current/qa.md:478` I started the
documented disposable instance and ran against it:

```
docker run -d --rm --name kb-pg -e POSTGRES_PASSWORD=kb -e POSTGRES_USER=kb -e POSTGRES_DB=kb \
  -p 55439:5432 postgres:17
KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb .venv/bin/python -m pytest -q
```

- targeted: `17 passed, 1 warning in 2.42s` (the warning is the pre-existing starlette/httpx
  deprecation, unrelated).
- full suite: **`128 passed, 1 warning in 9.32s`** — **0 failed, 0 skipped**. The gate really ran;
  this is not a skipped-and-called-green result.

The container was stopped afterwards (`docker stop kb-pg`; it was started `--rm`), so the machine is
left as it was found.

**The two "known pre-existing gated failures" in the plan did not reproduce, and they are the same
stale job.** D15 and D21 both describe
`tests/test_documents_api.py::test_documents_list_detail_and_project_bridge` failing because `format`
was missing from `_LIST_KEYS`. That test was collected and **passed**: `format` (and `version`) were
added to `_LIST_KEYS` in P23 (`062c041 feat(server): add version history read routes…`), which closed
the defect without closing the jobs. Recommended for `P28.REVIEW` to route: `drop-deferred D15` and
`drop-deferred D21` (executors may not run `defer-job` / `drop-deferred`). The consequence for later
slices is recorded in the notebook: **P28 has no known pre-existing test failures**, so a red pytest
run belongs to the slice that produced it.

No browser work (nothing user-visible changes yet) and no `pnpm` gates (no `web/` file touched) — both
as the plan specified.

## Notebook

`works/phases/active/P28/phase.md` edited per the contract: the `(from P28.DECOMP, for P28.S1)` note
consumed and removed; two `## Decisions` lines added (the verified batch argument + one-builder reuse;
and the parity rule that caught this slice out); one `## Doc impact` line appended; two
`## Notes for later slices` added — the full `canonical_path` contract for `P28.S6` (exact key name,
`string | null`, the three null cases, the no-`publicBase`-prefix warning, doc-nodes-only) and the
D15/D21 routing item for `P28.REVIEW`; `## Now` rewritten. No `## Operator Questions` entry was added —
this slice raised no new operator decision, and the member-link question that concerns it was already
on the list. The generated `## Slices` block was not touched.
