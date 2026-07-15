# Result — P7.S4: Shipped explain skill

**Status: done.** Authored `plugin/skills/explain/SKILL.md` — the plugin-shipped
`/knowledge:explain` skill. Same house style and API-first write semantics as the
workspace source skill, now config-driven (env → config file → legacy → stop) with
bearer support and a strict local-only fallback rule. The workspace source skill
(`.claude/skills/explain/SKILL.md`) was NOT modified.

## Deliverable

- `plugin/skills/explain/SKILL.md` (new; only file created).

## Validation matrix — all run, all pass

### 1. `claude plugin validate` — PASS

- `claude plugin validate ./plugin` → `✔ Validation passed` (exit 0).
- `claude plugin validate ./plugin --strict` → `✔ Validation passed` (exit 0).
- Frontmatter parses; skill discovered under `plugin/skills/explain/`.

### 2. Config-resolution snippet matrix — PASS

The skill's OWN `python3 -c` snippet (step 2) was extracted **verbatim** from the
authored `SKILL.md` (lines 31–78, dedented) and run under isolated environments
(`subprocess` with a clean env dict = `env -i` equivalent). The snippet emits
`KEY=VALUE` lines: `KB_STATUS`, `KB_ROOT`, `KB_API_BASE_URL`, `KB_API_TOKEN`,
`KB_SITE_BASE_URL`, `KB_LOCAL_FALLBACK` (or `KB_STATUS=unconfigured` /
`KB_STATUS=error`).

| Case | Setup | Outcome |
|------|-------|---------|
| (a) env overrides win | all 3 env vars + decoy config file | `KB_ROOT`/`KB_API_BASE_URL`/`KB_API_TOKEN` = env values; `KB_SITE_BASE_URL` = decoy config's site (no env override exists for site — correct) |
| (b) config file resolves | full config.json, no env | all four values from the config file |
| (c) config omits keys | config = `{"kb_root":"/c/kb"}` only | `api.base_url`→`http://localhost:8766`, `site.base_url`→`http://localhost:8765`, token→empty (documented defaults) |
| (d) legacy convention | real `HOME`, `XDG_CONFIG_HOME` pointed at empty temp dir, no env | `KB_ROOT=/Users/sugang/projects/personal/knowledge`, api `:8766`, site `:8765`, no token, `KB_LOCAL_FALLBACK=yes` |
| (e) nothing resolves | empty temp HOME + empty temp XDG, no env | single line `KB_STATUS=unconfigured` (unambiguous sentinel) |

Extra guards proven:
- (c2) local `kb_root` containing `mkdocs.yml` → `KB_LOCAL_FALLBACK=yes`.
- (err) corrupt `config.json` → `KB_STATUS=error` + `KB_ERROR=...` (no silent
  fallthrough to legacy — a defensive addition; a present-but-unreadable config
  stops rather than masquerading as unconfigured).

Real machine note for (d): the operator's real `~/.config/knowledge-kb/config.json`
does **not** exist yet, and `~/projects/personal/knowledge/mkdocs.yml` does — so the
legacy tier is what a pre-`/knowledge:setup` install on this machine hits today.
Isolating `XDG_CONFIG_HOME` guards against a future real config leaking into the test.

### 3. Remote-config guard (local-only fallback rule) — PASS

Config with a non-routable `api.base_url` (`http://10.255.255.1:8766`) and **no**
`kb_root` → `KB_STATUS=configured`, `KB_ROOT=` (empty), `KB_LOCAL_FALLBACK=no`. The
skill's step 6 decision is unambiguous and now **executable, not just prose**:
`KB_LOCAL_FALLBACK=no` → report the transport failure and STOP, write no files. This
is the SaaS-open safety rule (a hosted KB never triggers a local file write).

### 4. Read-through diff vs the source skill — PASS

Every MUST-preserve item survived verbatim-in-substance. Old→new mapping by step:

| Step | Source | Shipped | Change |
|------|--------|---------|--------|
| Frontmatter `description` | KB = `~/projects/personal/knowledge` | "your own personal knowledge base (the one `/knowledge:setup` created)" | generic rewrite; **same "use ONLY when persisted" guard verbatim** |
| Frontmatter `allowed-tools` | includes `Bash(git -C ~/projects/personal/knowledge:*)` | **dropped** that entry; rest identical | deliberate — KB path no longer fixed, so the rare fallback git commands take a normal permission prompt (NOT replaced by a broad `Bash(git:*)`) |
| Frontmatter `name` / `argument-hint` | `explain` / `<topic> [here]` | unchanged | — |
| Step 1 Resolve the topic | — | unchanged (verbatim) | — |
| Step 2 | "Locate the KB" (check fixed `mkdocs.yml`, STOP if missing) | "Resolve the KB configuration" — one `python3 -c` snippet, env→config→legacy→unconfigured; unconfigured → run `/knowledge:setup` | fully rewritten |
| Step 3 Research | — | unchanged (verbatim) | — |
| Step 4 Style contract | structure choices / devices / length guide / mini-glossary | unchanged (verbatim, whole) | — |
| Step 5 Save via API | POST to `http://localhost:8766/api/documents` | POST to `<KB_API_BASE_URL>/api/documents`; optional `-H "Authorization: Bearer <KB_API_TOKEN>"` when token non-empty | **merge `python3 -c` command byte-identical**; POST-once + 201/409/422/401 branch semantics preserved; "NEVER file-fallback on an HTTP error; fallback ONLY on curl exit ≠ 0" preserved; 401 text updated to point at token config (`api.token` / `KB_API_TOKEN`, re-run `/knowledge:setup`) instead of "the server has a token set"; meta.json field set (`title`,`project`,`tags`,`source_repo`,`co_authored_by`) + `co_authored_by` convention unchanged |
| Step 6 Fallback | hardcoded `~/projects/personal/knowledge` file write + `docs/index.md` marker ladder + scoped `git -C ~/...` commit | LOCAL-ONLY: gated on `KB_LOCAL_FALLBACK=yes`; `KB_LOCAL_FALLBACK=no` → report + STOP, write nothing; every path is `<KB_ROOT>` (file write, marker insert ladder, `git -C <KB_ROOT>` add/commit pair) | frontmatter shape (double-quoted title, 2–5 lowercase-kebab tags, `source.project`/`source.repo`), the `<!-- explain:recent -->` marker insert ladder, scoped commit / never push / never touch another repo all preserved; git commands noted as prompting for permission |
| Step 7 Project copy | — | unchanged (verbatim) | — |
| Step 8 Report | fallback view `http://localhost:8765/...`; reindex against `~/projects/personal/knowledge` | fallback view `<KB_SITE_BASE_URL>/...`; reindex `POST /api/reindex` to `<KB_API_BASE_URL>` or `docker compose up -d` in `<KB_ROOT>` | API-path (response `url`) unchanged |

The two spelled commands verified: merge `python3 -c` command is byte-identical to
source line 107; curl POST base is identical modulo the resolved base URL and the
optional bearer header. The four status branches (201/409/422/401) are all present
and their semantics unchanged.

### 5. No live POST — respected

No document was POSTed to the operator's KB. Only a liveness GET was run:
`curl -sS --max-time 5 http://localhost:8766/healthz` →
`{"status":"ok","docs_root":"/repo/docs","db":"ok","documents":6}` (exit 0). This
confirms the API base the legacy/default config resolves to is reachable; no more.

### 6. `python3 scripts/workflow.py validate` — PASS (`Workflow validation passed.`)

## Server-contract grounding (read-only)

Confirmed against `server/main.py` + `server/config.py` (which ship byte-identical in
the template payload): `POST /api/documents` returns 201; `require_auth`
(`main.py:65–74`) is a no-op when `KB_API_TOKEN` is unset, else requires an exact
`Authorization: Bearer <token>` header (else 401); `public_base_url()` defaults to
`http://localhost:8765`. The skill's API details match the shipped server exactly.

## Deviations from plan.md

- **The "Recreating from scratch" README reference was intentionally dropped from the
  shipped skill's step 2.** The plan's step-2 spec (2.4) says the unconfigured branch
  points at `/knowledge:setup` (or the env vars) — which I followed exactly — rather
  than the source skill's "re-scaffold from the README's Recreating-from-scratch
  section." An earlier DECOMP finding (phase.md) had anticipated the shipped explain
  skill would still reference that README section; the S4 plan supersedes it, so the
  shipped skill has **no** dangling README reference. Recorded for S6 (below).
- Added two defensive branches beyond the plan's five tiers: `KB_STATUS=error` for a
  present-but-unparseable config, and a `KB_LOCAL_FALLBACK` flag computed by the same
  snippet (turning the plan's "text-logic" remote-guard check #3 into an executable
  one). Neither changes any of the plan's five resolution outcomes; both are within
  mid-tier judgment and make the skill's decisions unambiguous for the running model.

## Notes recorded to phase.md

- Findings subsection "### P7.S4 landed" — the config.json schema S5 must write (exact
  key paths + defaults) and the resolution snippet's output contract.
- Two Doc impact lines (`api`, `security`) per the plan.
