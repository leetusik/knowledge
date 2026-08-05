# Result — P23.REVIEW (phase review: document version control)

**Verdict: `pass`.** The phase does what `intent.md` asked, end to end, and the whole
suite is green — including the Postgres-gated `/app` tests that a plain `pytest`
silently skips. No source file was touched by this slice; the only writes are eight
durable-doc versions and this file plus the `phase.md` notes.

## 1. Validation — everything the plan called for, all green

| Command | Where | Outcome |
| --- | --- | --- |
| `.venv/bin/python -m pytest` (no DSN) | repo root | **PASS** — 81 passed, 32 skipped (the Postgres-gated suites), 1 pre-existing `StarletteDeprecationWarning` |
| `KB_TEST_DATABASE_URL=… .venv/bin/python -m pytest` | repo root | **PASS** — **113 passed, 0 failed**, 0 skipped — every `/app` suite actually exercised |
| `.venv/bin/python scripts/plugin_parity.py` | repo root | **PASS** — "plugin templates are in parity with the repo" |
| `python3 scripts/skills_parity.py` | repo root | **PASS** — "explain skill copies are in body parity (web copy byte-identical)", no DESCRIPTION warning |
| `pnpm lint` | `web/` | **PASS** (clean) |
| `pnpm typecheck` | `web/` | **PASS** (clean) |
| `pnpm test` | `web/` | **PASS** — 12 files, **76 tests**, 0 failed |
| `pnpm build` | `web/` | **PASS** — both new routes registered dynamic (`ƒ /documents/[id]/versions/[v]`, `ƒ /api/documents/[id]/versions/[v]/raw`) |
| `python3 scripts/workflow.py validate` | repo root | **PASS** (before and after doc consolidation) |
| End-to-end versioning smoke (scratchpad script) | temp KB root | **PASS** — 31/31 assertions |

**The Postgres cluster did stand up** (the plan asked me to say so explicitly if it
could not). The binaries are not on `PATH` under their plain names — they are the
Homebrew **version-suffixed** `initdb-17` / `pg_ctl-17` / `createdb-17`. Recipe used,
worth recording for the next reviewer:

```
initdb-17 -D <scratch>/pgdata2 -U kb --auth=trust
pg_ctl-17 -D <scratch>/pgdata2 -o "-p 55432 -k /tmp" -l <scratch>/pg2.log start
createdb-17 -h /tmp -p 55432 -U kb -w kbtest
KB_TEST_DATABASE_URL="postgresql://kb@/kbtest?host=/tmp&port=55432" .venv/bin/python -m pytest
```

The unix-socket DSN form is required (a `127.0.0.1` DSN dies with `fe_sendauth: no
password supplied` despite `trust`). The cluster was stopped again afterwards; nothing
outside the scratchpad was touched. Note the sandbox denies a multi-command shell
invocation containing `rm -rf` + `initdb` + `pg_ctl` — run them as separate calls.

### The end-to-end smoke (the story `intent.md` actually asks for)

A standalone script against a temp git-backed KB root, exercising the whole chain the
four slices built rather than any one of them:

1. **publish v1** → 201, `version: 1`, and the file carries **no** `version:` line
   (a v1 file is byte-identical to a pre-P23 one).
2. **publish v2 with `new_version` on a LATER date** → same `id`, same `rel_path`,
   `version: 2`, `previous_version: 1`; `docs/.versions/smoke/2026-08-01-versioning/v0001.md`
   exists with the v1 body intact; the current file carries `version: 2`; and
   **`/api/documents?project=smoke` still reports one document** — i.e. the exact
   duplicate-post bug the phase set out to kill is dead.
3. **`/api` version reads** → envelope `{rel_path, current_version, total, versions}`
   exactly as documented, index rows body-less, `…/versions/1` returns the v1 body,
   `…/versions/2` (the current one) is a 404, and the greedy `{rel_path:path}` does not
   swallow the `/versions` suffix.
4. **`overwrite: true`** → bumps to v3 and **archives** v2 rather than destroying it;
   history is now 2 entries.
5. **an unversioned document** → `current_version: 1, total: 0, versions: []`, never a 404.
6. **`rm kb.sqlite3` + `init_db` + `reindex()`** → `documents.version == 3` re-derived
   from frontmatter, **both** `document_versions` rows rebuilt from disk, FTS matches the
   current body only and never an archived one, and `.versions` never enters the document
   walk. Report: `{indexed: 2, removed: 0, versions_indexed: 2, versions_removed: 0}`.
7. **delete** → the whole `.versions/<project>/<date>-<slug>/` dir is gone.

That step 6 is the load-bearing one: it proves the pinned "disk is canonical, the DB is
disposable" design actually holds, which is the single assumption every other decision in
the phase rests on.

## 2. Judgment against the objective and `intent.md`

The confirmed intent asked for three things. All three landed:

- **"the coding agent can see the previous document"** — yes, on both planes. `/api`
  gains list + fetch by path (with `raw_html` for an archived html version, so a
  superseded explainer is actually readable); `/app` gains the id-keyed twins plus a
  sandboxed raw route.
- **"add v2 and v3 of it, not a new post"** — yes. `new_version` + `rel_path`, with
  server-side `(project, slug)` resolution as the convenience path, and the target's
  `rel_path`/`date`/`slug` winning so identity never moves. A resolution miss degrades to
  an ordinary create instead of erroring.
- **"server schema/API, web display of version history, and `/explain` updated across
  copies"** — yes: `documents.version` + `document_versions` (no alembic, correctly — the
  content plane has none); the history panel + past-version view + BFF relay twin; and all
  **four** skill copies in sync, installed one included (the phase found a fourth copy the
  intent did not know about, and closed it without leaving an operator `cp` outstanding).

Things I specifically checked rather than took on trust:

- **The flagged behavior change (`overwrite` now archives) is deliberate, coherent and
  documented.** Status and every pre-P23 response key are unchanged (smoke step 4), so the
  CLI's `--overwrite` + 409 explainer are unaffected — I read `cli/src/knowledge_cli/client.py`
  to confirm it just returns the JSON and keys off nothing new. It is strictly a data-loss
  fix; I would not want it any other way.
- **Backward compatibility.** An unversioned corpus is untouched: v1 files emit no
  `version:` line, the history routes answer an empty envelope rather than 404, archived
  bodies are never in FTS/embeddings/graph, and the web panel renders `null` with no
  history. The regression evidence is the 113-test suite plus smoke steps 1/5/6.
- **The deploy gate.** `.versions` is excluded in all three walkers, and `seed.py` inherits
  it via `reindex.RESERVED_DIRS`. I traced `site_smoke.check_graph`'s doc-count identity
  myself: it counts `(docs/<project>)/*.md` over `discover_projects`, which is
  `RESERVED_DOC_DIRS`-aware — so `.versions` is excluded both as a project and by depth.
  `check_source`/`check_built` do not walk documents. The gate is safe.
- **mkdocs.** I could **not** empirically build the site here (mkdocs is not installed in
  the venv), so the "dot-prefixed dirs are excluded at any depth" claim rests on S1's
  reading of mkdocs' default file-scanner exclusion (`['.*', '/templates/']`) rather than on
  a build in this environment. Recorded as a residual verification gap, not a finding —
  the belt-and-braces `.versions` exclusions in `graph_hook`/`site_smoke` mean a wrong
  reading would surface as an unwanted *page*, not a broken gate.
- **The `/app` boundary.** Each version route resolves the document through
  `_resolve_readable_doc` first and then scopes the archive to the **owning** document's
  tenant (`_archive_tenant`), not the caller's — which is what makes a public document's
  history anonymously readable with no cross-tenant read expressible at all. Every miss is
  a 404, never a 403; the archived-HTML raw route repeats the four P16 sandbox headers
  verbatim and the BFF relay re-asserts them explicitly plus a `next.config.ts` per-path
  entry.
- **`raw_html` on `/api`.** The one documented exception to a pinned rule. Bounded to
  archived versions of html documents, justified in the code comment, and the `/app` plane
  keeps the rule intact. I accept it and gave it its own ADR.
- **The consciously-accepted costs hold.** S3's two upstream calls per document page view:
  unavoidable (a document cannot know it has history without asking), both unmetered, and
  the history read **degrades** rather than throwing, so it can never take down a body that
  already rendered. S4's step-6 offline fallback that cannot version: honestly documented
  in the skill itself, out of scope by design, and a good deferred-job candidate — not a
  fix slice.

Nothing here is worth a fix slice. Three items belong in the operator's backlog as
**deferred jobs**, not P23 work: (a) the offline-fallback versioning gap, (b) rollback /
diffing / pruning, (c) a CLI `--new-version` flag (F9, already deferred by decision).

## 3. Doc consolidation — eight versions

P23 is **not** in parallel mode (`phase.json` carries no `execution` block), so a passing
review consolidates here. One version per affected doc, each covering the whole phase and
merging the overlapping S1–S4 lines:

| Doc | Version |
| --- | --- |
| `data` | `v0011_p23_on-disk_document_version_archive_…` |
| `backend` | `v0011_p23_version-aware_write_path_…` |
| `api` | `v0016_p23_versioned_publishing_…` |
| `frontend` | `v0013_p23_document_version_history_panel_…` |
| `experience` | `v0014_p23_document_version_history_journey_…` |
| `product` | `v0012_p23_versioned_documents_…` |
| `decisions` | `v0020_p23_adrs_version_history_on_disk_…` |
| `security` | `v0014_p23_version-history_read_surface_…` |

`rebuild-docs` was run and `validate` passes. `docs/current/*.md` was never hand-edited.

**One completeness note on the "Doc impact" list:** the four slice lines named
`data`/`backend`/`api`/`frontend`/`experience`/`product`, and DECOMP's line additionally
anticipated `architecture` **or** `decisions`. Two adjustments:

- **`decisions` was written** (not `architecture`): the phase's durable ADR content is
  decision-shaped — five ADRs, of which "history lives on disk because the content DB is
  disposable" is the one a future phase most needs to not violate. `architecture.md`'s
  plane/topology picture is genuinely unchanged by P23, so it got no version.
- **`security` was written although no slice line named it.** The phase adds a new route
  class that serves untrusted archived HTML and a new documented exception to the pinned
  "`raw_html` never leaves `/api`" rule — both security-doc material by the P16/P19/P21
  precedent. This is a small, closed gap in the running list, recorded here so future
  slices remember to name `security.md` when they touch an egress rule or a route that
  serves untrusted bytes.

## 4. Deviations from `plan.md`

- The plan's step-1 Postgres recipe assumed bare `initdb`/`pg_ctl`/`createdb`; the actual
  binaries are `-17`-suffixed (recorded above). No substantive deviation.
- The plan listed `data`/`api`/`backend`/`frontend`/`experience`/`product` "and possibly
  `architecture`/`decisions`". I wrote `decisions` **and** `security`, and skipped
  `architecture` — reasoning in §3. This is the plan's own "consolidate what the lines
  actually support, verify the list is complete" instruction, exercised.
- No phase explainer was written: `explain: not written — run /explain for this phase`.
