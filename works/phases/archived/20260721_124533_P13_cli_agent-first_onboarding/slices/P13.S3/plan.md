# P13.S3 — Knowledge commands

`implementation` · risk `medium` · order 3 · depends P13.S2 → executor **`slice-executor-mid`**

## Context

P13 is "let's say you are my user": someone inside Claude Code or Codex must run the whole lifecycle without visiting the website. S1 built the package, the config seam and the HTTP client; S2 built `signup`/`login`/`logout`/`whoami`/`init` and **proved the phase's thesis** — a config written entirely by the CLI resolves through the verbatim `explain/SKILL.md` heredoc, so `/knowledge:explain` writes to the hosted SaaS with zero code change.

S3 is what the user actually does *after* onboarding: **`save`, `search`, `list`, `read`, `projects`, `usage`**. Five of the six ride the non-expiring `vk_` key on `/api/*` — which is the point of the two-token model (D-P13-3): they keep working after the 30-day session lapses. The work is mapping a frozen server contract to honest CLI ergonomics and real error shapes; no new endpoints, no server change.

Everything ships against `http://localhost:8766`. The deployed host still 404s `/auth/*` and `/app/*` into the mkdocs site (re-confirmed live by S1) — S5 fixes that.

## Decisions made at this planning turn

1. **`save --project` = the git repo root's basename**, falling back to the config's `api.project`, then `knowledge`. `plugin/skills/explain/SKILL.md:160` files documents under "the current repo's root directory name, verbatim" — the CLI and the plugin write the *same corpus with the same key*, so they must partition it the same way. This overrides DECOMP's "default it from config" line (`phase.md:40`), which was written without that fact. It also matches `--source-repo`, which defaults to the same basename (the plugin sends an absolute path and `sanitize_source_repo` collapses it to the basename — same value, both ways).
2. **`save` never prints the 201's `url`.** It is built from `KB_PUBLIC_BASE_URL`, the mkdocs origin, so for any tenant but #1 it links to a page that does not exist. Print `id`, `rel_path` and a `knowledge read <id>` hint — a path that always works. The `url` stays in `--json`, so nothing is hidden. **This resolves phase Open Question (b)** for the CLI; the honest link is the P12 web app's document view, undeployed until P14.
3. **`--json` on all six commands**; human-readable text is the default. Errors stay `error: …` on **stderr** with exit 1 — never a JSON error envelope. stdout is then always "valid JSON or nothing", and an agent branches on the exit code. `main()`'s existing error boundary (`main.py:107-121`) needs no change.
4. **`$KB_API_TOKEN` keeps its seam precedence (env > config's literal `api.token`) but now warns.** This env var is *not* a generic CLI token: `server/api_auth.py:142-149` short-circuits an exact match to **tenant #1**, and a tenant-#1 write is `is_public` → it writes the canonical git-published `docs/` tree, updates the public Recent index, commits and **pushes to the live website** (`main.py:448-459,486-515`). Ignoring the env var is worse (`knowledge config` already reports it as the effective token — the CLI would contradict itself), so: honor it, and when it is set *and* differs from `api.token`, warn on stderr in S2's `_note()` style. Verified read-only: **the operator's shell does not have it set**, so this is latent, not live. Pinned by test T5 below.

## What ships

| File | |
|---|---|
| `cli/src/knowledge_cli/knowledge.py` | **NEW** — the six commands + `register(sub)`, mirroring `auth.register` |
| `cli/src/knowledge_cli/client.py` | **EDIT** — add `document_get`, `document_get_by_path`, `corpus_projects`; amend the module docstring (see below) |
| `cli/src/knowledge_cli/main.py` | **EDIT** — one line: `knowledge.register(sub)` |
| `cli/src/knowledge_cli/auth.py` | **EDIT** — `stored_api_token()`; `cmd_init` writes `api.project`; tighten key reuse |
| `cli/tests/test_knowledge.py` | **NEW** — terse, `httpx.MockTransport`, no live server |

### The commands

- **`save [FILE|-]`** → `POST /api/documents`. Body from a file arg or stdin. `--title` (defaults to the markdown's H1), `--tag` (repeatable, also comma-splits), `--project`, `--source-repo` (defaults to the cwd basename), `--overwrite`, `--slug`, `--date`, `--json`.
- **`search QUERY`** → `GET /api/search`. `--project`, `--tag`, `--limit`, `--json`.
- **`list`** → `GET /api/documents`. `--project`, `--tag`, `--limit`, `--offset`, `--json`.
- **`read ID_OR_PATH`** → all-digits arg → `GET /api/documents/{id}`; otherwise `GET /api/documents/by-path/{rel_path}`. A rel_path can never be all digits, so the heuristic is total. Help text must say *"the `rel_path` that `list` prints"* — it is the full `project/YYYY-MM-DD-slug.md` (`documents.py:87-88`), not a bare slug.
- **`projects`** → `GET /api/projects`.
- **`usage`** → `GET /app/usage`, `--days`. Kept in S3 per DECOMP (it is a few lines and S5 is already the riskiest slice), but deliberately minimal: **totals only**, never the 30-day `daily_counts` series — that payload is built for the web dashboard and reads as noise in a terminal.

### The five things that are easy to get wrong

These are the slice's actual content — each is a real server behavior found by reading the contract, not a guess:

1. **The 409 `detail` is a dict, not prose.** `main.py:426-430` raises `detail={"message", "rel_path", "id", "existing_title"}`, and `client._detail()` (`client.py:65-72`) only passes strings through — a dict arrives `json.dumps`'d. So `save`'s 409 handler must `json.loads` it to build *"a document already exists at `<rel_path>` (id N) — pass `--overwrite` to replace it"*, or it prints a raw JSON blob at the user. The 422 from the same endpoint **is** a plain string (`main.py:407-408`); the two shapes differ.
2. **Tag charset, not just tag count.** DECOMP named the 2–5 rule (`documents.py:61-62`), but `documents.py:33` also pins `^[a-z0-9]+(-[a-z0-9]+)*$` — so `--tag Auth`, `--tag "web api"`, `--tag c++` all 422. Uppercase is the likelier agent mistake. Validate both client-side, or the "no raw 422" promise is half-kept. Same for `--project` (`^[A-Za-z0-9][A-Za-z0-9._-]*$`, `documents.py:32`) — it now carries an **auto-derived** repo basename, so a repo named `my app` must produce a sentence, not a 422.
3. **`projects` is a GROUP BY over documents**, not a project registry (`db.py:344-355`). A project `init` just created is **absent until its first save** — which reads as a bug right after `init` said "project: foo (created)". Needs an explicit empty-state line: *"no documents yet — projects appear here once you save one"*.
4. **`search` fails 400, not 422**, on a malformed FTS query (`main.py:318-319`).
5. **`list` returns `items`; `search` returns `results`** (`main.py:255` vs `:329-338`) — two shapes, so a shared formatter will get one wrong.

Also: a 401 on any `/api/*` → *"your API key is not valid — run `knowledge init`"*; `usage` needs the `/app`-plane-not-routed guard (generalize `auth._auth_call`'s wording, `auth.py:112-133`) or it bare-404s on the hosted host until S5, plus a 401 → *"your session has expired — run `knowledge login`"* while every `/api/*` command keeps working (that contrast **is** the two-token model).

**Do not "fix" the frontmatter round-trip.** `read` → `save` will not trip the strip-and-warn: `documents.py:294-295` stores the body *without* frontmatter, so `read` hands back a bare H1-first body. Strip-and-warn fires only on genuinely hand-written frontmatter, which is exactly right.

### The auth.py edits

- **`stored_api_token()`**, beside the existing `stored_session_token()` (`auth.py:219-220`) — both answer "what did the CLI literally store", both via `_stored()`/`_section()`. Reuse them; do **not** write a third `load_raw` wrapper, and use `config.redact_token()` rather than inventing a redactor.
- **`cmd_init` writes `api.project`** (S2's own note asked for this: *"a new additive key S3 must add — and `init` should probably write it"*). The plugin's resolver reads exactly four keys and ignores the rest, so this is additive and backward-compatible, like S2's `auth.*`.
- **Key reuse tightens from base to base+project.** A `vk_` is bound server-side to one project, so reusing foo's key while writing `api.project=bar` is incoherent. **The rule must be: absent `api.project` = unknown = reuse and backfill, never mint.** Every config S2 wrote lacks the key; a naive `!=` treats absent as mismatch and mints a redundant live credential for every existing user on their first post-upgrade `init`. That is the one real regression risk in this slice.

### client.py

Add `document_get(doc_id)`, `document_get_by_path(rel_path)`, `corpus_projects()`. **Name that last one carefully: `projects_list` at `client.py:177-180` is already `/app/projects`** — the session-authed tenant project *records*, a different object from `/api/projects`'s document counts. Two "projects" concepts, one client; the names must keep them apart.

The module docstring (`client.py:1-19`) claims *"Nothing is invented: if the smoke does not prove a call, it is not here."* The smoke never calls `/api/projects` or `/api/documents/{id}` (`onboarding_smoke.py:12-18` proves by-path only as a negative 404). Amend the docstring honestly rather than quietly breaking its own rule.

### Cut, deliberately

Client-side `--limit` range checks (an out-of-range limit is a typo, and FastAPI's `Query(ge=,le=)` 422 already reads fine — unlike the tags rule, it is not a workflow error worth pre-empting); `--related`, `--co-authored-by`, `--commit` (in the client already, no CLI story yet); `daily_counts` in `usage`. **No `--verbose`/request dumping, ever** — `client._detail()` is the only reason a 404-into-mkdocs doesn't spray HTML, and a request dump would print the `Authorization` header.

## Verification

Tests (`cli/tests/test_knowledge.py`, `MockTransport`, in `test_auth.py`'s `FakeApi.calls` idiom — terse, high-value only):

- **T1** `save` sends `project` = repo basename, `markdown` starting at the H1, frontmatter stripped; title derived from the H1.
- **T2** tags 2–5 **and** charset rejected client-side — no request is made.
- **T3** 409 → the message names the `rel_path` and `--overwrite` (dict detail parsed, not dumped).
- **T4** `read 42` hits `/api/documents/42`; `read a/b.md` hits `/api/documents/by-path/a/b.md`.
- **T5** **the important one:** with `KB_API_TOKEN` set *and* a config `api.token=vk_…`, assert **which bearer lands on the wire** and that the warning fires. This is the only test here standing between a mis-resolved bearer and a write published to the live public site.
- **T6** no `vk_` in any command's stdout/stderr.

Live run — the slice is not done without it:

```
docker compose up -d postgres api && alembic upgrade head    # /auth/me must 401 JSON, not 404 HTML
uv tool install ./cli --reinstall                            # --force does NOT rebuild (S2 lost a run to this)
export XDG_CONFIG_HOME=<throwaway>                           # never touch the operator's ~/.config
knowledge --base-url http://localhost:8766 init …            # then: save → list → search → read → projects → usage
```
Prove: `save` round-trips through `read`; a second `save` 409s and `--overwrite` succeeds; `projects` shows the project *after* the first save and the empty-state line before; `usage` reflects the writes; bad tags (count **and** uppercase) never reach the server.

Regressions — each must match S1/S2's recorded baseline exactly:

```
cd cli && uv run pytest -q          # 22 passed + the new ones
uv run pytest -q                    # root: 65 passed, 12 skipped — unchanged
python3 scripts/plugin_parity.py    # exit 1, exactly 34 issues, 0 cli/ mentions  (no new debt: D-P13-5)
git status --porcelain              # only cli/ + works/ — no root file touched
python3 scripts/workflow.py validate
```

Then: `result.md`, the `phase.md` cross-slice notes, and the `phase.md` **Doc impact** line — including that **Open Question (b) is now resolved** and that decision 1 above **overrides DECOMP's `phase.md:40`**. No slice runs `doc-new-version`; `P13.REVIEW` consolidates.

Leave the box as S2 did: `docker compose stop` (never `-v`), `uv tool uninstall knowledge-cli`, and record anything left behind.
