# Phase P7: Claude Code plugin

_Intent: see [intent.md](intent.md)._

## Objective

Package the knowledge feature as a Claude Code plugin hosted in this repo (.claude-plugin/plugin.json + marketplace manifest): ship the explain skill plus a setup flow that scaffolds a new user's own KB (server + MkDocs + Pages); installable via /plugin by any Claude Code user. Keep the architecture open to a future SaaS-like hosted version (noted, out of scope).

## Context

Packaging architecture is operator-approved and pinned in `slices/P7.DECOMP/plan.md`
(read it before planning any middle slice — it holds the verified Claude Code
plugin/marketplace format, the repo inventory, and the 3-file-class scheme). This
`phase.md` records the slice breakdown, the verification results, and the durable
constraints those slices must honor.

## Decomposition

Six implementation slices, ordered 1–6. Dependencies encoded via `--order` (sequence)
and `--depends-on` (advisory edges). S1 and S2 are independent and can go in either
order; S3 is the crux and needs both; S4 needs only the config schema (settled at S2);
S5 needs the renderer+templates (S3); S6 is last.

- **P7.S1 — Feature portability pass** (risk **medium**, order 1, deps none).
  Scope: make the shippable feature files portable so a fresh scaffold passes its own
  deploy gate. Concretely: de-hardcode `scripts/site_smoke.py` `PROJECTS` (line 48) so
  the built-site project check derives project dirs dynamically (from the docs tree /
  `graph.json`) instead of the operator's three names; pin the Dockerfile floating
  `ghcr.io/astral-sh/uv:latest` tag (line 16) to a fixed version; confirm (do NOT
  change) that `compose.yml` needs no `KB_PUBLIC_BASE_URL` — `localhost:8765` root is
  correct locally (see Findings §2). Settle the concrete byte-identical file set and
  nail down the 3-file-class mapping for S3. Deliverable ends with `site_smoke.py`
  green on this repo AND meaningful on a fresh scaffold.
  Risk rationale: judgment call on how to derive projects dynamically without weakening
  the deploy gate (it is a real CI invariant guarding the published site) — not
  mechanical, but bounded to two files → medium (opus), not high.

- **P7.S2 — Plugin skeleton + marketplace wiring** (risk **low**, order 2, deps none).
  Scope: repo-root `.claude-plugin/marketplace.json` (marketplace `knowledge`, owner
  `leetusik`, single entry `{name: "knowledge", source: "./plugin"}`);
  `plugin/.claude-plugin/plugin.json` (name `knowledge`, `version: 0.1.0` set HERE ONLY,
  `license: MIT`, homepage = live Pages site, description/author/keywords);
  `plugin/README.md`; root `LICENSE` (MIT). Validate with `claude plugin validate` and a
  local `/plugin marketplace add ./` smoke.
  Risk rationale: deterministic file authoring against a fully-pinned format spec — the
  main cost lever. Low (sonnet literal-follower) is appropriate ONLY because the format
  is fully specified in the plan; the executor escalates on any surprise (e.g.
  `claude plugin validate` unavailable, format mismatch). The one trap — version set in
  plugin.json ONLY, never the marketplace entry — must be spelled out in its plan.md.

- **P7.S3 — Template payload, renderer, parity guard** (risk **high**, order 3,
  deps S1, S2). Scope: `plugin/templates/kb/` populated per the 3 file classes
  (byte-identical snapshots; `{{KB_*}}` placeholders in `mkdocs.yml`/`compose.yml`;
  template-only generic `docs/index.md` + one seed welcome explainer + generic
  `Makefile` + `.gitignore`); ONE stdlib renderer `plugin/setup/render.py` shared by
  setup and the guard; operator params file (`plugin/templates/params.operator.json`);
  root-only `scripts/plugin_parity.py` that renders with the operator's real values and
  byte-compares against repo root; new root-only `.github/workflows/plugin-ci.yml` drift
  gate (NOT `pages.yml`). Acceptance: a rendered scaffold builds with mkdocs and passes
  the (now-portable) `site_smoke.py`; parity guard green against repo root.
  Risk rationale: the integration crux — byte-parity across a large, load-bearing file
  set, placeholder design that must round-trip, and the rendered scaffold must satisfy
  the deploy-gate invariants S1 made portable. Heavy judgment → high (opus top tier).

- **P7.S4 — Shipped explain skill** (risk **medium**, order 4, deps S2). Scope:
  `plugin/skills/explain/SKILL.md` — rewrite topic/config resolution to: env
  (`KB_API_BASE_URL`/`KB_ROOT`/`KB_API_TOKEN`) → `~/.config/knowledge-kb/config.json`
  (honor `$XDG_CONFIG_HOME`) → legacy `~/projects/personal/knowledge` convention → STOP
  "run /knowledge:setup"; add bearer header when a token is configured; restrict
  file+git fallback to ONLY when config resolves a LOCAL `kb_root` (remote `base_url`
  unreachable → report, never fallback). Preserve the house-style contract and the
  API-first / 201-409-422-401 branch semantics verbatim; add namespaced `name: explain`.
  Risk rationale: intricate existing semantics must be preserved exactly while new
  resolution logic is layered in — bounded to one file with a clear spec → medium.

- **P7.S5 — Setup skill** (risk **high**, order 5, deps S3). Scope:
  `plugin/skills/setup/SKILL.md` — full UX: ask target dir (default `~/knowledge`), site
  title, GitHub owner/repo (optional → `site_url`; skipped = local-only), TZ (host
  default), ports (8765/8766), optional Gemini key (host env only, never scaffolded).
  Do: `render.py` scaffold + `.kb-scaffold.json` marker (plugin/template version +
  params) → `git init` + initial commit → write config file (chmod 600) → Docker up +
  healthz/site probe else print uv alternative → print GitHub Pages enablement steps +
  verify checklist. Idempotent (marker present → reconfigure / re-render-with-diff /
  abort; non-empty dir without marker → refuse). Degraded modes: no Docker / no GitHub /
  no Gemini.
  Risk rationale: the most complex control flow — multi-branch UX, idempotency states,
  degraded modes, orchestrating `render.py` and external tools — heavy judgment → high.

- **P7.S6 — E2E install test + docs** (risk **medium**, order 6, deps S3, S4, S5).
  Scope: local `/plugin marketplace add ./` → `/plugin install` → run setup into a temp
  dir → `mkdocs build` + `site_smoke.py` on the scaffold → explain E2E (API path AND
  fallback path); author README "Install the plugin" + "Recreating from scratch"
  sections (the latter fulfills the dangling reference in the explain skill's step 2);
  write the release checklist (any `plugin/**` change pairs with a `plugin.json` version
  bump). Also the review-time doc-consolidation feeder.
  Risk rationale: integration testing + doc authoring across already-settled components
  — real judgment but bounded, no new design → medium.

## Findings & Notes

Verification of the plan's four "verify-before-relying" claims, checked against the
code on 2026-07-14:

1. **`site_smoke.py` PROJECTS hardcode — CONFIRMED, and it is the phase's crux
   dependency.** `scripts/site_smoke.py:48` pins
   `PROJECTS = ["changple5", "hi2vi_web", "bootstrap_agentic_workspace.sh"]`. `check_built`
   (lines 194–196) requires `site/<project>/index.html` for each. In addition
   `check_source` (58–68) requires a Recent bullet directly under the
   `<!-- explain:recent -->` marker, `check_built` (184–187) requires a rendered
   `<li>` Recent bullet, and `check_graph` (284–302) requires the doc-node count to
   equal the filesystem `docs/*/*.md` count and the per-project doc-count sum to match.
   A fresh scaffold (no changple5/hi2vi_web/bootstrap dirs) fails all of these. →
   **S1 must** de-hardcode PROJECTS to derive dirs dynamically (docs tree / graph.json),
   and **S3's seed content** (generic `index.md` with one seed bullet + one seed welcome
   explainer with valid frontmatter) must satisfy the marker/bullet/graph invariants so
   the scaffold passes its own `pages.yml` deploy gate. This is the S1↔S3 coupling.

2. **`compose.yml` lacks `KB_PUBLIC_BASE_URL` — RESOLVED: no change needed; do NOT
   "fix" it.** `public_base_url()` (`server/config.py:39–41`) defaults to
   `http://localhost:8765` and is used at exactly one place — `server/main.py:322–324` —
   to build the response `url` = `{base}/{project}/{date}-{slug}/`. That base is the
   LOCAL mkdocs viewer, which the `kb` compose service serves at root
   (`--dev-addr=0.0.0.0:8000` → published `8765:8000`). So `http://localhost:8765/...`
   is CORRECT locally; the `/knowledge/` subpath exists ONLY on the published Pages site
   (`mkdocs.yml site_url`), not locally. Setting `KB_PUBLIC_BASE_URL` would BREAK local
   viewer links. (Aside: the `Makefile` prints `localhost:8765/knowledge/`, which is
   actually wrong for the local viewer — but the Makefile is template-only/generic and
   never ships as-is, so this is moot for the payload.) compose.yml stays a
   parameterized-at-scaffold file for TZ/ports only.

3. **Dockerfile floating uv tag — CONFIRMED.** `Dockerfile:16`
   `COPY --from=ghcr.io/astral-sh/uv:latest /uv ...`. Pinning to a fixed uv version
   belongs in S1 (reproducible build) so the Dockerfile can join the byte-identical
   template class.

4. **Stale `result.md` stubs — CONFIRMED, ignored.** Both `P7.DECOMP/result.md` (264 B)
   and `P7.REVIEW/result.md` (261 B) are pre-existing empty-ish stubs from an older
   engine. This slice overwrites DECOMP's from scratch; the REVIEW stub is the review
   slice's concern.

Additional durable findings:

- **No `.claude-plugin/`, no `plugin/`, no `LICENSE` exist anywhere** in the repo (S2
  creates them from scratch). README has no "Install the plugin" / "Recreating from
  scratch" sections; the shipped explain skill's step 2 references a "Recreating from
  scratch" section that does not yet exist — S6's README work fulfills that reference.
- **Concrete 3-file-class mapping (for S1/S3):**
  - *byte-identical:* `server/*` (8 modules), `scripts/graph_hook.py`,
    `scripts/site_smoke.py` (after S1 de-hardcodes it), `Dockerfile` (after S1 pins uv),
    `pyproject.toml`, `uv.lock`, `.dockerignore`, `.github/workflows/pages.yml`,
    `docs/graph.md`, `docs/tags.md`, `docs/assets|stylesheets|javascripts/*`, `tests/*`.
  - *parameterized-at-scaffold:* `mkdocs.yml` (`site_name`/`site_url`/`copyright`),
    `compose.yml` (`TZ`, published ports) — NOT `KB_PUBLIC_BASE_URL` (see §2).
  - *template-only:* `docs/index.md` (generic hero + `<!-- explain:recent -->` marker +
    one seed bullet + the `.kb-card` graph link), one seed welcome explainer (valid
    frontmatter so `graph_hook.py` emits ≥1 node and the graph/bullet invariants hold),
    generic `Makefile` (no Tailscale/macOS, correct local URLs), `.gitignore` (add
    `.env`).
- **`pages.yml` is already portable** (no owner hardcoded, pins `mkdocs-material==9.7.6`,
  runs `site_smoke.py` as the deploy gate). It ships byte-identical; S1's de-hardcoding
  is precisely what lets a fresh scaffold survive this gate. `pages.yml` itself is not
  edited — but the NEW `plugin-ci.yml` in S3 is a separate root-only workflow (parity
  guard), NOT a change to `pages.yml`.
- **`.dockerignore`** excludes `docs/`, `works/`, `data/`, etc. — harmless in a scaffold
  (no `works/`), ships byte-identical. **`.gitignore`** currently lacks a `.env` entry;
  the template-only `.gitignore` adds it.
- **Config schema (SaaS-open), settled by the architecture / S2:**
  `~/.config/knowledge-kb/config.json` (honor `$XDG_CONFIG_HOME`; keys `kb_root`,
  `api.base_url`, `api.token`, `site.base_url`; chmod 600). This is what S4's resolution
  order and S5's config write both target.
- **The plugin payload MUST live in `plugin/`** (marketplace `source: "./plugin"`) — a
  root `source: "./"` would copy the operator's personal `docs/`, `works/`, `data/` into
  every installer's cache. No symlinks for template sync (Windows materializes them as
  text). `${CLAUDE_PLUGIN_ROOT}` reaches payload dirs at runtime.

### P7.S1 landed (2026-07-14) — portability pass done; byte-identical class confirmed

- **`scripts/site_smoke.py` de-hardcoded.** `PROJECTS` (old line 48) replaced by a
  module-level `RESERVED_DOC_DIRS` constant + `discover_projects(root) -> list[str]`
  (sorted non-reserved `docs/` subdirs carrying ≥1 `*.md` other than `index.md`).
  **Both** `check_built` (per-project `site/<project>/index.html` loop) and
  `check_graph`'s `fs_count` now use this one helper — **one discovery truth**, they
  cannot drift. Teeth guard added in `check_built`: zero discovered projects →
  `"no project dirs discovered under docs/"`. On this repo discovery yields exactly
  the old three projects; guard stays green; all other checks byte-untouched. **S3
  coupling:** the guard now self-discovers a scaffold's own seed project, so S3's
  seed `index.md` + welcome explainer just need to satisfy the marker/bullet/graph
  invariants — no per-name coordination needed. Note the zero-project guard sits
  inside `check_built` after its `site/`-missing early return, so it only fires once
  `site/` exists (always true in the real gate, which builds before smoking).
- **`Dockerfile` uv stage pinned** `ghcr.io/astral-sh/uv:latest` →
  `ghcr.io/astral-sh/uv:0.8.14`. **Heads-up for S3:** the plan said `0.11.28` on a
  wrong premise ("host uv = 0.11.28"); the host actually runs `uv 0.8.14` (the uv
  that produced `uv.lock`), so I pinned `0.8.14` — the truly locally-proven version.
  Both tags exist on ghcr and both build. **S3 ships this Dockerfile byte-identical,
  so the shipped pin is `0.8.14`.** If the operator later bumps uv, it is a one-line
  change here + in the template snapshot.
- **`compose.yml` left untouched** (confirmed non-issue per Findings §2 — no
  `KB_PUBLIC_BASE_URL`).
- **Byte-identical template class (from Findings §5 mapping) is now settled for S3:**
  `scripts/site_smoke.py` (portable dynamic discovery) and `Dockerfile` (pinned uv
  0.8.14) both join it unchanged. No shift to the 3-class mapping — the mapping
  already anticipated "after S1" for both files; S1 simply realized it.
- **Validation:** mkdocs 9.7.6 build + `site_smoke.py` → PASS; negative test (drop a
  built project dir) → fails naming it, restores green; empty-`docs/` temp tree →
  zero-project guard fires; `COMPOSE_BAKE=false docker compose build api` → Built
  (pinned uv tag pulls); `workflow.py validate` → passed.

## Constraints

- **License:** MIT (operator decision 2026-07-14) — root `LICENSE` + `license: "MIT"` in
  `plugin.json`.
- **Plugin payload isolation:** nothing personal ships. The payload lives under
  `plugin/` and is copied whole to every installer's cache — never ship the operator's
  `docs/` content, `works/`, `data/`, `.env`, tokens, or workspace machinery
  (`scripts/workflow.py`, `.claude/skills/*` workflow skills, `executors.toml`,
  `AGENTS.md`/`CLAUDE.md`). Only the templated KB + the two user-facing skills ship.
- **Scope = Claude Code plugin only.** The `.agents/` Codex mirror is the bootstrap
  workspace's concern — out of scope here.
- **Bootstrap repo untouched** by this phase; the bootstrap repo's P7 (retire embedded
  /explain) stays blocked until this phase's review passes.
- **Never push.** No `git push` anywhere, at any slice.
- **Release discipline:** any change under `plugin/**` pairs with a `plugin.json`
  `version` bump (installers receive updates only on version bumps); document this in
  S6's release checklist.
- **SaaS-open config model:** config resolution and auth boundaries must not preclude a
  future hosted multi-user version (hosted API later = different `base_url` + token) —
  build nothing hosted now. Secrets hygiene: no token/Gemini key ever written into a
  scaffold; config file chmod 600.
- **Parity guard is root-only:** `scripts/plugin_parity.py` + `.github/workflows/plugin-ci.yml`
  live at repo root and are NOT part of the shipped `plugin/` payload; `pages.yml` (itself
  a template) stays portable and is not repurposed as the drift gate.

## Doc impact

_Running list of durable-truth changes for the P7.REVIEW slice to consolidate into doc
versions (one version per affected doc, capturing the whole phase). Seeded here with the
docs the middle slices are anticipated to touch; each slice appends the specifics it
lands._

- architecture — plugin/marketplace packaging layout (`.claude-plugin/`, `plugin/`
  payload isolation, template-sync + parity-guard model). [anticipated: S2, S3]
- api — shipped explain skill's config-resolution order + bearer auth; unchanged server
  API surface noted for the packaged distribution. [anticipated: S4]
- operations — install/setup flow, scaffold deploy gate (portable `site_smoke.py`),
  `plugin-ci.yml` parity gate, release/version-bump discipline. [anticipated: S1, S3, S6]
  - [S1 landed] deploy gate is now portable: `site_smoke.py` derives project dirs
    dynamically (`discover_projects`, one truth shared by built-site + graph checks)
    instead of three hardcoded names, with a zero-project teeth guard; Dockerfile uv
    stage pinned to `0.8.14` for reproducible builds.
- security — SaaS-open config model, secrets hygiene (config 600, no key/token in
  scaffolds), local-only-fallback rule. [anticipated: S4, S5]
- decisions — MIT license; plugin-hosted-in-this-repo; `source: "./plugin"` isolation;
  no `KB_PUBLIC_BASE_URL` change (localhost root is correct). [anticipated: S1, S2]
  - [S1 landed] dynamic project discovery chosen over a hardcoded `PROJECTS` list
    (one discovery rule for both the built-site per-project check and the graph
    doc-count identity, so they cannot drift); uv pinned to the locally-proven host
    version `0.8.14` (not the plan's `0.11.28`, which rested on a wrong host-version
    premise) — reproducible and byte-identical-shippable.
- product — the feature is now an installable Claude Code plugin for any user.
  [anticipated: S6]

## Open Questions

- None blocking. (Advisory dependency edges are encoded on the slices; S1/S2 order is
  interchangeable.)
