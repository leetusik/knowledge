# Plan — P17.DECOMP (decompose the phase)

Operator-approved at the plan gate (2026-07-21). Orchestrator: Claude Fable 5 main thread.

## Your job (decomposition only)

Decompose **P17 — "Explain skill v2: interactive HTML + public multi-user ingestion"** into middle implementation slices:

1. Research enough to make a confident breakdown (start from the recon below — it is fresh, verified this session; spot-check what you build on, don't re-derive it all).
2. Create each middle slice as a **bare folder** via `python3 scripts/workflow.py new-slice --phase P17 --slice P17.Sn --name "..." --kind implementation --risk <low|medium|high> --order <n> [--depends-on ...]` — **except the parity slice** (see "D9 coordination" below, which the orchestrator creates via `promote-deferred`). Never pre-fill any slice's `plan.md`.
3. Seed `works/phases/active/P17/phase.md`: fill `## Decomposition` (breakdown + rationale, including the parity slice you did NOT create, marked for orchestrator promotion), seed `## Findings & Notes` with the durable recon facts below (they are the phase's shared context — later slices read them there), fill `## Constraints`, and resolve/park `## Open Questions`. Add an anticipated "Doc impact" note under the phase's doc-impact convention (a `### Doc impact` running-list section, mirroring P16's `phase.md`).
4. Write `result.md` in this slice folder (free-form): what you created, the parameters for the parity slice the orchestrator must promote, and anything the orchestrator should know.
5. Return your structured verdict. You never commit and never transition slice/phase status.

`--risk` selects the executor tier for each slice (`low` → literal plan-follower; `medium` → mid tier; anything else → high tier). It is the phase's main cost lever — rate `low` only for fully mechanical work. Set `--order` deliberately; fractional orders are allowed.

## Phase intent (read `../../intent.md` — the confirmed source of truth)

Compressed: (1) rewrite the explain skill — **plugin copy canonical** (`plugin/skills/explain/SKILL.md`), all copies reconciled — to **always** emit a gist-style self-contained interactive HTML explainer for **both** modes (topic; code-change/diff/phase). Markdown house style fully replaced. (2) A **default-on, citation-backed "Best practices & next steps"** section from web research — alignment with prevailing practice, deliberate divergences, 2–4 concrete next steps, every claim source-linked; skipped by judgment (purely internal subjects, trivial fixes) and degrades gracefully offline (bootstrap P8 will run this unattended at phase reviews). Exact placement + any force-on/off argument: **your call to shape, the skill slice's call to finalize**. (3) Ingestion wired to the **publicly deployed KB** (`https://knowledge.hi2vi.com`): every knowledge user posts explainers to **their own tenant with their own key**, including closing the prod accounts-plane deploy gap. (4) Out of scope: bootstrap P8 itself (other repo), monetization (D12).

## Recon (verified 2026-07-21 — orchestrator + two Explore agents)

### Target format (the operator's gist, fetched this session)

Single self-contained HTML page, inline CSS/JS, **no external deps**; sections **Background → Intuition → Code → Quiz** (5 medium-difficulty interactive MCQs with immediate feedback); table of contents, one long page (no tab nav); all diagrams **HTML/CSS, never ASCII**; `<pre>` with `pre`/`pre-wrap`; callouts for key concepts; concrete toy-data examples; responsive mobile styling; Kleppmann-modeled clarity. Gist URL is in `intent.md`. Our version POSTs to the KB (`format:"html"`) instead of writing `/tmp` files.

### P16 pipeline (done — the phase this builds on; details in `works/phases/active/P16/phase.md`)

- `POST /api/documents` takes additive `format: "md"|"html"` (default `"md"`); for html the raw `<!DOCTYPE html>…` body rides the **existing `markdown` field**. The **API itself** writes the on-disk `<!--kb … -->` comment-frontmatter — the skill must NOT emit frontmatter, it just POSTs raw HTML from `<!DOCTYPE`.
- Web app renders html docs in a sandboxed opaque-origin iframe (`sandbox="allow-scripts"`, fixed generous height + internal scroll). An optional `postMessage` height handshake was explicitly deferred to P17 as an **explainer-template enhancement the emitted HTML can opt into** (see P16 phase.md "Pinned design decisions" §1) — decide whether a slice picks this up (parent-side listener + template convention) or you park it.
- MCP `fetch_document` relays `format`; for html docs `markdown` = server-extracted text.
- `docs/current/api.md` L114–207 has the full POST contract + P16 additions.

### Skill copies (reconciliation targets)

| Copy | State |
|---|---|
| `plugin/skills/explain/SKILL.md` | **Canonical.** 291 lines; config-driven resolver (env → `~/.config/knowledge-kb/config.json` → legacy path), bearer-aware two-form curl, 201/409/422/401 branches, local-file fallback, optional project copy. **Markdown-only house style** (§4) — the part v2 replaces, plus §5 gains `format:"html"`. |
| `.claude/skills/explain/SKILL.md` | OLD (188 lines): hardcoded `~/projects/personal/knowledge` + `localhost:8766`, no token, git-commit fallback in allowed-tools. Byte-identical to `~/.claude/skills/explain/SKILL.md` — a **duplicate registration to resolve** (intent names this). |
| `.agents/skills/explain/SKILL.md` | OLD portable variant (186 lines): same body minus `argument-hint`/`allowed-tools` frontmatter; sibling `agents/openai.yaml` (display_name/short_description/default_prompt/policy). |

**No skill-sync script or CI exists** — `scripts/plugin_parity.py` covers only `plugin/templates/kb/`, never `plugin/skills/`. Reconciliation is manual; decide the derivation rule (plugin canonical → project/portable copies) and whether the `~/.claude` user-level dupe is updated or removed (touching `~/.claude` is an operator-machine change — flag for operator co-work or explicit note).

Plugin metadata: `plugin/.claude-plugin/plugin.json` is v0.2.1 (bump with the skill rewrite); marketplace entry is the repo-root `.claude-plugin/marketplace.json`.

### Ingestion / multi-user onboarding

- The ingest credential is a per-project **`vk_` key** (no `sk_` type exists anywhere). Minted once at `POST /app/projects/{id}/credentials` (`docs/current/api.md` L131–147).
- The **P13 CLI already implements the exact flow P17 needs**: `cli/src/knowledge_cli/auth.py` (`DEFAULT_BASE_URL = "https://knowledge.hi2vi.com"`, signup/login via `/auth/*`), project + `vk_` mint, written to `~/.config/knowledge-kb/config.json` `api.token` (`cli/src/knowledge_cli/config.py:30`) — the same config file the explain skill's resolver reads. A real `vk_` there already lights up the plugin.
- The **setup skill** (`plugin/skills/setup/SKILL.md`) is local-only today: scaffolds a self-hosted KB from `plugin/templates/kb/`, writes config with `api.token: null`, has **no** signup/tenant/public-host step. The gap is folding public-host onboarding (signup → project → `vk_` → config) into the plugin surface — CLI is the reference implementation; decide whether the setup skill gains a public-host mode, a new skill appears, or the skill defers to the CLI.

### D9 — plugin-parity red gate (remediation is THIS phase's job, per P16 notebook)

`scripts/plugin_parity.py` (driven by `plugin/templates/manifest.json`: `identical` / `parameterized` classes + a `completeness` sweep over `shipped_dirs = [server, tests, docs/assets, docs/stylesheets, docs/javascripts]`) exits 1 with **36 issues**: P10–P16 server growth never mirrored — only-in-repo `server/{accounts/,persistence/,usage/,api_auth,app_api,auth_api,dashboard_api,documents_api,graph_api,usage_api,seed}.py`, byte-drift `server/{config,db,documents,main,reindex,search}.py`, `pyproject.toml`/`uv.lock`, parameterized `compose.yml`, plus 4 only-in-repo test files. D9's trigger has **already fired**: origin/main is at `284fc03` (P15.F1) carrying P10–P12, so `plugin-ci.yml` on origin is presumably red now; local main is 8 commits ahead (all of P16, unpushed).

**Operator-ratified direction (plan gate): MIRROR the SaaS server files into `plugin/templates/kb/`** (the accounts plane is dormant-safe without `DATABASE_URL` by P10 design, so self-hosted scaffolds behave identically) rather than narrowing `shipped_dirs`. Final confirmation at that slice's own gate. Largely mechanical once directed, but manifest/params surgery needs care — judge the risk honestly.

**D9 coordination — do NOT `new-slice` the parity slice.** Decide its parameters (slice id, name, risk, order, depends_on) and record them prominently in `result.md` + the `## Decomposition` section; the orchestrator creates it via `promote-deferred D9 --phase P17 --slice <id> ...` so the deferred bookkeeping stays exact. Number your other `new-slice` ids around the gap so the promoted slice's id fits the order.

### Prod accounts-plane cutover (the deploy gap)

- **Already deployed** (~P15 era): `knowledge-api` + `knowledge-web` + `knowledge-mcp` behind the dedicated edge (`deploy/knowledge.conf`; mkdocs site retired at P14.S3). `compose.prod.yml` is fully accounts-aware (declares `postgres`, interpolates `DATABASE_URL` from `POSTGRES_PASSWORD`, wants `KB_OPERATOR_EMAIL`/`KB_OPERATOR_PASSWORD`).
- **Never done**: the runtime cutover. Authoritative runbook `docs/current/operations.md` L410–428: (1) push main; (2) box `.env` gains `POSTGRES_PASSWORD`, `KB_OPERATOR_EMAIL`, `KB_OPERATOR_PASSWORD` (operator-provisioned, never committed); (3) deploy via the **`Production Deploy`** GitHub Action (`workflow_dispatch`, runs `deploy/…` chain, deploys **origin/main tip**); (4) **deadlock-safe one-shot order** — stop api → `run --rm api alembic upgrade head` → `run --rm api python -m server.seed` → `up -d api` (the naive `exec` form crash-loops on a fresh DB: boot reindex queries un-migrated tables — proven live 2026-07-17); (5) edge conf already applied; (6) verify `scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com`, `knowledge init`, `mcp-server/scripts/e2e_smoke.py` (the `vk_`-path E2E is explicitly still outstanding).
- **Docs are internally inconsistent** on whether a partial cutover was attempted 2026-07-17 (`operations.md:417` vs `:410-428` framing; last on-box verification was the P13 review: no `knowledge-postgres` container, pre-P13 code, missing secrets). **The cutover slice's first step must be verifying the live box state**, not assuming.
- `deploy.sh` does NOT run migrations/seed — those are explicit operator steps. Pushing, secrets, the Action dispatch, and migrate/seed are **operator-run actions → plan them as explicit `pending` gates** in the slice breakdown.
- D11 (deploy self-upgrade trap) bites only if the compose service set / health gates change — P17 adds no services; note it, don't build for it.
- Sequencing constraint: **parity fix → push (operator) → deploy+cutover (operator gates) → hosted E2E**. Skill-rewrite slices are independent of deploy and can precede it in order.

### Miscellaneous pinned points

- D13 (`source_url` field) is NOT triggered by in-body citation links — note in phase.md, don't act.
- The public mkdocs site is retired in prod (web/ is the viewer), so "should HTML docs publish to the mkdocs site" is moot for the hosted flow; the local self-hosted stack still has the mkdocs `kb` service where an `.html` doc passes through as a raw static asset (P16 verified the build doesn't break). Double-check nothing new breaks; don't build features for it.
- **No design-cowork gate** (operator-ratified): the explainer look = the operator-chosen gist reference applied by a generated-document template. If a slice would invent a genuinely new product visual language, it must stop and go through `design-cowork` — say so in that slice's description if you foresee it.
- Keep test files terse (contract rule); behavioral E2E validation consolidates at `P17.REVIEW` (never pre-planned, never created by you — it already exists).
- Hosted E2E for the skill path ultimately means: a fresh user onboards against `https://knowledge.hi2vi.com`, `/explain` posts an HTML explainer with their own `vk_`, and it renders interactively in the web app under their tenant.

## Suggested shape (yours to confirm or override, with rationale in phase.md)

Roughly 4–5 middle slices: skill v2 rewrite (canonical) · copies reconciliation + public onboarding surface (1–2 slices) · parity remediation (promoted D9 — orchestrator creates) · prod cutover + hosted E2E (operator `pending` gates). Order them so parity precedes the push/cutover and everything precedes REVIEW.
