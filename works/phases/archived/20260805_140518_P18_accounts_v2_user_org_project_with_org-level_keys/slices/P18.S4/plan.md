# Plan — P18.S4: CLI "default" fallback + init org-key mint + explain/setup skill text + parity

Operator-approved orchestrator plan (2026-07-22). Executor: `slice-executor-mid` (risk: medium). Read `../../phase.md` (Context + S1/S2/S3 notes — S2's endpoint paths, S3's "Org API keys" dashboard panel) and `../../intent.md`; re-verify anchors before editing.

## Goal

Align the CLI and the explain/setup skills with the org model: `"default"` project fallback, org-level key minting in `init`, truthful skill narration, parity green.

## Decisions already taken (operator-approved in this plan — do not relitigate)

1. **`DEFAULT_PROJECT` `"knowledge"` → `"default"`** (`cli/src/knowledge_cli/auth.py:64`), not a separate constant. `init --project` default lands on the signup-provisioned `"default"` (S2's `POST /app/projects` idempotently returns it); `save` outside a repo falls back to `"default"`; the `:497` predates-api.project note keeps its semantics.
2. **`knowledge init` mints an org-level key** via `POST /app/credentials` (access was always tenant-wide; this fixes attribution + narration, makes "one key, all repos" literal). `--new-key` also org-level; key-reuse logic (`auth.py:484-507`) keeps its structure; `api.project` still stored as save fallback.

## Implementation

### 1. CLI — `cli/src/knowledge_cli/{auth.py,knowledge.py,client.py}`

- `DEFAULT_PROJECT = "default"`; sanity-check `:497` note wording still true for legacy project-bound keys (light touch allowed).
- `client.py`: org-credential helper (e.g. `credential_create_org(name=..., token=session)` → `POST /app/credentials`), mirroring the project-scoped one.
- `cmd_init`: mint via the org helper; the project step becomes ensure-exists (existing `project_create` — S2 returns duplicates as 201-same-row) + store `api.project`.
- Labels: `workspace:` → `org:` (`auth.py:369,384,430,472`, docstring `:348`); grep `-i workspace` across `cli/` (labels/docstrings only — no identifier renames).
- `default_project()` docstring (`knowledge.py:93-109`): fallback story = repo basename → `api.project` → `"default"`.
- P13 bundled guide docs: grep `cli/` guide content for `"knowledge"`-default + workspace naming; update to match.

### 2. Skills

- `plugin/skills/explain/SKILL.md` (~:340): add the outside-a-repo → `"default"` fallback sentence to the project rule. Mirror **byte-identically** to `.agents/skills/explain/SKILL.md`.
- `plugin/skills/setup/SKILL.md` Connect mode: signup auto-provisions default org + default project (rewrite the "A workspace is created for them automatically" line); collapse **C2 Create a project** (get-or-create — keep a parenthetical for custom names); **C3** mints from the Dashboard **Org API keys** panel (S3's surface), not the project page; fix the ":51 bound-project attribution" sentence (org keys have no bound project; usage attributes to each save's project); align the CLI-path section with init's org-mint. Grep for any other setup-skill copies and sync them.

### 3. Tests — `cli/tests/`

Adjust assertions: `"knowledge"` default, `workspace:` labels, init's mint call (fake `POST /app/credentials` like the existing project-credential fake). Terse — adjust, don't expand.

## Out of scope

`server/**` and `plugin/templates/kb/**` (no changes expected — plugin_parity is a no-op check), web (S3 done), prod (S5), landing/hero (P20), org creation/invites (D14).

## Validation (run and record in result.md)

1. CLI suite green (note the exact command used, per `cli/` convention).
2. Root `pytest -q` green (belt-and-braces; no server diff).
3. `python3 scripts/skills_parity.py` → 0; `python3 scripts/plugin_parity.py` → 0.
4. Terse behavior smoke: `default_project()` outside a repo → `"default"` (test or one-liner).
5. `python3 scripts/workflow.py validate`.

## Wrap-up

`result.md` (what changed, validation, deviations); `phase.md` cross-slice notes (anything S5/REVIEW must know — e.g. exact init flow for the E2E script) + one-line Doc impact entries (expect: experience, product, decisions, qa). No commits, no status transitions, no doc versioning.
