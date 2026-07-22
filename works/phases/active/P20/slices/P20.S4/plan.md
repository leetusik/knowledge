# P20.S4 — ship + live verify (operator-gated push + deploy + clean-env installer E2E)

## Context

Everything P20 built is repo-only: the installer + hero + CLI fixes (S1), the two designed sections + `/SKILL.md` (S3). Shipping = **operator-gated `git push` of main** (the `git+` install form serves GitHub main → S1's CLI changes go live to installer users) + **prod deploy** (web image rebuild bakes `public/install.sh`, `public/SKILL.md`, the new hero and sections). Unlike P19.S5 this cutover carries **no migration, no new service, no edge change** — `Production Deploy` (or `deploy/deploy.sh`) as-is; no alembic step. **D11's trigger does NOT fire** (no compose service-set/health-gate change) — record that, don't act on it. Shape: the P19.S5 two-stage pattern — Stage A (prepare + preflight + runbook) → `needs_operator` → operator gate → Stage B (live verify) → `done`. Executor: `slice-executor-high`, dispatched twice.

## Stage A (executor dispatch 1): preflight + runbook

1. **Read-only prod preflight** against `https://knowledge.hi2vi.com`: `GET /healthz` (expect 200 baseline); the **P20 flip probes** — `GET /install.sh` and `GET /SKILL.md` (expect **404 now → 200 after deploy**); landing HTML still carries the broken `uv tool install knowledge-cli` hero and no `id="agents"`/`id="skill"` (pre-P20 baseline). Git-state inference (read-only): `git fetch` + `origin/main` vs local HEAD — list what the push ships (P19 tail + all five P20 commits).
2. **Local mechanics proof (no push, no prod mutation):** run `bash web/public/install.sh` in an isolated env — temp `HOME`, temp `UV_TOOL_DIR`/`UV_TOOL_BIN_DIR`, temp `XDG_CONFIG_HOME`, PATH without any existing `knowledge` — proving the script mechanics (uv detection, install step reaches uv, PATH remedy wording, next-step print). Note honestly: it installs **pre-P20 GitHub main** until the operator pushes, so CLI behavior assertions wait for Stage B. Tear the temp env down. (CLI behavior itself is already unit-proven — 40 tests.)
3. **Write the operator runbook** into `result.md` (Stage A section), customized to this cutover:
   - **Step 1 — push (workstation):** `git push origin main`; if rejected (publish-on-write doc advanced it): `git pull --rebase origin main` then re-push.
   - **Step 2 — deploy:** dispatch the **`Production Deploy` Action** (workflow_dispatch; reconciles the box clone, rebuilds **web** — the part that matters here — force-recreates the bind-mounted api, health-gates all three services) **or** on-box `ssh oracle-cloud 'cd /opt/knowledge && deploy/deploy.sh'`. **No alembic, no seed** this time.
   - **Step 3 — verify (public, read-only):** `/healthz` 200; `/install.sh` **404→200** flip (first bytes `#!/usr/bin/env bash`); `/SKILL.md` **404→200**; landing HTML contains `install.sh` in the hero + `id="agents"` + `id="skill"`.
4. Return **`needs_operator`** with the runbook. No pushes, no prod mutations, no commits.

**Orchestrator then:** commit Stage A → `set-slice-status P20.S4 pending` → STOP and surface the runbook.

## Stage B (executor dispatch 2, after the operator clears `pending`): live verification

1. **Flip probes re-run:** `/install.sh` 200 + shebang bytes; `/SKILL.md` 200 and **byte-identical to `plugin/skills/explain/SKILL.md`** (`curl | cmp -`); landing HTML: curl hero line present, broken line gone, `id="agents"` + `id="skill"` + both D10 ledes + `KNOWN TRAP` + `href="/SKILL.md" download` present.
2. **Clean-env installer E2E (the real thing):** isolated env as Stage A (temp `HOME`/`UV_TOOL_DIR`/`UV_TOOL_BIN_DIR`/`XDG_CONFIG_HOME`; PATH hygiene; never touch the operator's real `~/.config/knowledge-kb` or uv tools) → `curl -fsSL https://knowledge.hi2vi.com/install.sh | bash` → asserts: installer completes, `knowledge --version` prints, next-step line shown.
3. **Live init E2E (throwaway account, prod):** with the isolated config home: `KNOWLEDGE_PASSWORD=<random ≥8> knowledge init --email p20-smoke+<hex>@example.com` → asserts the real output incl. **`web login: https://knowledge.hi2vi.com/login (same email + password)`** (S1) and `key: minted vk_…`; then `knowledge init --email <same> --project other` → **`key: reusing …`** (D16 live) + `project: other (created)`; then a tiny `knowledge save` → 201 `url:` ends `/documents/{id}`. Document the residue (one throwaway tenant, namespaced under `tenants/<uuid>/` — same shape as P18/P19 smokes; no delete API). Never uses operator secrets; the throwaway key stays in the temp config, torn down after.
4. Return **`done`** (or `blocked` with exact failing probe output).

**Orchestrator then:** `finish-slice P20.S4` → `validate` → commit → plan `P20.REVIEW`.

## Verification summary

Stage A: preflight table + local mechanics proof in `result.md`; `workflow.py validate`. Stage B: the three flip probes, installer E2E transcript (sanitized — never print the minted key), init/D16/save assertions, `workflow.py validate`. Doc impact (S4 appends): `operations.md` — the P20 ship shape (no-migration deploy; `/install.sh` + `/SKILL.md` live; flip probes), plus confirms S1's operations note is now live truth.

## Out of scope

No code changes (a live failure = `blocked` → fix slice, not an in-slice patch). No archive, no REVIEW work.
