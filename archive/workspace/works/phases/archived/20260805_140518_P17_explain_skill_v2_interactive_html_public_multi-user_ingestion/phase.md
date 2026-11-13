# Phase P17: Explain skill v2: interactive HTML + public multi-user ingestion

_Intent: see [intent.md](intent.md)._

## Objective

Upgrade the explain skill (plugin canonical, all copies) to always emit a gist-style self-contained interactive HTML explainer (Background/Intuition/Code/Quiz) for both topic and code-change modes — including a default-on, citation-backed 'Best practices & next steps' section from web research (skipped when the subject has no external comparison surface or offline) — and wire ingestion to the publicly deployed KB so every knowledge user posts explainers to their own tenant with their own key, closing the prod accounts/auth deploy gap as required.

## Context

## Decomposition

Five middle slices + `REVIEW`. Slice **S4 is the promoted D9 parity slice** — the
orchestrator creates it via `promote-deferred D9` (see the D9 note below); `DECOMP`
deliberately left order 4 open and did **not** `new-slice` it. Ordering encodes the
hard sequencing rule: all skill/plugin-surface work (S1–S3) and the parity fix (S4)
land before the operator push inside the cutover slice (S5); everything precedes
`REVIEW`.

| Slice | Order | Risk | Deps | Covers |
|---|---|---|---|---|
| **S1** | 1 | high | — | Explain skill v2 rewrite (canonical `plugin/skills/explain/SKILL.md`) |
| **S2** | 2 | medium | S1 | Reconcile the OLD skill copies from the canonical copy |
| **S3** | 3 | high | — | Public-host onboarding surface for plugin users |
| **S4** *(D9, orchestrator promotes)* | 4 | medium¹ | — | Plugin-template parity remediation (mirror the SaaS server) |
| **S5** | 5 | high | S1, S3, (S4²) | Prod accounts-plane cutover + hosted end-to-end skill-path verification |

¹ Recommended `medium`, but **leans high** — see the D9 note; the orchestrator sets
the final risk at S4's plan gate (it may only bump *up*, so it is left at medium to
keep the choice open). ² S5 was created with `depends_on = [S1, S3]` only, because
`validate` existence-checks `depends_on` and S4 does not exist yet; the S4→S5
sequencing is enforced by `order` (4 before 5). The orchestrator may add `P17.S4` to
S5's `depends_on` when it promotes D9, but it is not required.

**S1 — Explain skill v2 (canonical).** Rewrite `plugin/skills/explain/SKILL.md` so it
**always** emits a single self-contained interactive HTML explainer (gist-modeled:
Background → Intuition → Code → Quiz; 5 medium MCQs with immediate feedback; ToC;
HTML/CSS diagrams, never ASCII; `<pre>`/`pre-wrap`; callouts; concrete toy-data
examples; responsive mobile; Kleppmann-clear) for **both** modes (topic and
code-change/diff/phase). Fully replace the §4 markdown house style (one output format
everywhere). §5 POSTs with `format:"html"`, the raw `<!DOCTYPE html>…` body riding the
existing `markdown` field — **emit no frontmatter** (the API writes the `<!--kb …-->`
comment-frontmatter itself). Add a **default-on, citation-backed "Best practices &
next steps"** section from web research (alignment with prevailing practice,
deliberate divergences, 2–4 concrete next steps, every claim source-linked); a
**judgment gate** skips it for purely-internal subjects / trivial fixes, and it
**degrades gracefully offline** (bootstrap P8 runs this unattended at phase reviews).
Add the web-search/fetch tool to the skill's `allowed-tools`. Bump
`plugin/.claude-plugin/plugin.json` (and the repo-root `.claude-plugin/marketplace.json`
entry). **S1 owns the final call** on the exact section placement and any force-on/off
argument (DECOMP shapes, S1 finalizes). *Rationale:* this is the phase's core and the
highest-judgment authored artifact — high tier. Independent of deploy, so it is first.

**S2 — Reconcile copies (from canonical).** Propagate S1's v2 body into the two OLD
copies — project `.claude/skills/explain/SKILL.md` (188 lines, hardcoded paths, no
token) and portable `.agents/skills/explain/SKILL.md` (186 lines, no Claude
frontmatter, sibling `agents/openai.yaml`) — as a **structural derivation** from the
canonical copy (same body, each copy's own frontmatter shape), not a byte-copy. Resolve
the **duplicate registration**: `.claude/skills/explain/SKILL.md` is byte-identical to
the user-level `~/.claude/skills/explain/SKILL.md` — decide update-vs-remove for the
user-level dupe. Touching `~/.claude` is an **operator-machine change** → S2 must route
it through an operator co-work `pending` gate (or an explicit operator note), never a
silent write. Optionally decide whether to add a skill-sync mechanism (script/CI) so the
copies stop drifting — a genuine judgment call S2 may escalate on. *Rationale:* the
derivation rule is already settled (plugin canonical → copies), so the bulk is faithful
porting + one bounded decision — medium tier, with the escalation hooks noted.

**S3 — Public-host onboarding surface.** Fold public-host onboarding (signup → project
→ mint `vk_` → write `~/.config/knowledge-kb/config.json` `api.token`) into the **plugin
surface** so a plugin user (not only a CLI user) can post explainers to their own tenant
on `https://knowledge.hi2vi.com`. The **P13 CLI is the reference implementation** and
already does exactly this (`cli/src/knowledge_cli/auth.py cmd_init` → `config.save`).
S3 **decides the shape**: setup skill gains a public-host mode, a new skill appears, or
the plugin defers to `knowledge init` (with the plugin/setup surface pointing at it) —
and implements it. *Rationale:* a real product-design decision on the plugin onboarding
UX plus implementation — high tier. Independent of S1/S2; can be verified end-to-end
only after the S5 cutover, so its E2E rolls into S5/REVIEW.

**S4 — Plugin-template parity remediation (promoted D9).** *Orchestrator creates via
`promote-deferred D9` — see the D9 note.* MIRROR the P10–P16 SaaS server growth into
`plugin/templates/kb/` (operator-ratified direction) so `scripts/plugin_parity.py` goes
green: add the ~14 only-in-repo files (`server/{accounts,persistence,usage}/*`,
`server/{api_auth,app_api,auth_api,dashboard_api,documents_api,graph_api,seed,usage_api}.py`,
4 `tests/test_*` files), reconcile the 8 byte-drift `identical`/`parameterized` files
(`server/{config,db,documents,main,reindex,search}.py`, `pyproject.toml`, `uv.lock`,
`compose.yml`), and update `plugin/templates/manifest.json` (`identical` /
`parameterized` classes + `shipped_dirs`). The accounts plane is **dormant-safe without
`DATABASE_URL`** by P10 design, so a self-hosted scaffold behaves single-tenant. **The
real risk (why this is not fully mechanical):** the mirrored template must still
**render + import cleanly and boot dormant** — the setup skill renders these templates
for every self-host user, so `pyproject.toml`/`uv.lock` must carry the new accounts-plane
deps or the scaffolded API crashes on import. Verification is *both* `plugin_parity.py`
green *and* a rendered scaffold whose API boots single-tenant. *Rationale:* mechanical
mirroring once directed, but manifest surgery + dormant-boot verification + a
marketplace-blast-radius contract change → medium, **leaning high**.

**S5 — Prod cutover + hosted E2E (operator gates).** Run the one-time production
accounts-plane cutover (`operations.md` L410–428) and verify the full hosted skill path.
**First step: verify the live box state** — the docs are internally inconsistent on
whether a partial cutover happened 2026-07-17, so do not assume. Then the deadlock-safe
one-shot order — push (operator) → provision box `.env` secrets (operator) → dispatch the
`Production Deploy` Action (operator) → `stop api → run --rm api alembic upgrade head →
run --rm api python -m server.seed → up -d api` — each operator-run action planned as an
explicit `pending` gate. Verify with `scripts/onboarding_smoke.py --base-url
https://knowledge.hi2vi.com`, one real `knowledge init`, and the outstanding `vk_`-path
E2E: a fresh user onboards against the public host, `/explain` POSTs an HTML explainer
with their own `vk_`, and it renders interactively in the web app under their tenant.
*Rationale:* live prod cutover with operator co-work gates, box-state verification, a
proven boot-deadlock trap, and end-to-end judgment — high tier, and last (the push
carries every prior slice's commits, incl. the parity fix).

### D9 coordination — parity slice the orchestrator must promote (NOT created here)

The parity slice is the remediation D9 was deferred for; its trigger has already fired
(origin/main is at `284fc03`/P15.F1 carrying P10–P12, so `plugin-ci.yml` is presumably
red now, and local main is 8 commits ahead of origin — all P16, unpushed). Create it
with:

```
python3 scripts/workflow.py promote-deferred D9 \
  --phase P17 \
  --slice P17.S4 \
  --name "Plugin-template parity remediation: mirror the SaaS server into plugin/templates/kb (D9)" \
  --kind implementation \
  --risk medium \
  --order 4
```

- **Risk:** `medium` recommended, but honestly borderline — bump to `high` at the plan
  gate if the manifest classification or the dormant-boot verification looks non-trivial
  (the setup skill renders this template, so the blast radius is every self-host user).
- **Deps:** none required; `order 4` places it before the S5 push. Optionally
  `--depends-on` nothing, or add it to S5's `depends_on` afterward.
- Do **not** also `new-slice` a parity slice — that would double-count D9's bookkeeping.

## Findings & Notes

Durable recon, verified 2026-07-21 (orchestrator + two Explore agents; spot-checked
this session by DECOMP — parity count, workflow state, git origin, skill copies, CLI,
API contract, and the cutover runbook all confirmed).

**Target format (the operator's gist).** Single self-contained HTML page, inline CSS/JS,
**no external deps**; sections Background → Intuition → Code → Quiz (5 medium MCQs with
immediate feedback); ToC, one long page (no tab nav); all diagrams HTML/CSS, never
ASCII; `<pre>` with `pre`/`pre-wrap`; callouts; concrete toy-data examples; responsive
mobile; Kleppmann-modeled clarity. Gist URL is in `intent.md`. Our version POSTs to the
KB (`format:"html"`) instead of writing `/tmp` files.

**"No external deps" is a hard constraint, not a preference.** P16 renders html docs in a
**sandboxed opaque-origin iframe** (`sandbox="allow-scripts"`): inline JS runs, but the
opaque origin blocks all network/storage. So the emitted explainer must be fully
self-contained (inline CSS/JS, zero external fetches/CDN) or it renders broken. This is
exactly why P16 came first — an emitted explainer is renderable the moment S1 ships.

**P16 pipeline (done — what this builds on).** `POST /api/documents` takes additive
`format:"md"|"html"` (default `"md"`); for html the raw `<!DOCTYPE html>…` body rides the
existing `markdown` field, and **the API writes the on-disk `<!--kb …-->`
comment-frontmatter** — the skill must NOT emit frontmatter, it POSTs raw from
`<!DOCTYPE`. Read projections gain an additive `format` and hide an internal `raw_html`
column; new session-guarded tenant-scoped `GET /app/documents/{id}/raw` serves the raw
HTML with sandbox headers for the iframe; MCP `fetch_document` relays `format` (html
`markdown` = server-extracted text). FTS/embeddings run over the extracted text, so html
explainers are searchable by visible content, never by `<script>`/`<style>`. Full
contract: `docs/current/api.md` L114–207 + the *HTML explainer document type (P16)*
section. **The `/api/*` consumer contract + MCP contract v1 are preserved additively** —
S1 changes no API contract, it only *uses* `format:"html"`.

**Skill copies (reconciliation targets, S2).**
- `plugin/skills/explain/SKILL.md` — **canonical** (291 lines): config-driven resolver
  (env → `~/.config/knowledge-kb/config.json` → legacy checkout), bearer-aware two-form
  curl, 201/409/422/401 branches, local-file fallback, optional project copy. §4 is the
  markdown house style v2 replaces; §5 gains `format:"html"`.
- `.claude/skills/explain/SKILL.md` — OLD (188 lines): hardcoded
  `~/projects/personal/knowledge` + `localhost:8766`, no token. **Byte-identical to
  `~/.claude/skills/explain/SKILL.md`** (confirmed `diff -q` silent this session) — the
  duplicate registration to resolve; `~/.claude` is an operator-machine path.
- `.agents/skills/explain/SKILL.md` — OLD portable variant (186 lines): same body minus
  `argument-hint`/`allowed-tools` frontmatter; sibling `agents/openai.yaml`
  (display_name/short_description/default_prompt/policy) — confirmed present this session.
- **No skill-sync script or CI exists** — `scripts/plugin_parity.py` covers only
  `plugin/templates/kb/`, never `plugin/skills/`. Reconciliation is manual today.
- Plugin metadata: `plugin/.claude-plugin/plugin.json` is **v0.2.1**; bump with the
  rewrite. Marketplace entry is the repo-root `.claude-plugin/marketplace.json`. Note a
  small pre-existing inconsistency in `plugin/skills/setup/SKILL.md` (says `0.2.1` at
  line ~156 but `0.1.0` at ~170/180) — clean up when bumping.

**Ingestion / onboarding (S3).** The ingest credential is a per-project **`vk_` key**
(no `sk_` type exists anywhere), minted once at `POST /app/projects/{id}/credentials`.
The **P13 CLI already implements the exact flow** — `cli/src/knowledge_cli/auth.py`
(`DEFAULT_BASE_URL = "https://knowledge.hi2vi.com"`, signup/login via `/auth/*`, project
+ `vk_` mint) writes `~/.config/knowledge-kb/config.json` `api.token` via
`cli/src/knowledge_cli/config.py:save()` — the **same config file** the explain skill's
resolver reads. A real `vk_` there already lights up the plugin, zero code change. The
setup skill (`plugin/skills/setup/SKILL.md`) is **local-only today**: scaffolds a
self-hosted KB, writes config with `api.token: null`, has **no** signup/tenant/public-host
step. S3 closes that gap.

**Plugin-template parity / D9 (S4).** `scripts/plugin_parity.py` (driven by
`plugin/templates/manifest.json`: `identical`/`parameterized` classes + a `completeness`
sweep over `shipped_dirs = [server, tests, docs/assets, docs/stylesheets,
docs/javascripts]`) exits **1 with 36 issues** (re-run + confirmed this session): 8
byte-drift (`server/{config,db,documents,main,reindex,search}.py`, `pyproject.toml`,
`uv.lock`) + 1 parameterized (`compose.yml`) + 27 completeness (the P10–P16 server growth
never mirrored). Operator-ratified direction: **MIRROR the SaaS files into the template**
(not narrow `shipped_dirs`); accounts plane is dormant-safe without `DATABASE_URL`.
Verification bar: parity green **and** a rendered scaffold that imports/boots
single-tenant (setup skill renders this template — `pyproject.toml`/`uv.lock` must carry
the accounts-plane deps).

**Prod accounts-plane cutover (S5).** Deployed ~P15: `knowledge-api` + `knowledge-web` +
`knowledge-mcp` behind the dedicated edge (`deploy/knowledge.conf`; mkdocs site retired
P14.S3). Never done: the runtime cutover. Authoritative runbook `operations.md`
L410–428. Box `.env` needs operator-provisioned `POSTGRES_PASSWORD` /
`KB_OPERATOR_EMAIL` / `KB_OPERATOR_PASSWORD` (never committed). Deploy via the
**`Production Deploy`** GitHub Action (`workflow_dispatch`, deploys origin/main tip).
**Boot-deadlock-safe one-shot order (proven live 2026-07-17):** `stop api →
run --rm api alembic upgrade head → run --rm api python -m server.seed → up -d api`
(the naive `exec` form crash-loops on a fresh DB — boot reindex queries un-migrated
tables). Docs are **internally inconsistent** on whether a partial cutover was attempted
2026-07-17 — the cutover slice's **first step must be verifying the live box state**, not
assuming. `deploy.sh` does NOT run migrations/seed. Push, secrets, Action dispatch, and
migrate/seed are **operator-run → explicit `pending` gates**. Final verify:
`scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com`, one real
`knowledge init`, and the outstanding `vk_`-path E2E (`mcp-server/scripts/e2e_smoke.py`).

**Deferred/misc pins.** D11 (deploy self-upgrade trap) bites only if the compose service
set / health gates change — P17 adds no services; note, don't build for it. D13
(`source_url` field) is NOT triggered by in-body citation links — note, don't act. The
public mkdocs site is retired in prod (web/ is the viewer), so "should HTML publish to
mkdocs" is moot for the hosted flow; the local self-hosted stack still passes `.html`
docs through the mkdocs `kb` service as raw static assets (P16 verified the build) —
double-check nothing new breaks, don't build for it. **No design-cowork gate**
(operator-ratified): the explainer look = the operator-chosen gist reference applied by a
generated-document template; a slice that would invent a genuinely *new* product visual
language must stop and go through `design-cowork` (S1 should not need to).

**S1 done (2026-07-21) — canonical explain skill v2 shipped.** Cross-slice notes for the
copies (S2):

- **What the S2 copies must derive from the canonical body.** The whole `## 3–## 8` body
  is now portable prose (mode detection, HTML spec, save/fallback/report) and should be
  **derived structurally** into both OLD copies. The **only Claude-specific surface is the
  frontmatter**: `plugin/skills/explain/SKILL.md` carries `argument-hint` +
  `allowed-tools` (now including `WebSearch, WebFetch, Bash(git diff:*), Bash(git log:*),
  Bash(git show:*)` on top of `Read, Grep, Glob, Write, Bash(curl -sS --max-time 5:*),
  Bash(python3 -c:*)`). The portable `.agents/skills/explain/SKILL.md` variant drops
  `argument-hint`/`allowed-tools` (its tool policy lives in the sibling
  `agents/openai.yaml`) — so S2 must reflect the **new tool needs (WebSearch/WebFetch +
  git read)** into that yaml's policy, not just the SKILL body.
- **§2 config resolver is byte-identical** to the pre-v2 canonical copy (proven by diff) —
  keep it byte-identical across every copy; do not re-derive it.
- **New behavioral facts every copy must carry:** always-HTML output for both modes; the
  `research` / `no-research` trailing flags (compose with `here`); the default-on
  judgment-gated + offline-degrading web-research section with mandatory visible-domain
  citations; §5 `format:"html"` + `body.html` (no frontmatter); §6 fallback writes a
  `.html` doc with the exact `<!--kb …-->` comment-frontmatter (title JSON-double-quoted,
  bare date, YAML tags, `source: project/repo`, blank line, then `<!DOCTYPE html>`).
  The OLD copies today hardcode `~/projects/personal/knowledge` + `localhost:8766` and have
  no token — S2 decides whether those keep their hardcoded resolver or adopt the
  config-driven one (a genuine S2 call; the canonical copy is config-driven).
- **Version pin:** plugin is now `0.3.0` — bumped in `plugin/.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`, and `plugin/skills/setup/SKILL.md` (version strings
  only). Any later `plugin/**` change ships with its own bump.
- **S1 owned decisions (now settled, do not re-litigate):** best-practices section sits
  **between Code and Quiz**; skipped ⇒ section + ToC entry absent, no in-doc "skipped"
  note (chat report explains); `research`/`no-research` force on/off, last-one-wins, both
  strip like `here`; both modes share the four section names.
- **Fixture reuse:** `slices/P17.S1/sample-explainer.html` is a spec-conformant miniature
  explainer (self-containment grep-proven, 3 live-verified citations, working 5-Q quiz) —
  reuse it as S5's hosted-E2E render fixture rather than authoring a new one.

**S2 done (2026-07-21) — old copies reconciled; user-level copy handed to operator.**
Cross-slice notes for S5/REVIEW:

- **Dupe resolution (settled).** The project copy `.claude/skills/explain/` is **deleted**
  (it was the double-registration source in this repo's sessions). The user-level
  `~/.claude/skills/explain/SKILL.md` is **kept and must be updated to v2** by the operator —
  S2 returned **`needs_operator`** with the staged
  `cp plugin/skills/explain/SKILL.md ~/.claude/skills/explain/SKILL.md` (orchestrator verifies
  via `diff … && …`). So the **two shipped copies are `plugin/` (canonical) + `.agents/`
  (portable)**; the user-level bare copy is a personal-machine convenience, not a shipped
  artifact.
- **New drift guard.** `scripts/skills_parity.py` (root-only, never shipped; sibling to
  `plugin_parity.py`) now byte-compares the two shipped copies' **bodies** (FAIL on drift),
  WARNs on `description:` divergence, FAILs if either is missing; wired into
  `.github/workflows/plugin-ci.yml` as one step after `plugin_parity.py`. Any future edit to
  the canonical body MUST re-derive `.agents/skills/explain/SKILL.md` or CI goes red. The
  `.agents` body is now **byte-identical** to canonical; only its frontmatter differs
  (`name` + v2 `description`, no `argument-hint`/`allowed-tools`).
- **openai.yaml tools ceiling.** `.agents/skills/*/agents/openai.yaml` has **no
  tools/permissions field** in its schema (only `interface` + `policy.allow_implicit_invocation`)
  — the v2 WebSearch/WebFetch + git-read tool needs **cannot be declared there**; on the
  Codex/OpenAI side the SKILL prose is the tool guidance, and `allowed-tools` lives only on
  the Claude-plugin canonical copy. Left `policy` untouched.
- **S5/REVIEW "dogfood" end-state (flagged, NOT done in S2).** Post-cutover, the operator's
  own machine should install the plugin **user-wide from the public marketplace** and then
  **delete the user-level bare `~/.claude/skills/explain/` copy** — once the marketplace
  plugin is installed, the hand-maintained user-level copy is redundant and just a fourth
  drift surface. This is the desired steady state (one shipped source of truth per surface),
  but it depends on S5's public-marketplace cutover; S2 only updates the bare copy in place.
  Flag it in S5 planning / REVIEW, do not act on it now.

**S3 done (2026-07-21) — public-host onboarding folded into `/knowledge:setup`.**
Cross-slice notes for S5/REVIEW:

- **Shape landed.** No new skill and no web/server/cli change. `/knowledge:setup` gained a
  **mode question** (`## Choose your mode`) → **Connect mode** (hosted KB, the zero-infra
  default) vs **Scaffold mode** (the existing self-host flow, preserved verbatim under a new
  umbrella heading; stages `## 1.`–`## 7.` byte-unchanged, all "stage N" refs intact).
  Connect mode writes `~/.config/knowledge-kb/config.json` `{api.base_url/token,
  site.base_url}` with **no `kb_root`** → the explain resolver reports remote-only,
  `KB_LOCAL_FALLBACK=no` (proven this session against a scratch `XDG_CONFIG_HOME`). Files
  touched: `plugin/skills/setup/SKILL.md`, `plugin/README.md`,
  `plugin/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` (description
  clause only, **byte-same**, **no version bump** — 0.3.0 carries the phase).
- **`allowed-tools` gained `Bash(curl -sS --max-time 5:*)`** for connect verification; a
  benign side effect is that scaffold stage-6's localhost `curl` probes stop prompting
  (read-only; same behavior otherwise). Note for REVIEW: no version bump accompanied this
  `plugin/**` edit — deliberate, the phase ships as one 0.3.0 release (S1's decision).
- **What S5's hosted E2E must exercise for onboarding** (the outstanding `vk_`-path E2E,
  the connect-mode half): on the **live** public host after cutover —
  1. **Fresh web signup** at `https://knowledge.hi2vi.com/signup` (Create account, ≥8-char
     password) → a tenant/workspace is auto-created.
  2. **Create a project** (Dashboard → New project) and **open** it.
  3. **Mint a `vk_` credential** (project → API keys → New key → Create key) → the plaintext
     key is shown **exactly once** in the "Copy your new key now" panel; capture it.
  4. **Connect-mode config**: write `~/.config/knowledge-kb/config.json` with
     `api.base_url = api site.base_url = https://knowledge.hi2vi.com`, `api.token = <vk_>`,
     **no `kb_root`** (equivalently run `knowledge init`, which writes the same file — worth
     asserting the CLI and the setup skill converge on byte-equal config for the same
     inputs).
  5. **Verify** with `curl … -H "Authorization: Bearer <vk_>" ".../api/documents?limit=1"`
     → **200** (`{total, items}`); a bad/revoked key → **401** with no fallback.
  6. **`/explain` posts** an HTML explainer from an arbitrary repo → lands in **that user's
     tenant** under the repo-dirname project (one key, all repos — assert a *second* repo
     under a different project name files under the same key), and **renders interactively**
     in the web app under **Documents** (`/documents`) via the P16 sandboxed iframe.
     Reuse `slices/P17.S1/sample-explainer.html` as the render fixture (S1's note).
  - This connect-mode onboarding E2E is the counterpart to S5's `onboarding_smoke.py` +
    `knowledge init` checks; the render assertion depends on S5 having deployed web + the
    accounts plane. Nothing here can be verified until the S5 prod cutover — it is
    deploy-gated, as DECOMP anticipated.

**S4 done (2026-07-21) — plugin-template parity remediation shipped (D9 delivered).**
`scripts/plugin_parity.py` now exits **0** (was FAIL 36). Cross-slice notes for S5/REVIEW:

- **Parity is green → the S5 push no longer turns `plugin-ci.yml` red on the parity gate.**
  This was D9's promote trigger ("before the next push to origin/main"). The template now
  mirrors the P10–P16 SaaS server; `skills_parity.py` (S2's second gate) is also still
  green, so both plugin-ci drift gates pass. S5 can push without the parity step going red.
- **Mirror = 27 added + 8 refreshed files, all `identical`** (byte-copies:
  `server/{accounts,persistence,usage}/*`, the 8 top-level api modules, 4 `tests/test_*`,
  and refreshed `server/{config,db,documents,main,reindex,search}.py` + `pyproject.toml` +
  `uv.lock`). Any *future* `server/**` or `tests/**` growth in the repo re-opens parity —
  it must be mirrored again (or `shipped_dirs` narrowed). This is now a standing
  maintenance surface, same as it was pre-D9.
- **Dormancy is via one new render token, `{{KB_DATABASE_URL}}` on `compose.yml`'s
  DATABASE_URL line.** Operator params supply the full tenant URL (parity byte-matches
  repo); the setup skill's scaffold render passes `--set KB_DATABASE_URL=""` → `DATABASE_URL:`
  null → **UNSET in the container** → `config.database_url()` None → dormant. Proven with a
  full Docker boot (postgres healthy → api up → `/healthz` 200 → md POST/GET round-trip).
  `render.py` was **not** changed (no default mechanism; empty string suffices). Plugin
  stays **0.3.0**.
- **A scaffold now boots an *unused* postgres container + `pgdata` volume** (mirrored
  `depends_on: service_healthy`). Accepted per the operator-ratified "mirror, don't narrow"
  direction; postgres publishes no host port so there is no new bind conflict. Latent
  capability: a self-host user who exports `DATABASE_URL` in their shell lights the accounts
  plane up against the bundled postgres (opt-in; never fires by default).
- **Deliberately unshipped (limitation):** `alembic/`, `scripts/onboarding_smoke.py`, `cli/`
  are NOT in the scaffold — multi-tenant self-hosting (migrations) stays undocumented for the
  open-core template. D11 (deploy self-upgrade) is **not** triggered — no compose *service
  set* change to `compose.prod.yml`/`deploy/**` (those are untouched); the postgres service
  already exists in prod. Setup skill stage-6 wording left unchanged (still accurate).

**S5 Stage A done (2026-07-21) — external pre-flight + operator runbook.** Ran the 4
external probes + 2 discriminators against `https://knowledge.hi2vi.com`; returned
`needs_operator` with a customized checklist in `slices/P17.S5/result.md`. Headline
finding for Stage B / REVIEW:

- **The accounts-plane cutover (`operations.md` L410–428) is ALREADY DONE.** Discriminator
  `POST /auth/login` with nonsense creds → **401 `invalid email or password`** (the
  enumeration-safe answer), not a 500. Code-verified this is decisive: the login handler
  (`server/auth_api.py:242`) has no try/except; the service (`accounts/service.py:75`)
  re-raises DB errors as `AccountsReadError`, and an unset `DATABASE_URL` raises
  `RuntimeError` (`persistence/engine.py:36`) — so **dormant → 500, unmigrated → 500**,
  and only a **live+migrated** DB with the email absent yields the clean 401. Plus
  `/healthz` `documents:11` under `KB_STARTUP_REINDEX=true` ⇒ boot reindex resolved
  **tenant #1** ⇒ **seed ran**. So Postgres is up, migrations `0001`+`0002` applied, seed
  done, and the box `.env` secrets are present. The plan's "unknown" is resolved: **it is
  provisioned/migrated/seeded.**
- **What is still missing is P16 code, not the accounts plane.** The box deploys
  origin/main = `284fc03` (P15-era); local `main` `3ad7bd9` is **13 ahead / 0 behind**,
  carrying all of P16 (the HTML-explainer ingest/render/MCP pipeline Stage B's E2E needs)
  + P17 S1–S4. So the **push + `Production Deploy` are required — for P16.**
- **The redeploy is one-step and deadlock-free.** No new alembic migration
  (`alembic/versions/` byte-identical `284fc03`↔`3ad7bd9`); P16's `format`/`raw_html`
  columns are in the **SQLite** doc store, auto-added on boot by `db.py:init_db()`
  (`ALTER TABLE … ADD COLUMN`). The fresh-DB boot deadlock (L417) does **not** apply — the
  accounts DB is already migrated+seeded, so this is the "already-migrated later redeploy"
  path (api boots clean). The `stop→migrate→seed→up` one-shot is **omitted** from the
  required checklist; a fallback copy is in `result.md` for the unlikely case on-box
  confirmation contradicts the probes. seed is idempotent (`seed.py:28` — re-run = all
  "exists").
- **Stale runbook warning corrected:** the push does **not** turn `plugin-ci.yml` red
  (S4 made `plugin_parity.py` green; S2's `skills_parity.py` green) — both drift gates
  pass. When REVIEW consolidates the **operations** doc-version, L410–428 should be
  marked **executed/done** (accounts plane) with a note that P16 shipped in the same push.
- **Required operator actions (the `pending` gate):** (1) `git push origin main` (clean
  FF to `3ad7bd9`; `git pull --rebase` first only if the publish-on-write box advanced
  origin); (2) dispatch `Production Deploy` (`gh workflow run "Production Deploy" --ref
  main`). Steps 3 (on-box confirmation) + the fallback one-shot are optional.
- **Stage B re-dispatch** will re-verify (login discriminator + `/healthz`) then run the
  throwaway-account skill-path E2E incl. the outstanding MCP `vk_` path.

**S5 Stage B done (2026-07-21) — returned `needs_operator`: `knowledge-api` shipped STALE
(pre-P16) code.** Ran the secret-free throwaway-account skill-path E2E against the live
host after the operator's push (`3ad7bd9`) + GREEN `Production Deploy` (run 29830927799).
Headline for REVIEW / re-dispatch:

- **Accounts-plane cutover verified live (holds).** `/healthz` 200; `POST /auth/login`
  nonsense → 401 `invalid email or password` (migrated 401). Signup → project → `vk_`
  mint → tenant search → the **MCP `vk_`-path** (`e2e_smoke.py` search + fetch_document)
  all PASS against `knowledge.hi2vi.com`. The onboarding/`vk_` plumbing and the P15
  MCP residual are proven end to end. Throwaway acct:
  `kb-e2e-p17s5-20260721t214338@example.com`, tenant `8333f560-…`, doc id 12 (no delete
  API → operator may purge later; `vk_` held in tmp only, never in `works/`).
- **DEPLOYMENT DEFECT — `knowledge-api` is running pre-P16 code** despite
  `origin/main = 3ad7bd9` (which contains the P16 `format`/`raw_html` code at
  `server/main.py:383`, `server/documents_api.py:156`) and a GREEN deploy. Decisive live
  evidence: `POST /api/documents format:"html"` is **silently ignored** (→ `.md` doc, raw
  HTML stored verbatim in `markdown`, **no `format` in the 201**); `/api/documents/{id}`
  and `/app/documents/{id}` read projections **omit `format`**; **`GET /app/documents/{id}/raw`
  returns 404 `{"detail":"Not Found"}`** = FastAPI's route-absent default, i.e. the P16
  route does not exist on the box. Meanwhile **`knowledge-mcp` IS P16-aware**
  (`fetch_document` carries the additive `format`, value `"md"` defaulted because upstream
  omits it) — so the deploy rebuilt the MCP container but **not** the API container (a
  split deploy; likely a build-cache / no-recreate on `api`). The deploy's external smoke
  only checks `/healthz`/`/`/`​/mcp` — none exercise P16 — so GREEN did not prove P16 shipped.
- **Not a code defect and not Stage B's to fix** — `3ad7bd9`'s `server/` code is correct
  and complete; the fix is an **operator redeploy** (force-rebuild + `--force-recreate`
  the `api` service so it runs `3ad7bd9`; `init_db()` adds the SQLite `format`/`raw_html`
  columns idempotently on boot — no migration/seed/`.env` change). Exact commands +
  post-redeploy spot check are in `slices/P17.S5/result.md`. **Re-dispatch Stage B after
  the redeploy.** This slice made no source edits.
- **Doc-impact caveat for REVIEW:** the **operations** L410–428 accounts-plane cutover is
  executed & verified (mark it done) — but the **P16 hosted skill-path is NOT yet verified
  on prod** and the "P16 shipped in the same push" claim is currently **false on the box**.
  Do NOT let REVIEW record a "hosted P16 E2E verified" **qa** doc-version until `knowledge-api`
  actually runs P16 and Stage B re-passes. (Doc-impact lines below reflect this split.)

**S5 Stage B RE-RUN done (2026-07-21) — returned `done`: hosted P16 skill-path E2E FULLY
PASSES; run-1 caveat RESOLVED.** After the operator **restarted the bind-mounted
`knowledge-api` container** (now `Up` fresh) and the orchestrator verified the
discriminator flipped (unauth `GET /app/documents/1/raw` now **401** = P16 route present,
was route-absent **404**; `/healthz` 200), the full skill-path E2E was re-run with a
**fresh throwaway account**. Headline for REVIEW:

- **Run-1's `knowledge-api` staleness is fixed.** The restarted api now runs the P16
  `server/` code end to end. Every P16 assertion that failed in run 1 now passes: `POST
  /api/documents format:"html"` → **201 with a `.html` `rel_path` + `"format":"html"`**;
  `/api/documents/13` read-back → `"format":"html"` + `markdown` = **extracted text**
  (6723 chars, not raw HTML) + **no `raw_html` key**; `GET /app/documents/13/raw`
  (session) → **200 `<!DOCTYPE html>`** with **all four sandbox headers** (CSP `sandbox
  allow-scripts; frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `nosniff`,
  `no-store`); tenant search finds doc 13 by visible text `Debouncing`.
- **MCP `vk_`-path now relays the real `format`.** `e2e_smoke.py` PASS (search → 1 hit
  id 13, `fetch_document` → 6723 chars); a direct `fetch_document(13)` inspection shows
  **`"format":"html"`** (run 1 defaulted to `"md"` because the upstream api omitted it) +
  extracted markdown. The box is now fully P16-consistent (api + mcp + web).
- **QA caveat from run 1 is RESOLVED.** REVIEW **may** now record the **qa** doc-version:
  hosted end-to-end coverage of the skill path (signup → project → `vk_` mint → `format:
  "html"` ingest → P16 read shape → sandboxed-raw serve → tenant search → MCP `vk_`
  fetch) is **verified live on prod**. The one remaining human item for `P17.REVIEW` is
  the **in-browser quiz-render eyeball** (the P16 iframe rendering the interactive
  explainer in the web app — its raw-HTML relay + sandbox headers are now proven live).
- **Deployment incident to record (candidate `P17.F1`).** Run 1 revealed a real
  operational gap: a **GREEN `Production Deploy` (run 29830927799) left `knowledge-api`
  running stale pre-P16 code** while `knowledge-mcp` updated (a split deploy — likely a
  build-cache / no-`--force-recreate` on the `api` service under the bind-mount), and the
  deploy's external smoke (`/healthz`, `/`, `/mcp` only) **never exercises P16**, so GREEN
  did not prove the api picked up new `server/` code. It took an **operator container
  restart** to land P16. This is not a code defect (`3ad7bd9` was always correct) — it is
  a deploy-hygiene gap: the `Production Deploy` job should force-recreate `api` and its
  smoke should exercise a P16-discriminating probe (e.g. unauth `/app/documents/1/raw`
  expecting 401, not 404). Recommend REVIEW open **`P17.F1`** for this (deploy job hardening);
  it did not block the S5 verification, which is now complete.
- **Fresh throwaway (this run):** `kb-e2e-p17s5-rerun-20260721t131816@example.com`, tenant
  `48e2cc73-…`, doc id 13 (+ run-1's `8333f560-…`/doc 12 still present) — no delete API,
  operator may purge; `vk_` held in tmp only, never in `works/`. This slice made no source
  edits and ran no operator action (the api restart was the operator's; verified externally).

**P17.F1 done (2026-07-21) — deploy-hygiene fix landed (the S5 split-deploy incident).**
Static-only slice; one source file changed: `deploy/deploy.sh`. Notes for REVIEW:

- **Three edits, all in `deploy/deploy.sh`.** (1) New step **2b** after `dc up -d --build`:
  `dc up -d --force-recreate --no-deps api` — force-recreates the bind-mounted api
  unconditionally (`--no-deps` leaves the running postgres alone). (2) A **freshness
  self-assert**: `DEPLOY_START_TS="$(date -u +%s)"` after the config knobs, and a new
  `assert_api_fresh` (styled like `wait_healthy`) called in the `gate_ok` success branch
  before the final DONE log — it reads `docker inspect … {{.State.StartedAt}} knowledge-api`,
  converts via GNU `date -u -d … +%s` (box-only; **guarded** so a parse failure or missing
  container `die`s loudly), and `die`s if StartedAt < DEPLOY_START_TS ("api process
  predates this deploy — bind-mount stale-process trap; see P17.F1"). (3) Fixed the **false
  prose**: the old step-2 comment ("uvicorn reloads against the reconciled bind-mounted
  code") and the header's "rebuilds + recreates the app compose services" now describe
  reality (images rebuild; web/mcp recreate on image change; api is force-recreated
  explicitly). The header Lifecycle list was renumbered 5→6 steps to include the two new
  steps (minor within-intent extension of edit 3).
- **Static validation:** `bash -n` clean; `shellcheck` NOT installed here (not run); a
  portable dry-test of `assert_api_fresh`'s branch logic passed 5/5 (fresh / exactly-at /
  stale / missing-container / parse-failure), with the GNU `date -d` RFC3339 parse box-only
  by design; `workflow validate` passed; `plugin_parity.py` + `skills_parity.py` both still
  green (untouched — deploy/ is outside their coverage). Nothing in `.github/workflows/**`,
  `server/**`, or `compose.prod.yml` was touched.
- **ARMING RESIDUAL for REVIEW.** `deploy.sh` runs from the box clone and its own reconcile
  updates that clone, so the **first** post-F1 `Production Deploy` dispatch runs the OLD
  script (arms the fix by ff-ing the clone); the fix + self-assert **arm from the second
  dispatch onward**. The box is already current (operator restart today) → the first
  dispatch is a normal green, no forced red. A live two-dispatch proof is an **optional
  operator step** the orchestrator offers (dispatch #2's logs should show the
  `force-recreating the api` + `api process is fresh …` lines). If skipped, REVIEW should
  record "F1 armed, proven on next organic deploy" as a residual. This slice did NOT open a
  P16-discriminating smoke probe (the S5 note's secondary suggestion) — only the
  force-recreate + freshness self-assert were in F1's plan scope.

## Constraints

- **One output format everywhere:** v2 always emits the interactive HTML explainer for
  both modes; the markdown house style (§4) is fully removed. No mode still writes
  markdown.
- **Emitted HTML: self-contained, inline CSS/JS, zero external deps** — required by the
  P16 opaque-origin `sandbox="allow-scripts"` iframe. External CDN/fetch = broken render.
- **The skill emits no document frontmatter** — the API writes the `<!--kb …-->`
  comment-frontmatter; the skill POSTs raw from `<!DOCTYPE html>` in the `markdown` field
  with `format:"html"`.
- **Web-research section:** default-on, **every claim source-linked** (mandatory
  citations manage hallucination risk in a public KB), a judgment gate skips it
  (purely-internal / trivial), and it **degrades gracefully offline** (bootstrap P8 runs
  the skill unattended at phase reviews — the offline path must never hang or fail).
- **`~/.claude` is an operator-machine path** — any change to the user-level skill dupe
  goes through an operator co-work `pending` gate or an explicit operator note, never a
  silent write.
- **Sequencing (hard):** parity fix (S4) → push (operator, S5) → deploy + cutover
  (operator gates, S5) → hosted E2E. Skill/onboarding slices (S1–S3) are deploy-independent
  and precede it. Everything precedes `REVIEW`.
- **Operator-run actions are `pending` gates:** push to origin/main, box `.env` secret
  provisioning, `Production Deploy` dispatch, and the migrate/seed one-shot are the
  operator's to run — plan them as explicit stops, never automate them.
- **Cutover starts by verifying live box state** (docs are inconsistent about
  2026-07-17); the migrate→seed→up ordering is load-bearing (boot deadlock).
- **Parity: mirror, don't narrow;** verification is parity-green **and** a rendered
  scaffold that imports/boots dormant single-tenant.
- **Keep test files terse** (contract rule); behavioral E2E validation consolidates at
  `P17.REVIEW` (never pre-planned, never created by DECOMP — it already exists).
- **Docs are versioned once, at `P17.REVIEW`** — non-review slices append to the *Doc
  impact* running list below, never run `doc-new-version`.

## Open Questions

- **Exact placement of "Best practices & next steps" + any force-on/off argument** —
  **owned by S1** (DECOMP shapes, S1 finalizes; operator delegated the shaping). Not a
  blocker; resolved at S1's plan gate.
- **`~/.claude` user-level dupe: update or remove** — **owned by S2**; resolve at S2's
  plan gate and route the machine touch through an operator `pending` gate.
- **Onboarding shape: setup-skill public-host mode vs new skill vs defer-to-CLI** —
  **owned by S3**; a product-design decision resolved at S3's plan gate.
- **Whether to add a skill-sync mechanism (script/CI) for `plugin/skills/` copies** —
  **owned by S2** (optional; S2 may escalate if it turns out deep). Parity CI covers
  `plugin/templates/kb/` only today.
- **postMessage iframe-height handshake (deferred from P16) — PARKED.** DECOMP's
  deliberate call: **do not build it this phase.** P16 already ships a working
  fixed-height sandboxed iframe with internal scroll; the parent-side listener would add
  the `web/` subsystem to this phase for pure reading-comfort polish outside the confirmed
  intent's critical path, and a template-only height signal with no parent listener is
  dead code. Candidate for a future deferred if the operator wants it (a long single-page
  explainer growing to fit is genuinely nicer than internal scroll) — flagged, not built.
- **S4 final risk (medium vs high)** — **owned by the orchestrator** at S4's plan gate
  (see D9 coordination). Recommended medium, leans high.

### Doc impact

Running list of durable-truth changes; `P17.REVIEW` consolidates these into new doc
versions on a passing review. DECOMP seeds anticipated targets — each slice appends the
concrete change it made.

- _(anticipated, S1)_ **product** / **experience** — the explain skill's output becomes a
  single interactive HTML explainer (Background/Intuition/Code/Quiz + quiz) for both
  modes, replacing the markdown house style; adds a default-on cited "Best practices &
  next steps" web-research section.
- _(anticipated, S1/S2)_ **decisions** — always-HTML (one format everywhere); default-on
  web research with judgment gate + mandatory citations + offline skip; the
  plugin-canonical → copies derivation rule; parity mirror-vs-narrow; height-handshake
  parked.
- _(anticipated, S3)_ **product** / **operations** — plugin users onboard to the public
  host (`knowledge.hi2vi.com`) and post to their own tenant with their own `vk_`
  (whichever onboarding shape S3 lands).
- _(anticipated, S4)_ **architecture** / **operations** — the open-core plugin template
  now mirrors the multi-tenant SaaS server (dormant-safe without `DATABASE_URL`);
  `plugin_parity.py` green.
- _(anticipated, S5)_ **operations** — the P10–P13 hosted accounts-plane cutover is
  executed (mark the `operations.md` L410–428 runbook done / update its state); hosted
  `vk_`-path skill E2E verified. **qa** — hosted end-to-end coverage of the skill path.
- _(S1, done)_ **product** / **experience** — `/knowledge:explain` now always emits a
  single self-contained interactive HTML explainer (Background → Intuition → Code → Best
  practices & next steps → Quiz; ToC; 5-MCQ quiz with immediate feedback; HTML/CSS-or-SVG
  diagrams, never ASCII) for **both** topic and code-change modes; the markdown house
  style is fully removed. Adds a default-on, judgment-gated, offline-degrading, **cited**
  "Best practices & next steps" web-research section (placed between Code and Quiz;
  absent-with-no-marker when skipped).
- _(S1, done)_ **decisions** — always-HTML (one output format everywhere); web research
  default-on with a judgment gate (skip purely-internal / trivial) + mandatory
  visible-domain citations ("no citation, no claim") + graceful offline skip that never
  fails the save; `research`/`no-research` trailing force-flags (compose with `here`,
  last-one-wins); shared four-section names across both modes; best-practices section
  placement (between Code and Quiz). The §2 config resolver stays byte-identical across
  copies. Plugin bumped `0.2.1 → 0.3.0`.
- _(S1, done)_ **api usage** (contract unchanged, additive use) — the skill now POSTs
  `format:"html"` with the raw `<!DOCTYPE html>` body riding the existing `markdown`
  field and emits **no** frontmatter (the API writes the `<!--kb …-->` comment-frontmatter);
  the local-file fallback writes a `.html` doc carrying that same comment-frontmatter.
- _(S2, done)_ **decisions** — explain-skill copy topology resolved: the project copy
  `.claude/skills/explain/` is **deleted** (was a double-registration); the two **shipped**
  copies are `plugin/skills/explain/` (canonical, Claude-plugin frontmatter) and
  `.agents/skills/explain/` (portable, `name` + `description` frontmatter only, body
  byte-identical to canonical); the user-level `~/.claude/skills/explain/` copy is **kept and
  operator-updated** to v2 (operator-machine path, never written from the repo). A new
  root-only CI guard `scripts/skills_parity.py` (in `plugin-ci.yml`) enforces body parity
  between the two shipped copies so they cannot silently drift. Post-cutover steady state
  (S5/REVIEW): install the plugin user-wide from the public marketplace and drop the bare
  user-level copy.
- _(S2, done)_ **architecture** / **operations** — the plugin CI (`.github/workflows/plugin-ci.yml`)
  now runs a second drift gate, `skills_parity.py`, alongside `plugin_parity.py`; the
  `.agents` portable-skill schema (`openai.yaml`) exposes no tools/permissions field, so
  per-tool policy for the portable copy is expressible only via the SKILL prose, not the yaml.
- _(S3, done)_ **product** / **operations** — plugin users onboard to the **hosted** KB
  (`https://knowledge.hi2vi.com`) directly from `/knowledge:setup`: the setup skill now
  offers **Connect mode** (web signup → create a project → mint one `vk_` key → paste it →
  the skill writes `~/.config/knowledge-kb/config.json` with `api.base_url`/`token` +
  `site.base_url` and **no `kb_root`**, remote-only) alongside the preserved **Scaffold**
  (self-host) mode. Explainers post to the user's **own tenant**; **one `vk_` key serves
  every repo** (`/explain` sends the repo dirname as each doc's `project`; the key's bound
  project is usage attribution only). Email/password never cross the agent — only the
  minted key does. A terminal-only alternative (`uv tool install …#subdirectory=cli` →
  `knowledge init`) writes the identical config. `plugin.json` / `marketplace.json`
  descriptions and `plugin/README.md` updated to the two-path story; **no version bump**
  (0.3.0 carries the whole phase).
- _(S4, done)_ **architecture** / **operations** — the open-core plugin scaffold template
  (`plugin/templates/kb/`) now **mirrors the P10–P16 multi-tenant SaaS server** (accounts /
  persistence / usage packages, the `*_api` control-plane modules, `seed.py`, and the
  refreshed `pyproject.toml`/`uv.lock` carrying the accounts-plane deps), so
  `scripts/plugin_parity.py` is **green (exit 0, was FAIL 36)** and the plugin-CI parity
  gate stops blocking pushes. A rendered scaffold stays **dormant single-tenant**: a new
  `{{KB_DATABASE_URL}}` render token is the full tenant Postgres URL under the operator's
  params (parity round-trip) but **empty** for a scaffold → compose `DATABASE_URL:` null →
  UNSET in-container → `config.database_url()` None → accounts plane off (Docker-boot
  verified). The scaffold boots an unused `postgres` service (mirrored `depends_on`), and
  `alembic/` / `scripts/onboarding_smoke.py` / `cli/` are **deliberately not shipped** (so
  self-hosted multi-tenant migrations remain undocumented). Plugin stays 0.3.0; `render.py`
  and `compose.prod.yml`/`deploy/**` unchanged.
- _(S5 Stage A+B, DONE — full pass after api restart)_ **operations** — the P10–P13 hosted
  **accounts-plane cutover is executed and verified live** (`operations.md` L410–428:
  Postgres up, migrations `0001`+`0002` applied, seed done, box `.env` secrets present;
  proven by the migrated `401 invalid email or password` + a healthy `/healthz`). Mark that
  runbook state **done**, and record that **P16 shipped in the same `3ad7bd9` push** and is
  now live on the box. **Deploy-hygiene incident to capture (candidate `P17.F1`):** the
  first `Production Deploy` (run 29830927799) went **GREEN but left `knowledge-api` running
  stale pre-P16 code** while `knowledge-mcp` updated — a split deploy (build-cache /
  no-`--force-recreate` on the bind-mounted `api`); it took an **operator container restart**
  to land P16. The deploy's external smoke checks only `/healthz` `/` `/mcp` — none exercise
  P16 — so GREEN did not prove the api picked up new `server/` code. REVIEW should note this
  under operations and (recommended) open `P17.F1` to force-recreate `api` on deploy + add a
  P16-discriminating smoke probe (unauth `/app/documents/1/raw` → 401, not 404).
- _(S5 Stage B re-run, DONE)_ **qa** — the **hosted end-to-end skill path is verified live
  on prod** (`https://knowledge.hi2vi.com`), against a fresh throwaway tenant: signup →
  project → mint `vk_` → `POST /api/documents format:"html"` (S1 `sample-explainer.html`) →
  201 `.html` `rel_path` + `format:"html"` → `/api` read-back (`format:"html"`, extracted-text
  `markdown`, no `raw_html`) → session-guarded `GET /app/documents/{id}/raw` (200 raw HTML +
  the four sandbox headers) → tenant FTS finds it by visible text → **MCP `vk_`-path**
  (`e2e_smoke.py` search + `fetch_document`, the latter relaying `format:"html"` + extracted
  markdown). The outstanding P15 MCP `vk_` residual is closed. The **only** un-automated
  REVIEW item left is the in-browser quiz-render eyeball (the P16 iframe rendering the
  interactive explainer in the web app; its raw-HTML relay + sandbox headers are proven live).
- _(F1, done)_ **operations** — the `Production Deploy` (`deploy/deploy.sh`) now
  **force-recreates the bind-mounted `api`** after the build (`up -d --force-recreate
  --no-deps api`) and **self-asserts api-process freshness post-gate** (fails closed if the
  api container's `StartedAt` predates the deploy run — the "bind-mount stale-process trap")
  — closing the S5 split-deploy gap where a GREEN deploy left `knowledge-api` on stale code.
  The step-2 / header prose was corrected to describe this reality. Arms on the **second**
  post-F1 dispatch (the first runs the pre-F1 script from the box clone). No smoke-probe
  change was made (out of F1 scope).

### P17.REVIEW

**Verdict: `pass`** (2026-07-21, `slice-executor-high`). All five middle slices + F1
validated together and the phase meets the intent's four confirmed points; residuals are
honest and non-blocking; six durable-doc versions consolidated the ten `### Doc impact`
done-lines. Full report in `slices/P17.REVIEW/result.md`.

- **Validation matrix — green.** `workflow validate` pass; the seven work commits present;
  `plugin_parity.py` exit 0 (was FAIL 36) + `skills_parity.py` exit 0; `claude plugin
  validate .` / `./plugin` both ✔; `sample-explainer.html` first line `<!DOCTYPE html>` +
  all 8 self-containment greps empty + 5 sections / 5 correct answers; the §2 resolver →
  `KB_STATUS=configured` (scratch connect-mode config, real config untouched);
  `.claude/skills/explain/` absent and **`diff ~/.claude/skills/explain/SKILL.md
  plugin/skills/explain/SKILL.md` empty** (operator applied the staged v2 `cp` — S2's
  `needs_operator` gate is resolved); S3 scratch connect-mode → remote-only
  (`KB_LOCAL_FALLBACK=no`); S5 live re-probes `/healthz` 200 · login-discriminator 401
  `invalid email or password` · unauth `/app/documents/1/raw` **401** (P16 route present on
  the box — a stale api 404s); `bash -n deploy/deploy.sh` clean + the three F1 edits present;
  regression backend **70 passed / 13 skipped** + mcp-server **12 passed** (P17 touched no
  `server/`/`mcp-server/`/`web/` source, so these prove non-regression). Web suite skipped
  (zero web changes). The 17/17 hosted E2E + MCP `vk_` pass is cited from S5's `result.md`.
- **Intent met.** (1) always-HTML both modes, markdown house style removed — verified in the
  canonical SKILL.md; (2) best-practices default-on + judgment gate + mandatory
  visible-domain citations + graceful offline skip — verified in §3/§4.3; (3) public
  multi-user ingestion — Connect mode (S3) + live prod cutover + hosted `vk_`/MCP E2E (S5),
  one-key-all-repos; (4) copies reconciled + `skills_parity` CI guard (S2). Beyond intent:
  D9 delivered (S4), the split-deploy fix (F1). Constraints all held (no `/api/*`/MCP
  contract change — `format:"html"` is additive USE; no design-cowork breach; terse tests;
  docs versioned only here).
- **Residuals (none block):** in-browser quiz-render eyeball (operator, P16-precedent); F1
  armed-but-not-live-proven (arms on 2nd dispatch); two throwaway prod tenants + doc 13 (no
  delete API); `alembic/` deliberately unshipped (S4). D13 + the F1 P16-discriminating smoke
  probe stay noted-not-built (out of scope), carried forward.
- **Docs consolidated (source `P17.REVIEW`):** **product** v0008 · **experience** v0008 ·
  **decisions** v0016 · **operations** v0018 · **qa** v0008 · **architecture** v0014. The S1
  "api usage" line was folded into decisions/architecture as a no-contract-change additive
  use (per plan) rather than versioning **api** — `api` genuinely did not change. `rebuild-docs`
  regenerated `docs/current/*`; `validate` + `docs` confirm the index is consistent. (The
  operations version was recreated once with a shorter summary — the first slug + the
  editor's temp-suffix exceeded the 255-byte filename limit; bookkeeping only.)
- **Orchestrator:** record via `python3 scripts/workflow.py review-phase P17 --verdict pass`.
  No code touched, no commit, no status transition by this slice.
