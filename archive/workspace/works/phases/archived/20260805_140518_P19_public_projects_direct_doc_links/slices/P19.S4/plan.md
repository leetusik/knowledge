# Plan — P19.S4 "Save-URL fix (mode-aware) + CLI un-hide + skill + template/manifest parity"

Operator-approved 2026-07-22 (do-whole-phase, manual gate). Executor tier: `slice-executor-mid` (risk `medium`).

Read `works/phases/active/P19/phase.md` first (S2/S3 cross-slice notes; Constraints — parity gates, api.md additive-only, terse tests). This slice closes intent point 6: every save returns a working direct URL. The S3 web page `/documents/{id}` is the working target (anonymous-capable for public projects since S2).

## Grounded facts (verified; spot-check as you go)

- Write handler: `ctx: ApiAuthContext = Depends(resolve_api_write)` (`server/main.py:427`); `ctx.tenant_id is None` **exactly iff legacy/single-tenant mode** (`server/api_auth.py:40-67`). `ctx.is_public` is true for legacy OR tenant #1 — **do not branch on it** (tenant #1's mkdocs url is equally broken on prod; it must get the app URL too).
- Url built at `server/main.py:592-595` from `config.public_base_url()` (`server/config.py:39-41`, already `.rstrip("/")`s; the build site redundantly re-strips). `doc_id` is in scope (DB row id, `main.py:515-529`) and already in the 201 as `"id"`. Prod `KB_PUBLIC_BASE_URL` = `https://knowledge.hi2vi.com` = the web app origin — no ops change needed.
- CLI: `cmd_save` prints 4 lines (`cli/src/knowledge_cli/knowledge.py:402-411`) with the hide-url comment; module docstring `:11-14` cites the hidden url; `guide.py:137-138` restates the print contract; `emit` passes `--json` verbatim (already carries `url`).
- `scripts/cli_smoke.py:164-167` regexes `r"id:\s*(\d+)"` from save stdout — **keep the `  id:   ` line byte-identical**. `scripts/onboarding_smoke.py` asserts 201 key presence only — unaffected.
- `cli/tests/test_knowledge.py`: no test asserts the save rendering; `FakeApi` injects `"url": "http://site.test/x/"` (:57).
- Root tests: exactly one 201-url value assertion — `tests/test_api_write.py:63`, legacy-mode fixture → must still pass unchanged (legacy branch preserved). No Postgres-gated test asserts the url value.
- Skill: Step 5 records `url` (`plugin/skills/explain/SKILL.md:383-386`); Step 8 API-path bullet `:475-477`; the two copies' **bodies are byte-identical** (`python3 scripts/skills_parity.py` currently PASS); `cli/` and skills are outside the plugin-template manifest.
- Manifest `files.identical` includes `server/main.py` + `server/config.py` → byte-mirror both to `plugin/templates/kb/server/`. The template runs legacy mode, so the legacy branch keeps its correct mkdocs url — template behavior unchanged by construction.
- `docs/current/api.md:311,328-329` documents the old url shape — doc-impact note only (never edit docs/).

## Changes (pinned)

1. **Server — mode-aware url (`server/main.py:592-595`):**
   ```python
   if ctx.tenant_id is not None:
       url = f"{config.public_base_url()}/documents/{doc_id}"
   else:
       url = f"{config.public_base_url()}/{project}/{date}-{slug}/"
   ```
   No redundant rstrip. Branch key `ctx.tenant_id`, never `is_public`. Response assembly otherwise untouched (frozen key set). Update the `public_base_url` docstring (`config.py:39-41`): viewer origin for response `url`s — the web app origin in tenant mode, the mkdocs site in legacy mode.

2. **CLI un-hide (`cli/src/knowledge_cli/knowledge.py`):** remove the hide-comment; insert `print(f"  url:  {payload.get('url')}")` between the `path:` and `read:` lines; keep the `  id:   ` line byte-identical. Update the module docstring `:11-14` (drop/replace the now-false "hides save's url" example while keeping the `--json`-verbatim contract point). Update `guide.py:137-138`: save prints `id`, `rel_path`, the direct `url`, and the `knowledge read` hint.

3. **CLI test (terse):** one new test in `cli/tests/test_knowledge.py` asserting save stdout contains the `url:` line with the FakeApi url. Keep all existing tests green.

4. **Skill (both copies, bodies byte-identical):** minimal Step 8 edit — the API-path bullet's "view at the `url` from the response" gains "(the direct doc page; shareable with others when the project is public)". Apply to BOTH `plugin/skills/explain/SKILL.md` and `.agents/skills/explain/SKILL.md`. Nothing else in the skill changes.

5. **Parity:** byte-mirror `server/main.py` + `server/config.py` to `plugin/templates/kb/server/`.

6. **Optional tenant-mode assertion (bounded discretion):** grep for an existing Postgres-gated test that exercises `POST /api/documents` end-to-end; if one exists, add ONE assertion that the tenant-mode 201 url ends with `/documents/{id}`; if none, skip (S5's live smoke covers it). Do not build new write-path fixtures.

## Validation (run, report honestly in result.md)

- `pytest tests/test_api_write.py` (legacy mode, no Postgres needed) — the `:63` legacy-url assertion must pass unchanged.
- `cd cli && pytest` — exact counts.
- `python3 scripts/skills_parity.py` → PASS line; `python3 scripts/plugin_parity.py` → PASS line.
- If the bounded tenant-mode assertion was added: run that one suite against a fresh disposable Postgres (phase.md gotchas: fresh DB — `create_all(checkfirst=True)` won't alter existing tables; `KB_AUTH_RATE_LIMIT=0` for multi-suite runs).

## Wrap-up

- Append to `phase.md`: cross-slice note for S5 — tenant-mode 201 `url` is now `{KB_PUBLIC_BASE_URL}/documents/{id}` (live smoke should assert the shape and fetch it), legacy/template unchanged, CLI now prints `url:`. Doc impact line: `api.md` (201 `url` semantics; example at :311 and field meaning at :328 stale), `backend.md` (mode-aware build + config docstring), plus `experience.md`/`product.md` wording if the review deems it.
- Write `works/phases/active/P19/slices/P19.S4/result.md` from scratch.
- Return the structured verdict (verdict, summary, files_changed, validation with exact counts, deviations, doc_impact). Never commit; never transition slice/phase status; never touch `docs/`; never run alembic against a live DB.
