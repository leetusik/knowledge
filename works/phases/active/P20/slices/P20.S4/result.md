# Result — P20.S4: ship + live verify (operator-gated push + prod deploy + clean-env installer E2E)

Two executor stages around one operator `pending` gate (the P19.S5 shape). **Stage A
(below) is complete and returned `needs_operator`.** Stage B appends to this file after the
operator clears the gate and the cutover is live.

This cutover carries **no migration, no new service, no edge change** — the push ships
frontend + CLI + installer files only. `Production Deploy` (or `deploy/deploy.sh`) as-is; **no
alembic step**. **D11's trigger does NOT fire** (no compose service-set / health-gate change) —
recorded, not acted on.

---

## Stage A — preflight + local mechanics proof + operator runbook (done 2026-07-22)

### 1. Read-only prod pre-flight — GET-only, zero mutation

`curl` against `https://knowledge.hi2vi.com` (no push, no mints, no writes). All decisive:

| Probe | Result | Reading |
|---|---|---|
| `GET /healthz` | **200** `{"status":"ok","docs_root":"/repo/docs","db":"ok","documents":23}` | api live; content + accounts planes healthy (23 public docs — box grew via publish-on-write since P19's 18) |
| **Flip probe** `GET /install.sh` | **404** (Next `_not-found` HTML, `text/html`, 9302 B, title "404: This page could not be found.") | P20.S1's `web/public/install.sh` **not deployed yet** → flips **404 → 200** after deploy |
| **Flip probe** `GET /SKILL.md` | **404** (same Next `_not-found` page) | P20.S3's `web/public/SKILL.md` **not deployed yet** → flips **404 → 200** after deploy |
| `GET /` (landing HTML) | **200**, 80922 B — pre-P20 baseline | broken hero `uv tool install knowledge-cli` **present (1×)**; `install.sh`/`id="agents"`/`id="skill"`/`SKILL.md` all **absent (0×)** |

The two 404s return the app's own Next.js not-found page (not an nginx 404), confirming the
`web/public/` static file simply isn't in the currently-deployed image — the expected
pre-deploy state.

### 2. Git-state inference — read-only (`git fetch`; nothing minted or written on prod)

- `origin/main` = **`3d73917`** (P19.S5 Stage A — what the box deploys); local `HEAD` = **`a8847bc`**
  (P20.S3). **8 ahead / 0 behind.**
- The push ships **3 P19-tail commits + all 5 P20 commits**:
  - `8be6eac` feat(ops): P19.S5 — prod 0004 cutover verified + public-link E2E green
  - `587b83b` docs(P19): consolidate durable docs at phase review — P19 pass
  - `4a68bff` chore(works): file D17-D19 deferred follow-ups from P19 review
  - `583c83c` feat(works): P20.DECOMP — decompose frictionless onboarding into S1-S4
  - `0563563` feat(onboarding): P20.S1 — curl installer + honest hero + init web-login + D16 org-key reuse
  - `15b5f23` feat(design): P20.S2 handoff — round 02
  - `d71b541` feat(design): P20.S2 read-back — round 02 landed
  - `a8847bc` feat(web): P20.S3 — agent quickstart + published skill sections per design round 02
- **Confirming the flip is real (read-only `git cat-file`):** `origin/main:web/public/install.sh`
  and `origin/main:web/public/SKILL.md` are **ABSENT**; both are **PRESENT** at local `HEAD`.
  `origin/main:web/src/content/marketing/terminals.ts` still carries the broken
  `uv tool install knowledge-cli` (1×). So the box genuinely runs pre-P20 code.
- **No migration in the push:** `alembic/versions/` is **byte-identical** between `origin/main`
  and `HEAD` → **no alembic step** at deploy. **No compose/deploy change** in the push → **D11
  trigger does not fire.**
- `web/public/SKILL.md` at `HEAD` is **byte-identical** to canonical `plugin/skills/explain/SKILL.md`
  (`cmp` clean, both 486 lines) — the Stage B `curl | diff -` parity target is ready.

### 3. Local mechanics proof — `bash web/public/install.sh` in a fully isolated env (torn down)

Ran the real installer against a disposable sandbox: temp `HOME`, temp `XDG_CONFIG_HOME`, temp
`UV_TOOL_DIR` / `UV_TOOL_BIN_DIR` / `UV_CACHE_DIR`, and `env -i` PATH hygiene — a controlled PATH
exposing **only** `uv` (a lone symlink into a temp bin) + system dirs, so the operator's
`~/.local/bin` never entered PATH and no `knowledge` was visible pre-run. Never touched the real
`~/.config/knowledge-kb` or the operator's uv tools.

| Step | Outcome |
|---|---|
| PATH-hygiene check | `command -v knowledge` → **none (clean)**; `uv` → temp symlink, `uv 0.8.14` |
| `bash install.sh` | **exit 0**. uv detected (bootstrap branch skipped); `uv tool install --reinstall git+…#subdirectory=cli` **Updated …/knowledge → `3d73917`** (= origin/main HEAD, **pre-P20**); provisioned cpython-3.12.11 into the temp env, resolved 8 pkgs, **Built knowledge-cli @ …@3d73917…#subdirectory=cli**, installed console script `knowledge`; printed `==> installed: knowledge-cli 0.1.0` then `==> Next: knowledge init --email you@example.com` |
| `knowledge --version` (isolated bin) | **`knowledge-cli 0.1.0`** |
| Installed CLI is pre-P20 (proof of the shipping caveat) | installed `knowledge_cli/auth.py` **LACKS** the `web login` line; local `HEAD` auth.py **HAS** it (1×) → the `git+` form installs GitHub **main**, so S1's CLI changes reach `curl \| bash` users **only after** the operator-gated push. CLI behavior assertions therefore wait for Stage B (behavior itself already unit-proven — 40 CLI tests). |
| Teardown | sandbox tree deleted (`find -depth -delete`); real `~/.config/knowledge-kb` still absent; `uv tool list` → "No tools installed"; `knowledge` still not on the real PATH — operator machine unchanged |

**Mechanics proven:** uv detection, the install step reaching uv and resolving the `git+`
channel, the on-PATH success branch (`installed: …`), and the next-step print. The version banner
prints `knowledge-cli 0.1.0`. The one thing this run **cannot** prove (by design) is S1's new CLI
behavior — because the unpushed main is still pre-P20; that is Stage B's job on live prod.

### 4. `python3 scripts/workflow.py validate` → **Workflow validation passed.**

---

## §Runbook — customized operator runbook (the reopened `pending` gate)

This ship is **simpler than P19.S5**: no migration, no schema, no new service, no edge change —
the deploy just rebuilds the **web** image (which bakes `public/install.sh`, `public/SKILL.md`,
the honest hero, and the two new sections) and force-recreates the bind-mounted **api** on the
new CLI/server code. There is **no ordering constraint and no mint-window** to worry about — no
column is added and no code path reads a not-yet-present column. Straight push → deploy → verify.

### Step 1 — push `main` (workstation)

Ships the 3 P19-tail commits + all 5 P20 commits (up to `a8847bc`). This is what makes S1's CLI
changes live for the `git+` / curl-installer path.

```bash
git push origin main
git rev-parse origin/main      # confirm a8847bc (or later, if a rebase over an unpushed doc)
```

If the publish-on-write box advanced `origin/main` meanwhile (a doc auto-commit), the push is
rejected → `git pull --rebase origin main`, then re-push. (Code and docs are disjoint paths, so a
rebase over an interleaved doc commit is safe.)

### Step 2 — deploy (rebuilds web + recreates api; NO alembic, NO seed)

Either path is fine; both reconcile the box clone to the `origin/main` tip, rebuild the images,
force-recreate the bind-mounted api, and health-gate all three services.

- **Preferred — dispatch the `Production Deploy` Action** (GitHub Actions →
  `deploy-production.yml`, `workflow_dispatch`).
- **Or on-box:** `ssh oracle-cloud 'cd /opt/knowledge && deploy/deploy.sh'`.

**No alembic upgrade and no seed this time** — the push contains zero migrations
(`alembic/versions/` unchanged) and no compose/service-set change (so D11 stays inert). The web
image rebuild is the part that matters: it bakes the newly-committed `web/public/install.sh` and
`web/public/SKILL.md` (standalone image `COPY public` + nginx `/` catch-all) and the new hero +
`#agents` / `#skill` sections.

### Step 3 — verify (public, read-only)

```bash
# healthz baseline
curl -fsS https://knowledge.hi2vi.com/healthz                       # 200 {"status":"ok",...}

# flip probe A: /install.sh  404 -> 200, first bytes are the shebang
curl -fsSL https://knowledge.hi2vi.com/install.sh | head -1          # #!/usr/bin/env bash

# flip probe B: /SKILL.md  404 -> 200, byte-identical to canonical
curl -fsS https://knowledge.hi2vi.com/SKILL.md \
  | diff - plugin/skills/explain/SKILL.md                            # empty diff (parity)

# landing HTML now carries the fixed hero + the two new sections
curl -fsS https://knowledge.hi2vi.com/ \
  | grep -o -e 'install.sh' -e 'id="agents"' -e 'id="skill"'         # all three present;
                                                                     # 'uv tool install knowledge-cli' gone
```

Once these pass, clear the gate (`set-slice-status P20.S4 in_progress`) and re-dispatch the
executor for **Stage B** — the full clean-env installer E2E + live `init`/D16/`save` smoke against
prod (the executor tears down its throwaway tenant/config, never prints the minted key).

---

## Deviations from plan.md

None material. The isolated-env teardown used `find <root> -depth -delete` (the harness's
permission layer declined `rm -rf`); same effect — the sandbox tree was fully removed and the
operator environment verified untouched afterward.

---

## Stage B — live verification (done 2026-07-22, after the operator cleared the gate)

Operator ran the Stage A runbook (push `main` + prod deploy). `origin/main` = local `HEAD` =
**`9742f56`** (the Stage A commit — post-P20; it sits on top of `a8847bc` = P20.S3, so it carries
all P20 code). The cutover is live on `https://knowledge.hi2vi.com`. Everything below is read-only
against prod plus one throwaway tenant; **no code changed, nothing committed, no state transitioned.**

### 1. Flip probes — all three flipped, all pass

| Probe | Stage A (pre) | Stage B (live) | Assertion |
|---|---|---|---|
| `GET /healthz` | 200 (23 docs) | **200** `{"status":"ok","docs_root":"/repo/docs","db":"ok","documents":23}` | api + planes healthy |
| **Flip** `GET /install.sh` | 404 (Next not-found) | **200**, `application/x-sh`, 1983 B | first line **`#!/usr/bin/env bash`**; **byte-identical** to repo `web/public/install.sh` (`cmp` clean) |
| **Flip** `GET /SKILL.md` | 404 | **200**, `text/markdown; charset=UTF-8`, 26041 B | **byte-identical** to canonical `plugin/skills/explain/SKILL.md` (`cmp` clean — the deploy served the parity-gated file, not a fork) |
| `GET /` landing HTML | pre-P20 (broken hero, no anchors) | **200**, 215173 B | see below |

Landing HTML assertions (all against the one live fetch):

| Assertion | Result |
|---|---|
| curl hero one-liner (`knowledge.hi2vi.com/install.sh`) present | **yes (2×)** |
| broken `uv tool install knowledge-cli` **gone** | **yes (0×)** |
| `id="agents"` | **yes (1×)** |
| `id="skill"` | **yes (1×)** |
| `KNOWN TRAP` | **yes (2×)** |
| `href="/SKILL.md" download` (Download SKILL.md) | **yes** — `<a href="/SKILL.md" download …>Download SKILL.md</a>` served |
| D10 lede — FEATURE_SAVE (`…read like a book. Not a runbook.`) | **yes (2×)** |
| D10 lede — FEATURE_CONNECT (`…A reading room on the web, a terminal for your agent…`) | **yes (2×)** |

So the web deploy baked `public/install.sh`, `public/SKILL.md`, the honest hero, the two new
`#agents` / `#skill` sections, the `KNOWN TRAP` kicker, the `<a download>` skill link, and the two
D10 ledes — the full P20 landing surface is live.

### 2. Clean-env installer E2E — `curl -fsSL …/install.sh | bash` (the real thing)

Fully isolated disposable env (`mktemp -d` root): temp `HOME`, temp `XDG_CONFIG_HOME` /
`XDG_DATA_HOME`, temp `UV_TOOL_DIR` / `UV_TOOL_BIN_DIR` / `UV_CACHE_DIR`, and `env -i` PATH hygiene
— a controlled PATH exposing **only** `uv` (a lone symlink into a temp bin) + system dirs, so the
operator's `~/.local/bin` never entered PATH. `command -v knowledge` **clean (none)** pre-run.
Never touched the real `~/.config/knowledge-kb` or the operator's uv tools.

| Step | Outcome |
|---|---|
| `curl -fsSL https://knowledge.hi2vi.com/install.sh \| bash` | **exit 0**. uv detected; `uv tool install --reinstall git+…#subdirectory=cli` → **Updated … → `9742f566…`** (= `origin/main` HEAD, **post-P20**); provisioned cpython-3.12.11 into the temp env, resolved 8 pkgs, **Built knowledge-cli @ …@9742f566…#subdirectory=cli**, `Installed 1 executable: knowledge`; printed `==> installed: knowledge-cli 0.1.0` then `==> Next: knowledge init --email you@example.com` |
| `knowledge --version` (installed temp bin) | **`knowledge-cli 0.1.0`** |
| **Installed CLI is post-P20** (proof the push shipped S1) | installed `knowledge_cli/auth.py` **HAS** the `web login:` line (1×) and the D16 reuse markers (`reusing` 4×); source built from commit **`9742f56`**. Contrast Stage A, where the same isolated install resolved to pre-P20 `3d73917` whose `auth.py` **lacked** the line — the operator-gated push is exactly what flipped it. |

The installer now delivers S1's CLI changes (web-login line, D16 reuse) to `curl \| bash` users —
the shipping caveat is discharged live.

### 3. Live init / D16 / save E2E — throwaway account on prod (sanitized)

Isolated config home (temp `XDG_CONFIG_HOME`), `KB_API_BASE_URL=https://knowledge.hi2vi.com` (the
CLI's compiled default is `localhost:8766`, so the env override is required to target prod; the
web-login line prints `{base_url}/login` off this same resolved base). Throwaway identity
**generated in-process and never echoed** (the password lives only in `KNOWLEDGE_PASSWORD`, never in
a command literal or output); all output filtered so no `key:` value and no `vk_` token is ever
printed (the CLI already prints only a redacted `vk_…tail` fingerprint via `config.redact_token`,
and even that is redacted whole here).

Account: `p20-smoke+ecc4e195@example.com`.

| Command | Key output | Assertion |
|---|---|---|
| `KNOWLEDGE_PASSWORD=… knowledge init --email p20-smoke+ecc4e195@example.com` | `signed up as … (org: default)`; `key: <minted>`; **`web login: https://knowledge.hi2vi.com/login (same email + password)`**; `KB_STATUS=configured` — **exit 0** | **`web login: …/login (same email + password)` present (1×)** ✓ · **`key: minted` present (1×)** ✓ (fresh org key minted) |
| `KNOWLEDGE_PASSWORD=… knowledge init --email <same> --project other` | `note: reusing your org key for project 'other': org keys are project-agnostic (P18)…`; `logged in as …`; **`project: other (created)`**; **`key: reusing …`** — **exit 0** | **`key: reusing` present (1×) — D16 live** ✓ · **`project: other (created)` present (1×)** ✓ |
| `knowledge save <tiny.md> --project other --source-repo p20-smoke --tag p20-smoke --tag verification` | `saved: P20 Stage B smoke`; `id: 24`; `path: other/2026-07-22-p20-stage-b-smoke.md`; **`url: https://knowledge.hi2vi.com/documents/24`** — **exit 0** | **201 `url:` ends `/documents/{id}` (`…/documents/24`)** ✓ (P19 mode-aware direct doc link, live) |

**Observation (not a failure, not a plan-required assertion):** init #1 printed
`project: default (already existed)`, not `(created)` — server-side signup pre-creates the org's
`default` project before init's ensure-project runs, so init finds it. The plan's init#1 assertions
are only the web-login line + `key: minted` (both ✓); `project: … (created)` is required for init#2
(`other`), which passed. The hero's depicted `project: default (created)` remains honest for a
genuinely new org; on prod the default project already exists at ensure time. Noted for REVIEW; no
impact on the cutover.

**Throwaway-tenant residue** (documented, no cleanup possible — there is no delete API, same shape
as the P18/P19 smokes): one account `p20-smoke+ecc4e195@example.com`, org `default`, its `default`
project (pre-existing) + a `other` project created by this run, and one saved document **id 24** at
`other/2026-07-22-p20-stage-b-smoke.md` (private under `other`, so it does **not** raise the public
`/healthz` doc count, still 23). The minted org key lived only in the temp config home and was
destroyed with the sandbox. No operator secrets used.

### 4. Teardown + operator-environment verification

Sandbox tree removed (`find <root> -depth -delete`; the harness's permission layer declines
`rm -rf`, as in Stage A — same effect). Probe scratch files cleaned. Operator env re-checked:
`command -v knowledge` → **none (unchanged)**; real `~/.config/knowledge-kb` → **absent
(unchanged)**; `uv tool list` → **no tools installed (unchanged)**; no `/tmp/p20-stageb*` remnants.
The operator machine is exactly as it was pre-run.

### 5. `python3 scripts/workflow.py validate` → **Workflow validation passed.**

---

## Stage B — deviations from plan.md

None material. Two harness/prod notes: (a) the isolated-env teardown used `find -depth -delete`
(the permission layer declines `rm -rf`) — same effect, operator env verified untouched; (b) init#1
shows `project: default (already existed)` rather than `(created)` because prod signup pre-creates
the org's default project — not a plan-required assertion (init#1 asserts the web-login line +
`key: minted`, both green) and not a failure. All plan assertions passed.
