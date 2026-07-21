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
