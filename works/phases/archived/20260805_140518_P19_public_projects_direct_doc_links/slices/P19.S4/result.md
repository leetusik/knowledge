# Result — P19.S4 "Save-URL fix (mode-aware) + CLI un-hide + skill + template/manifest parity"

Executed by `slice-executor-mid` on 2026-07-22. Closes intent point 6: every save
returns a working direct URL. Verdict: **done**.

## What changed

### 1. Server — mode-aware 201 `url` (`server/main.py:592-601`)
Replaced the single legacy-mkdocs build site with a mode branch keyed on
`ctx.tenant_id` (never `is_public`, per the pinned plan):

```python
if ctx.tenant_id is not None:
    url = f"{config.public_base_url()}/documents/{doc_id}"
else:
    url = f"{config.public_base_url()}/{project}/{date}-{slug}/"
```

- Tenant mode → the S3 `(public)/documents/{id}` page (`KB_PUBLIC_BASE_URL` is the
  app origin on prod). Legacy/single-tenant mode → the unchanged mkdocs shape (the
  template stack still serves mkdocs there, so legacy stays correct by construction).
- No redundant `.rstrip("/")` at the site — `public_base_url()` already strips.
- The 201 response key set is otherwise frozen: the value of `url` changed, the key
  did not (keeps `api.md` additive-only).

### 2. `server/config.py:39-45` — `public_base_url()` docstring
Reworded from "the mkdocs site, not the API" to state the mode-aware meaning:
app origin in tenant mode (`{origin}/documents/{id}`), mkdocs origin in legacy mode.

### 3. CLI un-hide (`cli/src/knowledge_cli/knowledge.py`)
- `cmd_save` print block: removed the deliberate hide-comment; inserted
  `print(f"  url:  {payload.get('url')}")` between the `path:` and `read:` lines.
  **The `  id:   ` line is byte-identical** — `scripts/cli_smoke.py`'s
  `r"id:\s*(\d+)"` regex is unaffected (spot-checked, not re-run — no live server).
- Module docstring (`:9-15`): replaced the now-false "hides save's `url`" example
  with a true one (human rendering shows title/id/path/url/read-hint, not the
  commit/push bookkeeping), keeping the `--json`-verbatim contract point intact.
- `guide.py` §4 (`:137-139`): save now prints `id`, `rel_path`, the direct `url`
  (shareable when public), and the `knowledge read` hint.

### 4. CLI test (terse) — `cli/tests/test_knowledge.py`
Added `test_save_prints_the_direct_url` asserting save stdout contains
`  url:  http://site.test/x/` (the `FakeApi` url already injected at `:57`). No
existing test asserted the save rendering, so nothing else needed changing.

### 5. Skill — Step 8 API-path bullet, both copies byte-identical
`plugin/skills/explain/SKILL.md` + `.agents/skills/explain/SKILL.md`: the API-path
report bullet's "view at the `url` from the response" gained "(the direct doc page;
shareable with others when the project is public)". Nothing else in the skill changed.

### 6. Bounded tenant-mode assertion (plan point 6 — landed)
`grep` found a Postgres-gated end-to-end tenant-mode write:
`tests/test_org_credentials.py::test_org_key_mints_authorizes_write_and_get_or_creates_project`
(an org `vk_` key POSTing `/api/documents`, so `ctx.tenant_id is not None`). Added
ONE assertion that the 201 `url` ends with `/documents/{id}` (robust regardless of
`KB_PUBLIC_BASE_URL`; would fail on the old mkdocs shape, so it is a real guard). No
new write-path fixtures were built.

### 7. Parity mirrors
Byte-mirrored into `plugin/templates/kb/`:
- `server/main.py`, `server/config.py` (manifest `files.identical`).
- `tests/test_org_credentials.py` — required because the point-6 assertion touched a
  manifest-tracked gated test; without this mirror `plugin_parity.py` drifts.

## Validation (exact outcomes)

| Command | Result |
| --- | --- |
| `pytest tests/test_api_write.py` (legacy mode, no Postgres) | **14 passed** — the `:63` legacy-url assertion passes unchanged |
| `cd cli && pytest` (`cli/.venv`) | **40 passed** (39 prior + the new save-url test) |
| `python3 scripts/skills_parity.py` | `PASS — explain skill copies are in body parity.` (exit 0) |
| `python3 scripts/plugin_parity.py` | `PASS — plugin templates are in parity with the repo.` (exit 0) |
| `KB_TEST_DATABASE_URL=… KB_AUTH_RATE_LIMIT=0 pytest tests/test_org_credentials.py` (fresh disposable Postgres 16) | **4 passed** — incl. the new tenant-mode `/documents/{id}` url assertion |

Environment notes: root suites ran under the repo `.venv` (Python 3.12); the CLI
package lives in its own distribution and ran under `cli/.venv`. The gated suite ran
against a throwaway `postgres:16-alpine` container (fresh DB, so
`create_all(checkfirst=True)` provisioned the `0004` `visibility` column cleanly);
`KB_AUTH_RATE_LIMIT=0` per the phase.md rate-limiter gotcha. Container removed after
the run. No alembic was run against any live DB.

## Deviations from plan.md

- **Extra mirror not spelled out in the plan's step list:** the plan's point 5 named
  only `server/main.py` + `server/config.py` for the template mirror, but landing the
  point-6 assertion in the manifest-tracked `tests/test_org_credentials.py` required
  also mirroring that file to keep `plugin_parity.py` green. This is inside the plan's
  intent (point 6 is explicitly bounded-discretion + "keep parity green") — reported
  for transparency, not a design change.
- Otherwise none. The pinned decisions (branch on `ctx.tenant_id`; byte-identical
  `  id:   ` line; identical skill bodies) were all honored.

## Doc impact (appended to `phase.md` running list, for the P19 review)

`api.md` — `POST /api/documents` 201 `url` is now mode-aware (tenant →
`{KB_PUBLIC_BASE_URL}/documents/{id}`, legacy → mkdocs shape); the example at
`api.md:311` and field meaning at `:328-329` are stale (additive-only: value changed,
key still always-present). `backend.md` — the mode-aware save-URL build
(`main.py:592-601`) + the reworded `public_base_url()` docstring. `product.md` /
`experience.md` — the CLI `save` now surfaces a working, shareable direct `url`
(previously hidden) — review's call on whether that rises to a durable-doc edit.
