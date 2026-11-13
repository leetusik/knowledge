# Result — P18.S4: CLI "default" fallback + init org-key mint + explain/setup skill text + parity

Executor: `slice-executor-mid` (risk: medium). Landed 2026-07-22. Both operator-approved
decisions in `plan.md` implemented as specified: `DEFAULT_PROJECT` retargeted (not a
separate constant), and `init` mints an org-level key via `POST /app/credentials`.

## What changed

### CLI — `cli/src/knowledge_cli/`

- **`auth.py`**
  - `DEFAULT_PROJECT = "knowledge"` → `"default"` (the signup-provisioned default project).
    Retargeted the shared constant per decision #1 — so `init --project`'s default and
    `save`'s outside-a-repo fallback both land on `"default"`. Refreshed the constant's
    comment.
  - `workspace:` → `org:` labels: the three `print(f"workspace: …")` lines
    (`cmd_login`/`cmd_whoami` + one more), the compound `cmd_init` line
    (`(workspace: …)` → `(org: …)`), the `cmd_signup` docstring (`a workspace` → `an org`),
    and the `cmd_signup` "next:" hint (`# project + API key` → `# project + org key`).
  - `cmd_init`: mint switched from `client.credential_create(project["id"], …)` to the new
    org helper `client.credential_create_org(name=…, token=session)` — `POST /app/credentials`,
    `project_id NULL`. The reuse gate (same_service/same_project) **keeps its structure** per
    decision #2; only its comment was refreshed to state the key is now org-level and the gate
    re-mints when the config's recorded project changes. `api.project` still stored as the
    save fallback. `project["id"]` is no longer referenced anywhere (the org mint takes no
    project id); the `project` var is still used for the created/existed print.
  - `_ensure_project` docstring updated: `POST /app/projects` is get-or-create server-side
    since S2, so the list-first is now belt-and-braces (dupes can't accrue) — light touch,
    structure unchanged.
  - The predates-`api.project` note (formerly `:497`) left as-is: it fires only when reusing
    a **legacy** project-bound key, for which "usage is metered against the key's own project"
    is still true. Semantics preserved.
- **`client.py`**: added `credential_create_org(name=None, token=None)` → `POST /app/credentials`,
  mirroring the project-scoped `credential_create` (same show-once contract, no project id).
- **`knowledge.py`**: `default_project()` docstring rewritten — fallback story is now
  repo basename → `api.project` → the literal `"default"` project, noting the write path
  get-or-creates any name so `"default"` always resolves. Code unchanged
  (`auth.stored_project() or auth.DEFAULT_PROJECT` now yields `"default"`).
- **`guide.py`** (P13 bundled agent contract): `--project` default `knowledge` → `default`;
  the two-token section now notes the `vk_` is **org-level** (one key, every repo); the save
  section's outside-a-repo fallback now names `default` and states the server get-or-creates
  any project name.

### Skills

- **`plugin/skills/explain/SKILL.md`** + **`.agents/skills/explain/SKILL.md`**: added the
  outside-a-repo → `default` fallback sentence to the project rule (§5). Applied identically
  to both copies (bodies stay byte-identical — `skills_parity` PASS). The skill's resolver
  does **not** read `api.project`, so the skill's fallback is just repo-name → `default`
  (unlike the CLI's fuller chain, which does read `api.project`).
- **`plugin/skills/setup/SKILL.md`** Connect-mode rewrite:
  - Mode blurb + Connect intro: "one ingest key" → "one **org-level** ingest key"; "their
    own tenant" → "their own org".
  - "One key, all repos" paragraph: fixed the stale bound-project attribution sentence — an
    org key has **no** bound project; one key authorizes every project and usage attributes to
    whichever project each save targets.
  - **C1**: "A workspace is created for them automatically" → "A **default** org and a
    **default** project are created for them automatically" (matches S3's web signup copy).
  - **C2** collapsed from "Create a project" to "Projects are automatic — nothing to create"
    (get-or-create + auto-provisioned default), keeping a parenthetical for optional named
    projects.
  - **C3** now mints from the **Dashboard → Org API keys** panel (S3's surface — heading,
    "New key", "Key name", "Create key", the "Copy your new key now" show-once modal), not a
    project page; flagged as org-level.
  - **C5**: verify report "their tenant" → "their org"; the 401 remediation points to
    **Dashboard → Org API keys → New key** (was "project page → API keys").
  - CLI-path ("Prefer the terminal?") section aligned with init's org-mint (sign up →
    default project → org key → config).
  - No second setup-skill copy exists (`.agents/skills/` mirrors only `explain`), so nothing
    else to sync. `plugin_parity` does not cover skills (skills aren't a shipped_dir).

### Tests — `cli/tests/test_auth.py`

- `"knowledge"` → `"default"` in the two config-project assertions (init-writes + backfill).
- `test_init_writes_…`: added a pin that init mints via `POST /app/credentials` (org) and
  **never** hits `/app/projects/{id}/credentials` — guards the S4 behavior change.
- Renamed `test_init_mints_a_key_bound_to_the_project_it_is_asked_for` →
  `test_init_remints_when_the_configured_project_changes` with an honest docstring (org keys
  aren't project-bound; the re-mint is the preserved reuse-gate shape, not a server binding).
- `FakeApi` docstring updated to note the `/credentials` branch serves both the per-project
  and the org mint. (The existing `path.endswith("/credentials")` branch already matched the
  new org endpoint, so the fake needed no functional change.)

## Validation

| Command | Result |
| --- | --- |
| `cd cli && uv run pytest -q` | **PASS** — 39 passed (baseline was 39; no net count change) |
| `.venv/bin/python -m pytest -q` (root) | **PASS** — 70 passed, 19 skipped (Postgres-gated accounts tests; no server diff this slice) |
| `python3 scripts/skills_parity.py` | **PASS** (exit 0) — explain copies body-identical |
| `python3 scripts/plugin_parity.py` | **PASS** (exit 0) — no-op, no `server/`/`tests/` change |
| `default_project()` smoke (isolated non-git temp dir, no config/env) | **PASS** → `"default"`; `DEFAULT_PROJECT == "default"` |
| `python3 scripts/workflow.py validate` | **PASS** — Workflow validation passed |

## Deviations from plan.md

- None material. Two judgment calls within the plan's intent, both flagged in `phase.md`:
  1. Kept `_ensure_project`'s client-side list-first (didn't collapse init to a bare
     `project_create`) — preserves the idempotency test and is belt-and-braces atop S2's
     server-side get-or-create. The plan's "ensure-exists (existing `project_create`)" is
     satisfied either way.
  2. Kept the `init` reuse-gate's `same_project` re-mint structure exactly (decision #2:
     "keeps its structure"). This means `init --project other` mints a *second* org key even
     though one org key would serve both projects — a mild tension with "one key, all repos".
     Flagged for REVIEW as a candidate follow-up; not changed here (out of the plan's intent).

## Doc impact (appended to phase.md running list)

- **experience** (S4) — CLI/skill onboarding narration: `save` outside a repo → `default`;
  `init` mints an **org-level** key (`POST /app/credentials`), CLI labels read "org" not
  "workspace"; setup Connect mode mints from the Dashboard **Org API keys** panel with the
  auto-provisioned default org/project; the guide names the org-level key + `default` fallback.
- **product** (S4) — user-facing naming is now "org" across the CLI + explain/setup skills;
  one org key serves every repo (made literal, not just enforced); projects get-or-create.
- **decisions** (S4) — (a) retargeted `DEFAULT_PROJECT "knowledge"→"default"` rather than a
  separate save-fallback constant (the signup default project makes the two coincide);
  (b) `init` mints org-level, `--new-key` too; (c) reuse-gate structure preserved (re-mints on
  a recorded-project change even though org keys aren't project-bound — flagged as a possible
  follow-up); (d) explain skill fallback is repo→`default` only (its resolver ignores
  `api.project`), the CLI keeps the fuller repo→`api.project`→`default` chain.
- **qa** (S4) — CLI `test_auth.py` adjusted: `default` project assertions, an org-mint-endpoint
  pin, and the renamed reuse-gate test. 39 CLI tests green; no test-count expansion.
