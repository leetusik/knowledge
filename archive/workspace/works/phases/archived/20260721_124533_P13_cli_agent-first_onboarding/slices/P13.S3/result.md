# P13.S3 — result

**Status: done.** `save`, `search`, `list`, `read`, `projects`, `usage` ship, all six with `--json`. The four planning-turn decisions are implemented as written. **Phase Open Question (b) is resolved at the CLI layer**, and the live run turned two of the plan's arguments into demonstrated facts — plus **corrected one of them** (see Deviations 1).

## What shipped

```
cli/src/knowledge_cli/knowledge.py   NEW   the six commands + register(sub)
cli/src/knowledge_cli/client.py      EDIT  document_get, document_get_by_path, corpus_projects,
                                           usage(days=), honest module docstring
cli/src/knowledge_cli/auth.py        EDIT  stored_api_token(), stored_project(), init writes
                                           api.project, key reuse = base+project, plane_call()
cli/src/knowledge_cli/main.py        EDIT  knowledge.register(sub) + docstring
cli/tests/test_knowledge.py          NEW   14 tests
cli/tests/test_auth.py               EDIT  +2 tests, 1 assertion updated (see Deviations 4)
```

## The live run — the point of this slice

Real tenant-mode API (`docker compose up -d postgres api`; `alembic upgrade head` **inside the container** — see Deviations 5), driving the **installed** binary against `http://localhost:8766` under a throwaway `XDG_CONFIG_HOME`, from a fake git repo named `myrepo`. `/auth/me` → **401 JSON**, so the control plane was genuinely live.

| # | Check | Result |
|---|---|---|
| 1 | `init` fresh | config carries the new **`api.project: "knowledge"`**, 0600, no `kb_root` |
| 2 | `projects` **before** any save | `no documents yet — projects appear here once you save one` — fires exactly where `init` had just printed `project: knowledge (created)` |
| 3 | `save` with hand-written frontmatter | stripped + warned; `project=myrepo` (**the repo**, not the config's project); title from the H1; `--tag postgres,pooling` comma-split |
| 4 | **`save` never prints the `url`** | text output shows `id`/`path`/`read` hint only |
| 5 | `read 8` / `read myrepo/2026-…md` | both 200 — id and rel_path routes |
| 6 | **round trip** `read 8 > f.md && save f.md` | **no strip-and-warn fired** — the plan's prediction confirmed |
| 7 | second `save` → **409** | `a document already exists at myrepo/2026-07-17-…md (id 8, 'Postgres connection pooling') — pass --overwrite…` — the **dict** detail parsed, no JSON blob |
| 8 | `--overwrite` | 201, same id 8 |
| 9 | **bad tags never reach the server** | 3 bad-tag saves → **delta 0** `POST /api/documents` in the uvicorn access log; a control save → **delta 1**. Count *and* charset (`Postgres`, `web api`) |
| 10 | `list` / `search` / `projects` / `usage` | `items` vs `results` both rendered; `usage` = totals only |
| 11 | **`--json` is the server verbatim** | the withheld `url` **is** in it: `http://localhost:8765/…` |
| 12 | `--json` on an error | stdout **empty**, message on stderr, exit 1 |
| 13 | **T5 live** — `KB_API_TOKEN` set + a config `api.token` | the **env token went on the wire** (401, while the config's key lists fine once unset) + the warning fired with the config key **redacted** |
| 14 | **two-token model** — after `logout` | `usage` → "not logged in"; `search` + `save` **keep working** on the `vk_` |
| 15 | `usage` with a **stored-but-revoked** session | → the 401 branch: *"your session has expired … Your API key is unaffected"* |
| 16 | `usage` against **`https://knowledge.hi2vi.com`** (read-only GET) | → *"is not serving the control-plane API (HTTP 404)"*, no HTML sprayed. Ground truth: the edge really answers `404 text/html` |

Check 9 is the honest version of "no raw 422": the CLI *claiming* it rejected the tags proves nothing, so the proof is a before/after count of real `POST`s in the server's own log, with a positive control. (My first attempt at this measured nothing at all — `docker compose` was running from the fake repo dir with no `compose.yml`. A green "delta 0" that was really "no data" — caught only because the control also read 0.)

Check 16 re-confirms **S5's precondition is live and current** as of 2026-07-17.

### Regressions — all match the S1/S2 baseline exactly

| Command | Result |
|---|---|
| `cd cli && uv run pytest -q` | **38 passed** (22 baseline + 16 new) |
| `uv run pytest -q` (root) | **65 passed, 12 skipped** — unchanged |
| `python3 scripts/plugin_parity.py` | exit 1, **exactly 34 issues**, **0 `cli/` mentions** (D-P13-5 honored) |
| `git status --porcelain` | only `cli/` + `works/` — **no root file touched** |
| `python3 scripts/workflow.py validate` | passed |

## Deviations from `plan.md`

1. **The plan's "easy to get wrong" #4 is wrong for the CLI, and I removed the code it asked for.** The plan says *"`search` fails 400, not 422, on a malformed FTS query"*. True of the **endpoint**, unreachable from the **CLI**: the server double-quotes every whitespace token before `MATCH`, and `SearchQueryError` is raised *"Only reachable with raw=True"* (`server/search.py:264-265`) — a parameter this CLI deliberately does not expose. Verified rather than reasoned: `"unclosed`, `NEAR(`, `a OR`, `*`, `x AND AND y`, `^`, `""""`, `col:val` and an empty query **all return 200** through the CLI, while the same `"unclosed` with `raw=true` returns **400** by curl. I had written the 400 branch; it is now deleted, with the evidence recorded in `cmd_search`'s docstring. Shipping a handler for an error the CLI cannot produce would be decoration — and the plan's own "Cut, deliberately" logic (an error whose server message already reads fine is not worth pre-empting) points the same way.
2. **`auth._auth_call` → `auth.plane_call(..., plane=)`, and `auth._note` → `auth.note`.** The plan asked me to "generalize `_auth_call`'s wording" for `usage`; both are now public because `knowledge.py` needs them. `/api/*` is deliberately **not** in the plane table: `read` 404s for real, so the guard would lie about a missing document.
3. **`client.usage()` gained `days=`.** Not in the plan's client edit list, but `--days` is in its command spec and the S1 wrapper took no params — the flag would have been silently inert.
4. **One S2 assertion changed** (`test_init_writes_a_remote_only_0600_config_that_resolves`): `data["api"]` now also carries `project`, which is the plan's own `cmd_init` change. Tightened to pin the new key rather than loosened.
5. **`alembic upgrade head` runs *inside* the api container**, not on the host as the plan's snippet shows. Postgres publishes no host port (S2 recorded this for the 12 skipped tests), so the host has no `DATABASE_URL` route to it: `docker compose exec -T api uv run alembic upgrade head`. Worth carrying into S5's E2E smoke.
6. **Two tests beyond the plan's T1–T6**, both on `init`'s key reuse — the plan itself calls it *"the one real regression risk in this slice"*, and nothing pinned it: `test_init_reuses_the_key_of_a_config_that_predates_api_project` (absent = unknown → reuse **and backfill**, never mint) and `test_init_mints_a_key_bound_to_the_project_it_is_asked_for`.
7. **One warning the plan did not ask for**, in the single case the "absent `api.project` = reuse" rule cannot get right: an S2-era config's key is bound to whatever project minted it, so `init --project other` on such a config reuses a key bound elsewhere. It stays reuse (the rule is right — a naive `!=` would mint a live credential for every existing user), but it now says so once, and only when the requested project is not the default. Self-corrects on the next run, since the backfill makes `api.project` present.
8. **A repo name that cannot be a project is an error, not an auto-fix.** `explain/SKILL.md:160-161` tells the *plugin* to lowercase-and-replace path-unsafe characters; the plan told me to make `my app` "produce a sentence, not a 422". I followed the plan (error + `--project my-repo` suggestion) rather than silently sanitizing. **Known divergence:** for a repo named `my app`, the plugin would auto-file under `my-app` while the CLI stops and asks. Narrow, and the suggestion steers to the same name — but it is a real seam between the two writers, flagged for S4's docs.

## Open Question (b) — resolved at the CLI layer, and now with live proof

Decision 2 said `save` must not print the 201's `url` because it is built from `KB_PUBLIC_BASE_URL` (the mkdocs origin) and points at a page that does not exist for any tenant but #1. **Confirmed live rather than argued:** the throwaway tenant's write returned `url = http://localhost:8765/myrepo/2026-07-17-jsontest/` — port **8765** (mkdocs) while the CLI was talking to **8766** (the API), for a tenant whose content mkdocs never serves. The CLI prints `id`, `rel_path` and `knowledge read <id>` — all of which work — and keeps `url` in `--json`. The honest link remains the P12 web app's document view, undeployed until P14.

## What S4/S5 must know

See the `phase.md` cross-slice notes. The short version: `--reinstall` (never `--force`); alembic runs **inside** the container; `save`'s project defaults to the **repo basename**, not the config; a `vk_` is bound to a project server-side but the write's `project` is a free-form name that is never checked against it — so `save` can and does file under a project the key was not minted for.

## What I left behind — exactly

- **`knowledge_pgdata` volume:** S2's, unchanged in kind. It now also holds **one more throwaway tenant** (`cli-s3+719f8e0a@example.com`, password `correct-horse-battery`) with **~7 junk documents** under a project named `myrepo` (`control`, `control2`, `roundtrip`, `jsontest`, `after-logout`, …). All fixtures, no real data — `docker compose down -v` is safe. Stopped, **not dropped** (the plan forbade `-v`).
- **Containers `knowledge-api-1` + `knowledge-postgres-1`: `exited`** (`docker compose stop`, not removed).
- **CLI uninstalled** (`uv tool uninstall knowledge-cli`); `knowledge` is off PATH, as before the slice.
- **The operator's `~/.config/knowledge-kb/` still does not exist** — verified after the run. Every command used a throwaway `XDG_CONFIG_HOME` under the scratchpad.
- **No `KB_API_TOKEN` was ever set** outside a single-command prefix, and the value used was the bogus string `not-the-master-token` — the real master bearer was never in my environment. Verified at the start that the operator's shell does not export it (decision 4's hazard is latent, not live).
- Scratchpad: `…/scratchpad/s3live/` (throwaway `xdg/` config with a live-but-worthless `vk_` for the fixture tenant, and the fake `myrepo` git repo). Nothing in the tree references it.
