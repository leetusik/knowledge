# P13.DECOMP — Result

Decomposed P13 into 5 bare middle-slice folders, seeded the phase notebook, and filed the plugin-parity deferred job. No CLI code, no slice `plan.md`, no doc versions, no commits.

## Research verification (against the current tree, 2026-07-17)

All six load-bearing facts were verified **before** anything was created. **No material drift** → the 5-slice shape was kept exactly as planned.

| Plan's claim | Verdict |
|---|---|
| **1.** `onboarding_smoke.py` drives the full sequence; 326 lines; `FROZEN_201_KEYS` at `:51-55` | ✅ exact (326 lines; keys at `:51-55`) |
| **2.** Config seam is prose-only — zero code hits for `knowledge-kb` in `*.py`/`*.ts`/`*.sh` | ✅ exact (grep returns nothing; only SKILL.mds, README, doc versions). Schema `setup/SKILL.md:192-201`, resolver `explain/SKILL.md:31-78` (heredoc closes at `:78`), `chmod 600` at `setup/SKILL.md:223`, local-fallback STOP `explain/SKILL.md:216-220`, "never writes a bearer token" `:203` — all exact |
| **3.** Edge routes only `/api/` + `= /healthz`; `/` catches all into mkdocs; `/auth/*`+`/app/*` 404 | ✅ exact (`deploy/knowledge.conf:134-165`; frozen-contract comment `:136-139`). `compose.prod.yml` services = `api`, `site`, `postgres` — no web app ✅ |
| **4.** No server-side rate limiting anywhere; only the Next BFF's 5/IP/15min, bypassed by direct calls | ✅ exact (grep for `limit_req|slowapi|ratelimit|limiter` in `server/` finds only `embeddings.py`'s Gemini retry) |
| **5.** Root is a virtual project: no `[build-system]`, `[tool.uv] package = false`; no `[project.scripts]` anywhere | ✅ exact (`grep project.scripts --include=*.toml` → exit 1). `cli/` does not exist yet ✅ |
| **6.** Vocky has no CLI; its P5 is an unexecuted stub | ✅ exact (P5 holds only `phase.md`/`intent.md`/`phase.json` + 2 bare `slice.json`; no plans, no results. `grep -rniE "typer\|click\|argparse" src/` → only JS `addEventListener("click")` in `admin_assets/app.js`, zero Python. Packaging shape `pyproject.toml:36-42` ✅; `smoke.py` = 198 lines) |

All API anchors spot-checked and **exact**: `auth_api.py` (`:42` `SESSION_TTL=30d`, `:54` `min_length=8`, `:109`/`:134`/`:157`/`:167`), `app_api.py` (`:105`/`:112`/`:123`/`:137`/`:148`/`:173`/`:187`), `usage_api.py` (`:89`/`:118`), `main.py` (`:241`/`:301`/`:383`, `DocumentIn` `:366-380`, frozen keys `:542-561`), `documents.py:61-62` (tags 2–5), `api_auth.py:130` (`_resolve_tenant_bearer`), `compose.yml:8,19` (8765/8766), `compose.prod.yml:56` + `server/config.py:41` (`KB_PUBLIC_BASE_URL`).

### Three corrections carried into `phase.md` (none change the breakdown)

1. **Parity is worse than the plan stated.** `python3 scripts/plugin_parity.py` → exit 1, **34 issues = 26 completeness + 8 byte-drift**, not "25 completeness + 5 drift". The 8 drift files are `server/config.py`, `server/db.py`, `server/main.py`, `server/reindex.py`, `server/search.py`, `pyproject.toml`, `uv.lock`, and parameterized `compose.yml`. Same conclusion (not P13's job → deferred), corrected numbers in the D9 reason. `git rev-list --count origin/main..main` → **29** ✅ (CI green only because nothing is pushed).
2. **Free-form-project anchor sharpened.** The claim is precisely at **`main.py:396`** — `project = documents_mod.validate_project(body.project)`, a convention check only, never compared to `ctx.project_id`. The plan's `:565-571` is the `UsageHint` that *carries* the unchecked name. Both recorded.
3. **New finding for S5, not in the plan — the throttle is not a free line of nginx.** `deploy/knowledge.conf:32` + `:35-40` **explicitly ban `limit_req_zone` in this vhost**: zone names live in the global `http` context across the whole `conf.d/` tree, `hi2vi.conf` owns the tree's only one (`hi2vi_contact`), and a duplicate name is a hard `nginx -t` failure that **blocks the reload for every site on the edge**. Worse, the conf's own stated reason for needing no limiter — "every `/api/*` call is bearer-gated … single known consumer (roughly one write a day)" — **stops being true the moment S5 publishes an unauthenticated `/auth/*` password grant**. So S5 must consciously choose a uniquely-named zone (house rules re-read in full) or a server-side limiter. This *confirms* S5's `high` risk and is the first thing its plan should resolve. Cloudflare real-IP restore is already in place (`:83`, "any future limiter" keys off real visitors) — the groundwork exists.

Also noted: `web/src/app/api/auth/login/route.ts:14-16` says "nginx at the edge is the real limit (**P14**)" — P13.S5 pulls that forward; whoever lands S5 should fix the comment.

## Slices created

| Slice | Name | kind | risk | order | depends_on |
|-------|------|------|------|-------|------------|
| P13.S1 | CLI package + config seam + API client | implementation | medium | 1 | — |
| P13.S2 | Auth & onboarding commands | implementation | high | 2 | P13.S1 |
| P13.S3 | Knowledge commands | implementation | medium | 3 | P13.S2 |
| P13.S4 | Agent-readable guide docs + discovery | implementation | medium | 4 | P13.S3 |
| P13.S5 | Expose the control plane at the edge + throttle /auth + E2E CLI smoke | implementation | high | 5 | P13.S3 |

Created verbatim from the plan. Each new slice folder holds **only** `slice.json` — no `plan.md`/`result.md` pre-filled. Chain S1→S2→S3, then S4 and S5 both fan out from S3. Two `high` (S2 credential handling, S5 public auth exposure), three `medium`, **none `low`**.

## phase.md sections seeded

**Context** (the "you are my user" framing; CLI-as-productization-of-`onboarding_smoke.py`; the config seam as the payoff; the edge gap + throttle obligation; the virtual-project packaging constraint; vocky as reference-only); **Decomposition** (intro + five per-slice bullets + "Why 5"); **Findings & Notes** → Decisions **D-P13-1…6** + the untouched-by-decree note, verified **Implementation anchors**, **Pre-existing conditions** (parity + tenant-#1 `url`), and **Cross-slice notes** (the two DECOMP notes incl. the `limit_req_zone` finding); **Constraints** (8, incl. the conf.d house rules); **Open Questions** (a)–(d); and the **Doc impact** running list (api, security, product, experience, operations, architecture, decisions, qa — marked *anticipated*, for each slice to confirm/correct as it lands).

## Deferred job

**D9** — `works/deferred/open/D9` — "plugin/templates/kb drift: P10-P12 SaaS server files unshipped, plugin_parity exits 1", trigger: before the next push to `origin/main`. Open deferred count **5 → 6** ✅.

## Validation

- `python3 scripts/workflow.py validate` → **Workflow validation passed.** (exit 0)
- `python3 scripts/workflow.py next` → `current_slice=P13.DECOMP`, `next_slice=P13.S1` ✅
- `works/backlog.md` → P13.S1–S5 listed in order with `P13.REVIEW` last ✅; slice.json metadata re-read and matches the table above ✅
- `works/deferred.md` → open count 6 ✅
- `git status --porcelain` → changes confined to `works/` (+ the pre-existing unrelated modifications present at session start). **No `cli/`, `server/`, `tests/`, `web/`, `deploy/` files touched; no `docs/versions/*`; no commit.**

## Deviations

None to the breakdown — all five slices created with the planned ids/names/kind/risk/order/depends_on. Two accuracy corrections to the plan's prose were folded into `phase.md` + the D9 reason (parity 34 issues not 25+5; free-form-project anchor `main.py:396`), and one substantive **new** finding was added to `phase.md` that the plan did not contain: the `limit_req_zone` ban at `deploy/knowledge.conf:32,35-40` and the collapse of its "no limiter needed" rationale once `/auth/*` is public. That finding raises no doubt about S5's `high` tier — it justifies it.
