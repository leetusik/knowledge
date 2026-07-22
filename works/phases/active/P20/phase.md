# Phase P20: Frictionless onboarding: hero, install, env-var quickstart, skill on landing

_Intent: see [intent.md](intent.md)._

## Objective

Make the landing hero flow real end to end: fix the broken uv tool install knowledge-cli line (publish to PyPI or switch the copy to the working install form), make the depicted init/password step honest (show the prompt or generate a password), promote the env-var REST setup (KB_API_BASE_URL/KB_API_TOKEN) as the recommended agent path with blockers addressed, and publish the explain skill on the landing page — copyable and downloadable — with agent-first guidance.

## Context

This phase makes the landing hero's onboarding journey real, honest, and the easiest
possible on-ramp for humans and coding agents. It builds on the now-shipped P18 (org-level
keys, `project_id NULL`) and P19 (public projects + direct doc URLs) so the hero can depict
the *final* accounts/link flow. Four threads: (1) fix the broken install line, (2) make the
init/password step honest, (3) promote the env-var REST path as the recommended agent setup,
(4) publish the explain skill on the landing page (copyable + downloadable), agent-first.

The four operator-approved decisions below are **fixed** — the decomposition is built around
them, not relitigating them.

### Operator-approved decisions (fixed)

1. **Install fix = curl installer** (not PyPI). Hero line 1 becomes
   `curl -fsSL https://knowledge.hi2vi.com/install.sh | bash`. The script: `set -euo pipefail`;
   check for `uv`, bootstrap it via the official Astral installer if missing (clearly echoed);
   then `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli`; verify
   `knowledge` on PATH; print the next step (`knowledge init --email you@example.com`).
   PyPI stays a later, separate call (D-P13-1 stands — needs an operator PyPI account). The raw
   `git+` line is too long for a hero. **Windows `install.ps1` is deferred** (see Deferrals to file).
2. **Password honesty = depict the prompt; no password generator.** The hero terminal gains the
   password-prompt line (`knowledge init` already prompts via getpass; `--password-stdin` /
   `$KNOWLEDGE_PASSWORD` exist; no `--password` flag by design). Plus one line added to
   `knowledge init` success output pointing at web login with the same email + password
   (base_url-aware). No signup-flow / backend change.
3. **D16 folds into S1** (org keys are project-agnostic, `project_id NULL` — `init --project other`
   should reuse the org key, not re-mint). **D10** ("Landing feature-section lede copy") **rides the
   design round (S2)**: its lede-copy question goes into the design handoff, posed to the operator;
   bookkeeping closed after the design lands.

## Decomposition

Five middle slices + REVIEW. **S1 is created by the orchestrator** via
`promote-deferred D16 --phase P20 --slice P20.S1 ...` (D16 folds into it), so DECOMP did **not**
create it — its full spec is recorded below (reserve **order 1**). DECOMP created S2/S3/S4 as bare
folders. Ordering: S1 (installer + hero copy + CLI fixes, no design dep) → S2 (design round 02) →
S3 (implement designed sections) → S4 (ship + live verify) → REVIEW.

### P20.S1 — installer + hero honesty + CLI onboarding fixes (SPEC ONLY — orchestrator creates via `promote-deferred D16`)

- **id** `P20.S1` · **kind** `implementation` · **risk** `high` · **order** `1` · **depends_on** none
- **Why high, not low/medium:** bundles three judgment-bearing pieces — authoring a new
  live-served `curl | bash` installer (uv-bootstrap logic, PATH verification, honest echoes),
  a change to the credential-mint **reuse gate** in `auth.py` (security-adjacent), and honest
  hero copy that must track real `init` output. Not mechanical → not `slice-executor-low`.
- **Scope:**
  1. **`web/public/install.sh`** (new file) — the operator-approved script (decision 1 above).
     Served live at `https://knowledge.hi2vi.com/install.sh` with zero infra work (see Findings:
     `web/public/` ships in the standalone image + nginx `/` catch-all; `curl | bash` is
     content-type-agnostic). Keep it terse and auditable.
  2. **`web/src/content/marketing/terminals.ts`** hero fix (`HERO_TERMINAL`, lines ~24-49):
     line 1 → the curl one-liner; add the depicted password-prompt line after `knowledge init`;
     keep the depicted `✓ signed up · project created` / `✓ minted vk_…` / `✓ config written` /
     `knowledge save` output honest to the *real* current `init` output (which prints
     `signed up as … (org: …)`, `project: … (created)`, `key: minted …`, `config: … (0600)`,
     `KB_STATUS=configured`). This is a **content/copy fix inside the already-designed hero
     component — NOT a design round** (content is cited "verbatim from build-prompt.md §4"; note
     the departure in a code comment, **never edit `web/design/rounds/01-*`**, which is read-only).
  3. **`knowledge init` success output** — add one base_url-aware line pointing at web login with
     the same email + password (CLI + web share one accounts plane: `POST /auth/signup` / `/auth/login`).
     Lands near the end of `cmd_init` (`cli/src/knowledge_cli/auth.py`, after `config:` / `KB_STATUS=`).
  4. **D16 reuse-gate relaxation** (`cli/src/knowledge_cli/auth.py:491-514`): org keys are
     project-agnostic (`project_id NULL`), so `init --project other` should **reuse** the existing
     org key instead of re-minting on a `same_project` mismatch. Relax the gate so a recorded
     org-level key is reused across projects (still re-mint on `--new-key`, still gate on
     same-service). Preserve the "absent = unknown, never mismatched" invariant and the show-once
     security property. Update the reuse/mint notes accordingly.
  5. **Consider** whether `cli/README.md` (§Install) and `guide.py` `INSTALL_COMMAND` copy should
     also mention the curl one-liner (executor's call at plan time; the `git+` form stays the
     canonical fallback).
- **Shipping caveat (record in S1 result):** the `git+…#subdirectory=cli` install form installs
  **what's on GitHub main**, so S1's CLI changes are not live for `curl | bash` users until the
  operator-gated `git push` in **S4**. S1 lands code + the honest hero; S4 pushes + verifies live.
- **No design dependency** — S1 can run first, before the design round.

### P20.S2 — Design round 02: env-var quickstart + skill-on-landing sections (handoff)  [created]

- **id** `P20.S2` · **kind** `co-work` · **risk** `high` · **order** `2` · **depends_on** none
- **Why co-work / high / never dispatched:** new landing sections (env-var quickstart,
  skill-on-landing) are **product visual design** → the **design-cowork** gate (round 02). Per that
  skill and CLAUDE.md, a design slice is `--kind co-work --risk high`, is run by the **orchestrator
  on the main thread** (DesignSync is main-thread only — this slice is **never dispatched to an
  executor**), and produces only `handoff.md` → `pending` → operator/Claude-Design round → read-back
  → landed design + SIGNOFF. It writes **no implementation code**.
- **Scope:** write one `handoff.md` (new round `web/design/rounds/02-*`) requiring the card set
  (one `@dsCard` per reviewable unit) for: (a) the **env-var REST quickstart** section
  (`export KB_API_BASE_URL` + `KB_API_TOKEN` → any agent saves via plain REST; must surface the
  known blockers — repo `.env` never auto-loaded so recommend `~/.zshenv`; Codex needs
  `[sandbox_workspace_write] network_access = true`; Cloudflare/edge is empirically not a barrier),
  and (b) the **skill-on-landing** section (the explain skill, copyable + downloadable, agent-first
  guidance — "use a coding agent, and the agent uses the skill"). **D10 rides here:** the open
  feature-section lede-copy question goes into the handoff, posed back to the operator (never invent
  copy). Respect the locked brand (teal-only interactive accent; Fraunces / Source Sans 3 /
  JetBrains Mono; warm paper; no emoji). Reuse existing primitives / copy-to-clipboard idiom
  (see Findings). Design decisions are the operator + Claude Design's; pose questions back, never answer them.

### P20.S3 — Implement the designed sections (env-var quickstart + parity-gated skill on landing)  [created]

- **id** `P20.S3` · **kind** `implementation` · **risk** `high` · **order** `3` · **depends_on** `P20.S2`
- **Why high:** design-fidelity implementation of two new landing sections **plus** the
  skill-publishing plumbing — a landing-served skill copy must **join or derive from the
  `scripts/skills_parity.py` gate** (e.g. build-time copy from the canonical
  `plugin/skills/explain/SKILL.md` + a parity-check extension), **never fork**. That parity plumbing
  is the risky part; design fidelity (respect the design as-is — never drop/simplify/"improve" a
  designed element) is the rest.
- **Scope (deliberately loose until the S2 read-back re-shapes it — do NOT over-plan now):**
  implement the env-var quickstart section and the skill-on-landing section faithfully from S2's
  returned `build-prompt.md`; wire a copyable + downloadable explain skill served from the landing
  (downloadable file likely under `web/public/`, e.g. a served `SKILL.md`/`explain.md`), derived
  from the canonical copy under the parity gate. Reuse `web/src/components/copy-link-button.tsx` /
  the `ShowOnceKey` copy idiom and `primitives.tsx`. A design slice never writes impl code — this
  is where the design lands in code.

### P20.S4 — Ship + live verify (operator-gated push + prod deploy + live smoke)  [created]

- **id** `P20.S4` · **kind** `implementation` · **risk** `high` · **order** `4` · **depends_on** `P20.S3`
  (also logically depends on **S1** — order handles sequencing; S1 not referenced in `depends_on`
  because it does not exist at DECOMP-`validate` time)
- **Why high:** prod access + operator-gated actions (push main, prod deploy) + live verification.
- **Scope:** operator gates — (1) `git push` main to GitHub (makes S1's CLI changes live for the
  `git+`/curl-installer path), (2) production deploy of the web changes (installer + hero + new
  sections). Then live smoke in a **clean environment**: `curl -fsSL https://knowledge.hi2vi.com/install.sh | bash`
  (installer end-to-end), live hero check, skill copy/download check on the landing, and
  `knowledge init --email …` against prod (incl. the D16 reuse behavior + web-login line). Operator
  co-work (`pending`) for the push/deploy and any live validation only the operator can run.

### P20.REVIEW — phase review (exists; never pre-planned)

## Findings & Notes

Grounded facts verified this session (spot-checked against the live repo):

- **Hero terminal copy** lives at `web/src/content/marketing/terminals.ts` — `HERO_TERMINAL`
  line 1 is `uv tool install knowledge-cli` (lines 24-25), the **live failure**: `knowledge-cli`
  was never published to PyPI (D-P13-1, `docs/current/decisions.md:711-719`). It is consumed only
  by `web/src/components/marketing/hero.tsx`; the `TerminalBlock` renderer is a static `<pre>`
  (not copyable). Content is cited "verbatim from build-prompt.md §4" (file header) — the design
  record `web/design/rounds/01-*` is read-only; note copy departures in a code comment, don't edit it.
- **`web/public/` is served live with zero infra work.** `web/next.config.ts:15` sets
  `output: "standalone"`; `web/Dockerfile:39` `COPY --from=build /app/public ./public`;
  `web/.dockerignore` excludes `.env*` but **not** `public/`; nginx (`deploy/knowledge.conf`) has a
  `location /` catch-all → `proxy_pass http://$knowledge_web_upstream:3000`. So a committed
  `web/public/install.sh` is live at `https://knowledge.hi2vi.com/install.sh`. `curl | bash` is
  content-type-agnostic. **No end-user installer exists in-repo today** (`web/public/` holds only
  `favicon.svg`, `fonts/`, `logo.svg`). Edge is **nginx on Oracle Cloud** — no Cloudflare config
  in-repo (corrects the intent's Cloudflare assumption; empirically not a barrier either way).
- **Working install form:** `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli`
  (`cli/README.md:11`; also `guide.py:36` `INSTALL_COMMAND`). CLI: `requires-python >=3.12`, single
  dep httpx, console script `knowledge`. The `git+` form installs **what's on GitHub main** →
  shipping S1's CLI changes to installer users requires the operator-gated `git push` in S4.
- **`knowledge init`** (`cli/src/knowledge_cli/auth.py:458` `cmd_init`): signup-or-login → ensure
  project → **key reuse-or-mint gate** (`auth.py:491-522`) → config to
  `~/.config/knowledge-kb/config.json` (0600) → resolver re-verification. It prints, in order:
  `signed up as … (org: …)`, `project: … (created|already existed)`, `key: minted …` /
  `key: reusing …`, `config: … (0600)`, `KB_STATUS=configured`. The mint is org-level via
  `client.credential_create_org` → `POST /app/credentials`, `project_id NULL`
  (`cli/src/knowledge_cli/client.py:220-235`). **D16's bug lives in the reuse gate at
  `auth.py:496-498`:** `same_project = not configured_project or configured_project == project_name`
  gates reuse on the recorded project, so `init --project other` re-mints even though org keys are
  project-agnostic. S1 relaxes this.
- **Skill to publish:** `plugin/skills/explain/SKILL.md` (**486 lines**, canonical; operator's
  "explain.md"). Byte-parity-guarded (bodies must match; frontmatter may differ — the
  `.agents/` copy is 484 lines) against `.agents/skills/explain/SKILL.md` by
  `scripts/skills_parity.py` (CI: `.github/workflows/plugin-ci.yml`). A landing-served copy must
  **join or derive from this gate** (build-time copy from canonical + parity-check extension),
  **never fork**.
- **Env-var agent path** (the recommended setup this phase promotes): `KB_API_BASE_URL` /
  `KB_API_TOKEN` override everything in the skill resolver (`SKILL.md` §2) and the CLI config
  (`cli/src/knowledge_cli/config.py:57-58`). Blockers to reflect in copy (from intent.md, verified
  live in the intent conversation): repo `.env` is never auto-loaded by Claude Code or Codex
  (recommend `~/.zshenv`); Codex needs `[sandbox_workspace_write] network_access = true`; the edge
  is not a barrier (live probe: `GET /` → 200; unauth `POST /api/documents` → 401 from the app).
- **Landing design provenance:** `web/design/rounds/01-landing/` (handoff, SIGNOFF,
  output/build-prompt.md, tokens). Locked brand: teal-only interactive accent; Fraunces /
  Source Sans 3 / JetBrains Mono; warm paper; no emoji. Runtime tokens: `web/src/app/kb-tokens.css`,
  `globals.css` `@theme` bridge, `marketing.css` band mechanics, shared primitives in
  `web/src/components/marketing/primitives.tsx`. Reusable copy-to-clipboard idiom:
  `web/src/components/copy-link-button.tsx`, `ShowOnceKey` in `mint-credential-form.tsx`.
- **New landing sections ⇒ design-cowork round 02** (S2): design slice `--kind co-work --risk high`,
  run by the orchestrator on the main thread (DesignSync main-thread-only → never dispatched);
  `handoff.md` → pending → read-back → landed design + SIGNOFF; **implementation is a separate slice**
  (S3), sized from the returned `build-prompt.md`. Don't over-plan S3 now — read-back routinely re-shapes it.
- **Changing the hero terminal command text is a content/copy fix inside the already-designed
  component** (content in `terminals.ts`) — it does **NOT** need a design round. New sections DO.

### S1 done — cross-slice notes (for S2/S3/S4)

- **Final hero line set** (S2's design context): the hero now depicts, in order,
  `$ curl -fsSL https://knowledge.hi2vi.com/install.sh | bash` → `$ knowledge init --email …` →
  `Password:` → `signed up as … (org: default)` / `project: default (created)` / `key: minted vk_…9f2c`
  / `config: ~/.config/knowledge-kb/config.json (0600)` → `$ knowledge save explainer.md` →
  `saved: explainer` / `url: https://knowledge.hi2vi.com/documents/a1b2c3`. The new S2/S3 sections
  (env-var quickstart, skill-on-landing) sit **below** this hero — the hero already tells the
  install→init→save story, so the env-var section is the *agent* on-ramp, not a repeat.
- **Installer URL semantics for S4's smoke:** `https://knowledge.hi2vi.com/install.sh` is served
  straight from the committed `web/public/install.sh` (standalone image + nginx `/` catch-all — no
  route, no infra). It is only **live after S4's web deploy**. The script runs
  `uv tool install --reinstall git+…#subdirectory=cli`, which installs GitHub **main** — so the
  installer delivers S1's CLI changes (web-login line, D16 reuse) to `curl | bash` users **only after
  S4's operator-gated `git push` of main**. `--reinstall` makes re-runs idempotent + upgrade-safe.
  S4's clean-env smoke should assert: `install.sh` runs end-to-end (uv bootstrap if absent →
  `knowledge --version`), then `knowledge init` shows the web-login line and D16 reuse on a second
  `--project other` run.
- **Test/validation gotcha (S4/REVIEW):** system `python3` here is 3.13 **without** pytest/httpx;
  the CLI suite runs green via **`cli/.venv/bin/python -m pytest cli/tests -q`** (3.12, editable
  `knowledge_cli` + pytest + httpx). `web/`: `npm run typecheck && npm run lint && npm run test`
  (61 vitest tests) all pass; no vitest covers the marketing terminal content, so the hero-copy
  guard is typecheck/lint, not a unit test.

### Deferrals linkage

- **D16** ("knowledge init --project other re-mints an org key — reuse-gate relaxation";
  `works/deferred/open/D16/`; trigger "next CLI onboarding slice (e.g. P20)" fires now) **folds into
  S1**. Per the plan's S1-exception, DECOMP did **not** create S1 and did **not** run
  `promote-deferred` (that transitions deferred state — orchestrator's job). The orchestrator creates
  S1 via `promote-deferred D16 --phase P20 --slice P20.S1 --name "installer + hero honesty + CLI
  onboarding fixes" --kind implementation --risk high --order 1` right after DECOMP returns.
- **D10** ("Landing feature-section lede copy"; `works/deferred/open/D10/`; trigger
  "operator provides copy / next design round" fires) **rides the S2 design round** — its lede-copy
  question goes into the S2 `handoff.md`, posed to the operator; the deferred bookkeeping is closed
  after the design lands.

### Deferrals to file (for the orchestrator to `defer-job`)

- **Windows `install.ps1`** — the curl installer (decision 1) is POSIX-only (`bash`, Astral uv
  `install.sh`). A PowerShell installer for Windows users is deferred, not built this phase.
  Suggested: `defer-job --title "Windows install.ps1 (PowerShell curl-installer equivalent)"
  --reason "P20 ships a POSIX curl|bash installer only; Windows users need a PowerShell equivalent"
  --trigger "Windows onboarding demand / operator asks" --source P20.DECOMP`.

## Constraints

- **No design decisions by DECOMP or any executor** — new landing sections go through the
  design-cowork gate (S2); pose design questions back, never answer them, never author mockups/
  palettes/type scales. Respect the locked brand.
- **Never edit `web/design/rounds/01-*`** (read-only design record); note hero copy departures in a
  code comment instead.
- **Never fork the explain skill** — any landing-served copy joins/derives from
  `scripts/skills_parity.py` (bodies byte-identical to `plugin/skills/explain/SKILL.md`).
- **`docs/current/*.md` are generated** — never hand-edit; durable-doc changes are versioned **once,
  at REVIEW**, from the "Doc impact" list below.
- **PyPI stays out of scope** (D-P13-1); the install fix is the curl installer, not a package publish.
- **Operator gates in S4** — `git push` main and prod deploy are operator-run (`pending`); the
  `git+`/curl-installer path only reflects S1's CLI changes after that push.

## Doc impact

_Running list of durable-truth changes for the REVIEW slice to consolidate into doc versions
(one version per affected doc). Each non-review slice appends here; DECOMP seeds expectations:_

- (expected) `decisions.md` — the curl-installer install fix (`web/public/install.sh` served at
  `/install.sh`, uv-bootstrap + `git+` install) as the resolution of the broken-hero-line problem,
  explicitly **not** PyPI (D-P13-1 stands); the D16 reuse-gate relaxation (org keys reused across
  projects); hero-honesty via depicted prompt (no password generator). Confirm/append at each slice.
- (expected) `frontend.md` and/or the landing/marketing doc — the new landing sections (env-var
  quickstart, skill-on-landing copyable/downloadable), the curl one-liner hero, and the S2 design
  round 02 provenance. Depends on the S2/S3 outcome.
- (expected) `cli.md` / onboarding doc — the `knowledge init` web-login success line and the
  reuse-gate behavior change; possibly the curl-installer mention in `cli/README.md` / `guide.py`.
- S1/S3/S4 each append the concrete doc(s) they actually touched; REVIEW consolidates.

**S1 touched (concrete):**

- `decisions.md` — the broken-hero-line (`uv tool install knowledge-cli`, D-P13-1) is resolved
  by a **curl installer** (`web/public/install.sh`, served at `/install.sh`, bootstraps `uv` then
  `uv tool install --reinstall git+…#subdirectory=cli`), explicitly **not** PyPI (D-P13-1 stands);
  the **D16 reuse-gate relaxation** (org keys are project-agnostic → `init --project other` reuses
  the org key, re-mints only on `--new-key`); **hero honesty** via a depicted password prompt (no
  password generator); the `knowledge init` **web-login success line** (CLI + web share one
  accounts plane).
- `experience.md` (CLI/onboarding UX) — the honest hero terminal (curl one-liner + real `init`
  password prompt + real `init`/`save` output, the `url:` line showcasing the P19 direct doc link),
  the `knowledge init` `web login: {base_url}/login (same email + password)` line, the D16
  cross-project org-key reuse behavior, and the curl one-liner now surfaced in `cli/README.md`
  §Install + `guide.py` §1 (the `git+` form stays canonical).
- `operations.md` — `web/public/install.sh` is served **live** at
  `https://knowledge.hi2vi.com/install.sh` with zero infra work (standalone image ships `public/`,
  nginx `/` catch-all); it wraps the canonical `uv tool install --reinstall git+…#subdirectory=cli`
  (installs GitHub **main** → S1's CLI changes reach installer users only after S4's operator-gated
  `git push`).
- `frontend.md` — hero terminal copy (`web/src/content/marketing/terminals.ts` `HERO_TERMINAL`) now
  depicts the working curl-installer + honest `init`/`save` output; content-only change inside the
  already-designed hero component (no design round; `web/design/rounds/01-*` untouched).

## Open Questions

- **D10 lede copy** — the feature-section lede copy is operator-owned; resolved inside the S2 design
  handoff (posed to the operator), not invented.
- **Curl-installer mention in CLI docs** — whether `cli/README.md` / `guide.py INSTALL_COMMAND`
  should also surface the one-liner; the S1 executor decides at plan time (the `git+` form stays canonical).
- **S3 exact shape** — deliberately deferred until the S2 design read-back; do not lock it now.
