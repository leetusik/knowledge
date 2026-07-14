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

### P7.S2 landed (2026-07-14) — plugin identity files created; both manifests validate green

- Plugin identity files exist: `.claude-plugin/marketplace.json` (marketplace
  `knowledge`, source `./plugin`); `plugin/.claude-plugin/plugin.json` (`v0.1.0`,
  MIT); root `LICENSE`; `plugin/` added to `.dockerignore`. `claude plugin
  validate` green on both manifests, including `--strict` (both came back clean —
  no metadata warnings to report).

### P7.S3 landed (2026-07-14) — template payload + renderer + parity guard; crux acceptance holds

- **Template-sync model is live.** ONE manifest (`plugin/templates/manifest.json`)
  declares the 3 file classes; ONE stdlib renderer (`plugin/setup/render.py`,
  importable `render()` + `RenderError`) is shared by the S5 setup skill and the
  root-only parity guard (`scripts/plugin_parity.py`); a NEW root-only workflow
  `.github/workflows/plugin-ci.yml` ("plugin parity") runs the guard on push. All
  root-only pieces stay OUT of the shipped `plugin/` payload; `pages.yml` untouched.
- **Final class decisions — NO reclassifications vs the baseline mapping.**
  identical=28 files (all 9 `server/*`, `graph_hook.py`, `site_smoke.py`, 6
  `tests/*`, `graph.md`, `tags.md`, `assets/{favicon,logo}.svg`, `extra.css`,
  `graph.js`, `Dockerfile`, `pyproject.toml`, `uv.lock`, `.dockerignore`,
  `pages.yml`); parameterized=2 (`mkdocs.yml` lines 1–3, `compose.yml` ports+TZ);
  template-only=5 (`docs/index.md`, `docs/getting-started/index.md`, the dated seed
  explainer, `Makefile`, `.gitignore`). `pyproject.toml` verified operator-agnostic
  (`name="kb-api"`, no personal fields) → identical as-is.
- **Placeholder set (final, 7):** `KB_SITE_NAME`/`KB_SITE_URL`/`KB_COPYRIGHT`
  (mkdocs.yml), `KB_TZ`/`KB_VIEWER_PORT`/`KB_API_PORT` (compose.yml + Makefile),
  `KB_DATE` (index bullet + seed-doc filename + seed-doc frontmatter). Parameterized
  files tokenized by exact full-line replacement → operator values round-trip
  BYTE-EXACTLY (the unquoted Korean copyright rebuilds identically; substitution is
  raw-string, never YAML re-serialization). All 7 tokens are referenced, so the
  renderer's typo guard reports zero unused keys.
- **Seed project = `getting-started`** (one non-reserved `docs/` subdir with one
  dated doc → satisfies S1's `discover_projects`). Seed explainer is a real
  house-style micro-explainer ("How Your Knowledge Base Works") with valid
  frontmatter (`source:` mapping w/ `project`, 4 lowercase-kebab tags, double-quoted
  title, `date: {{KB_DATE}}`, `source.repo` = basename → no `/Users/` leak).
- **Path-token design (S5 must know):** the dated seed explainer embeds `{{KB_DATE}}`
  in its COMMITTED template filename; `render.py` substitutes tokens in the dest
  relative path (no-op for token-free classes), so filename, frontmatter date, and
  the `index.md` Recent-bullet link all carry the same date and the link resolves.
- **Parity completeness rule** globs both sides of every `shipped_dirs` entry
  (`server`, `tests`, `docs/assets|stylesheets|javascripts`), excluding
  `__pycache__`/`.pyc`, and fails on any file in one side but not the other — a new
  `server/foo.py` can't silently miss the scaffold. Both negatives proven (byte
  drift + completeness).
- **How S5 drives it:** `python3 ${CLAUDE_PLUGIN_ROOT}/setup/render.py --dest <dir>
  (--params <file.json> | --set KEY=VALUE …) [--force]`; all 7 tokens required
  together; `--force` re-renders a non-empty dir; `render()` importable. **How S6
  reuses acceptance:** render → `mkdocs build` → `site_smoke.py --root <scaffold>`.
- **Validation:** parity green; NON-operator scaffold (Field Notes / America/New_York
  / ports 9765-9766 / date 2025-01-15) `mkdocs build` + `site_smoke.py --root` →
  **PASS** (crux); negative byte-drift + negative completeness both fire & restore
  green; renderer guards (missing key / typo `--set` / non-empty refuse / `--set`
  override) all correct; `plugin-ci.yml` YAML loads (via the repo's uv env — host
  python3 lacks PyYAML); manifest + params JSON valid; `workflow.py validate` passed.

### P7.S4 landed (2026-07-14) — shipped explain skill; config-driven, bearer + local-only fallback

- **Deliverable:** `plugin/skills/explain/SKILL.md` (invoked `/knowledge:explain`). The
  workspace source skill `.claude/skills/explain/SKILL.md` was NOT touched (stays for
  the operator until the bootstrap repo retires it). 8-step shape, house-style contract
  (step 4), API-first 201/409/422/401 semantics, and the byte-identical merge `python3
  -c` command all preserved verbatim-in-substance.
- **Config schema S5 MUST write — settled and proven.** The skill's step-2 `python3 -c`
  resolver reads `$XDG_CONFIG_HOME/knowledge-kb/config.json` (default
  `~/.config/knowledge-kb/config.json`) with **exactly** these key paths (nested, not
  flat):
  - `kb_root` (string; may be omitted for a remote-only config)
  - `api.base_url` (string; omitted → defaults to `http://localhost:8766`)
  - `api.token` (string; omitted/empty → no bearer header)
  - `site.base_url` (string; omitted → defaults to `http://localhost:8765`)
  So S5's config write is the JSON object `{"kb_root": ..., "api": {"base_url": ...,
  "token": ...}, "site": {"base_url": ...}}` (chmod 600). If S5 writes a **flat**
  `api_base_url`/`api_token` shape, this skill will NOT read it — keep the nesting.
- **Resolution precedence (per-key, highest first):** env (`KB_ROOT` /
  `KB_API_BASE_URL` / `KB_API_TOKEN`) → config file → legacy
  (`~/projects/personal/knowledge/mkdocs.yml` present) → unconfigured. A present config
  file is authoritative and does NOT fall through to legacy for keys it omits (omitted
  keys take the documented defaults; `kb_root` legitimately absent = remote-only).
- **Snippet output contract (what the running model reads):** `KEY=VALUE` lines —
  `KB_STATUS=configured|unconfigured|error`, then (when configured) `KB_ROOT`,
  `KB_API_BASE_URL`, `KB_API_TOKEN` (empty = none), `KB_SITE_BASE_URL`,
  `KB_LOCAL_FALLBACK=yes|no`. `KB_LOCAL_FALLBACK=yes` iff `kb_root` is a local dir
  containing `mkdocs.yml`; it is the single gate for the step-6 file fallback (remote
  KB or no local checkout → `no` → report & stop, write nothing). Validated across all
  five tiers + the remote-only guard under isolated env.
- **allowed-tools:** dropped the source's `Bash(git -C ~/projects/personal/knowledge:*)`
  (KB path no longer fixed — the rare fallback `git -C <kb_root>` commands take a normal
  permission prompt; NOT replaced by a broad `Bash(git:*)`). Kept `Read, Grep, Glob,
  Write, Bash(curl -sS --max-time 5:*), Bash(python3 -c:*)`.
- **For S6 (README):** the shipped explain skill's step 2 points the unconfigured user
  at `/knowledge:setup` — it does **NOT** reference a "Recreating from scratch" README
  section (superseding the earlier DECOMP anticipation that it would). So S6's
  "Recreating from scratch" README section no longer needs to satisfy a dangling
  reference from the explain skill; it stands on its own (still worth writing for the
  setup story). S6's explain E2E should exercise both paths: API (201, via the resolved
  base) and fallback (transport failure + `KB_LOCAL_FALLBACK=yes` local write).
- **Validation:** `claude plugin validate ./plugin` (+ `--strict`) both exit 0; config
  matrix (a–e) + remote guard + local-fallback + corrupt-config all pass; `healthz` GET
  ok (no POST to the live KB); `workflow.py validate` passed.

### P7.S5 landed (2026-07-14) — setup skill; scaffold → config → stack rehearsed end-to-end

- **Deliverable:** `plugin/skills/setup/SKILL.md` (`/knowledge:setup`,
  `disable-model-invocation: true`). ONLY source file added this slice — no helper script,
  no third-party dep. `allowed-tools: Read, Glob, Bash(python3 -c:*)`; every mutation
  (render.py, mkdir, marker/config Write, chmod, git, docker) takes a normal permission
  prompt by design. `plugin.json` stays 0.1.0.
- **Interview params & defaults (what S6's E2E must drive):** target dir (default
  `~/knowledge`, `$ARGUMENTS` overrides) · site title (default "Knowledge Base") · GitHub
  `owner/repo` OPTIONAL (given → `KB_SITE_URL=https://<owner>.github.io/<repo>/`; skipped →
  local-only `KB_SITE_URL=http://localhost:<viewer_port>/`) · copyright line (default = site
  title; whole `mkdocs.yml` copyright value) · TZ (host default via `/etc/localtime`
  symlink / `TZ`, else UTC) · viewer/API ports (8765/8766, asked only on "advanced") ·
  Gemini key NEVER collected (host env `GOOGLE_API_KEY`/`GEMINI_API_KEY` only) · `KB_DATE` =
  today. Confirm summary before any disk write.
- **render.py drive (exact):** `python3 "${CLAUDE_PLUGIN_ROOT}/setup/render.py" --dest
  <target> --set KB_SITE_NAME=… --set KB_SITE_URL=… --set KB_COPYRIGHT=… --set KB_TZ=…
  --set KB_VIEWER_PORT=… --set KB_API_PORT=… --set KB_DATE=…` (all 7 together; `--force`
  only on the re-render path). Renders 35 files.
- **Marker schema** `.kb-scaffold.json` (written into target): `{"plugin":"knowledge",
  "plugin_version":"0.1.0","rendered_at":"<YYYY-MM-DD>","params":{<the 7 non-secret
  KB_* values>}}`. No secret field ever.
- **Config write (the contract S4 consumes) — proven byte-for-byte:** nested
  `{"kb_root":<abs target>,"api":{"base_url":"http://localhost:<api_port>","token":null},
  "site":{"base_url":"http://localhost:<viewer_port>"}}` at
  `$XDG_CONFIG_HOME/knowledge-kb/config.json` (default `~/.config/...`), `chmod 600`,
  prompt-before-overwrite (one config, last-setup-wins). The explain resolver snippet
  extracted VERBATIM from `plugin/skills/explain/SKILL.md` and run against this config
  resolved `configured` + kb_root/api 9766/site 9765 + `KB_LOCAL_FALLBACK=yes`. `token`
  written as JSON `null` (not the string) → resolver yields empty `KB_API_TOKEN`.
- **Re-run semantics** keyed on the marker: EMPTY → fresh render; MARKED → reconfigure
  (skip to config) / re-render (`--force`, then show git diff) / abort; UNMARKED non-empty
  → refuse (covers the operator's own `~/projects/personal/knowledge`, which has no marker).
  Verified: `--force` re-render with unchanged params leaves `git status` clean; the
  presence test is a `python3 -c` classifier returning EMPTY/MARKED/UNMARKED.
- **For S6's E2E — exact commands to simulate a user run (all proven here with test params
  site "Field Notes 2" / local-only / TZ Europe/Berlin / ports 9765-9766 / date
  2026-07-14):**
  1. classify target (python3 -c EMPTY/MARKED/UNMARKED),
  2. `render.py --dest <t> --set …` (7 tokens),
  3. write `.kb-scaffold.json`,
  4. `git -C <t> init && git -C <t> add -A && git -C <t> commit -m "chore: scaffold knowledge base (knowledge plugin v0.1.0)"`,
  5. write config JSON at `$XDG_CONFIG_HOME/knowledge-kb/config.json` + `chmod 600`,
  6. gate: `docker run --rm -v <t>:/docs squidfunk/mkdocs-material:9.7.6 build` +
     `python3 <t>/scripts/site_smoke.py --root <t>` → PASS,
  7. optional stack: `docker compose -f <t>/compose.yml up -d --build`, probe
     `curl -sS --max-time 5 http://localhost:<api_port>/healthz` → `{"status":"ok",…}` and
     viewer root → 200, then `docker compose -f <t>/compose.yml down -v`.
  Ports 9765/9766 avoid the operator's 8765/8766 stack. Explain E2E (both API and fallback
  paths) is S6's own to add.
- **Validation:** plugin validate (+strict) exit 0; rehearsal (a–f) all pass — render,
  marker sanity, git commit + clean status, config 600 + verbatim-resolver contract check
  (`KB_LOCAL_FALLBACK=yes`), re-run/refusal semantics, scaffold gate PASS, and a full
  `compose up` with `/healthz`=`{"status":"ok",…,"documents":1}` + viewer 200 (then torn
  down, image + temp dirs removed); `workflow.py validate` passed; `plugin_parity.py` still
  PASS (adding a skill does not touch shipped_dirs/manifest).

### P7.F1 landed (2026-07-14) — write path auto-creates the project landing; S6 reproducer now green

- **The gap S6 found is closed.** The API write path and both explain-skill fallback
  branches created the dated doc + Recent bullet but never `docs/<project>/index.md`;
  `site_smoke.check_built` requires `site/<project>/index.html` for every project
  `discover_projects` finds, and mkdocs `navigation.indexes` does not synthesize one.
  A scaffold user documenting a SECOND project would fail their next Pages deploy gate.
- **The fix — the API owns it.** New `server/documents.py` helpers
  `project_landing_content(project)` + `ensure_project_landing(docs_root, project) -> bool`.
  `create_document` (`server/main.py`) calls `ensure_project_landing` inside the
  WRITE_LOCK right after `write_document_file`; when it returns `True` (landing was
  absent → created) the scoped commit stages a THIRD path `docs/<project>/index.md`
  (else the commit stays the usual 2 paths). Existing landings — hand-written or
  previously auto-created — are NEVER overwritten. New 201 response field
  `landing_created: bool` (symmetric to `recent_updated`) makes the side effect
  observable/testable.
- **The exact minimal landing content (byte-for-byte):**

      # <project>

      Explainers about `<project>`, kept in this knowledge base.

  H1 = project name, one-line description, and **no YAML frontmatter / no `source:`
  mapping** — so it stays a *non-doc*: `index.md` is on `graph_hook`'s `_SKIP_NAMES`,
  excluded from `discover_projects` doc-counting, and excluded from `check_graph`'s
  `fs_count`. It exists only to produce the per-project `site/<project>/index.html`.
- **DELETE-path reasoning (confirmed in code, no cleanup added):** deleting a
  project's last doc leaves the auto-landing behind, but a project dir with only
  `index.md` has zero countable docs → `discover_projects` (needs ≥1 non-`index.md`
  `*.md`) no longer lists it, while mkdocs still builds its landing page → the gate is
  unaffected. No delete-side cleanup is warranted (`_delete_document` unchanged).
- **Parity mirror set (byte-identical):** `server/documents.py`, `server/main.py`,
  `tests/test_api_write.py` copied to `plugin/templates/kb/...`; `plugin_parity.py`
  green. `test_api_write.py` gained 3 landing cases (first-doc creates + 3-path commit;
  second-doc leaves it untouched → 2-path commit; existing hand-written landing never
  overwritten) and the happy-path scoped-commit assertion was updated to the
  now-correct 3 paths (its `test-project` is a fresh project → first doc creates it).
- **Explain-skill ensure-landing step (fallback branch only):** added identically to
  all THREE repo copies — `plugin/skills/explain/SKILL.md` (shipped, step 6),
  `.claude/skills/explain/SKILL.md` and `.agents/skills/explain/SKILL.md` (kept
  body-identical; they differ only in frontmatter lines 4–5). The step writes the same
  minimal landing when `docs/<project>/index.md` is missing (never overwriting); the
  fallback's `git add -A` picks it up. The API branch needs nothing (the server does
  it). Bootstrap repo untouched (constraint stands). `plugin.json` kept at 0.1.0.
- **Reproducer, now PASSING (was S6's FAIL).** Rendered a non-operator scaffold (ports
  9765/9766, TZ America/New_York, date 2026-07-14), git-committed it, then drove the
  SCAFFOLD's own byte-identical server code via FastAPI `TestClient` (imported from the
  scaffold path — binds NO ports, so the live KB on 8765/8766 is provably untouched) to
  POST a doc into a NEW project `field-notes`: 201, `landing_created=True`,
  `docs/field-notes/index.md` auto-created and in the 3-path scoped commit, `source_repo`
  sanitized to basename (no `/Users/` leak). Then
  `docker run --rm -v <scaffold>:/docs squidfunk/mkdocs-material:9.7.6 build` →
  `site/field-notes/index.html` built → `site_smoke.py --root <scaffold>` → **PASS**
  (2 projects / 2 docs), no `/Users/` leak in built HTML. Operator-repo gate re-run
  unchanged (mkdocs build + `site_smoke.py` → PASS). All temp artifacts torn down;
  no leftover repro containers; live KB untouched.

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
- architecture — plugin/marketplace packaging layout landed: repo-root
  .claude-plugin/marketplace.json + isolated plugin/ payload (source
  "./plugin"). [S2]
- decisions — MIT license adopted (root LICENSE + plugin.json license); plugin
  hosted in this repo with payload isolation via plugin/ subdir. [S2]
- architecture — template-sync model is live: ONE manifest
  (`plugin/templates/manifest.json`) declares 3 file classes (identical /
  parameterized / template-only); ONE stdlib renderer (`plugin/setup/render.py`)
  is shared by the setup skill and the parity guard; drift is caught by a
  completeness rule that globs fully-shipped dirs on both sides. Scaffold tree
  under `plugin/templates/kb/` mirrors the repo layout path-for-path. [S3]
- operations — `.github/workflows/plugin-ci.yml` ("plugin parity") is a NEW
  root-only gate running `scripts/plugin_parity.py` on push (NOT `pages.yml`,
  which stays a portable shipped template); a scaffold rendered with non-operator
  params builds under mkdocs-material 9.7.6 and passes its own portable
  `site_smoke.py` deploy gate (the phase's crux acceptance). [S3]
- api — shipped explain skill: config resolution order (env → config file → legacy → stop), bearer auth on POST, unchanged server API surface. [S4]
- security — local-only fallback rule (no file writes for remote KBs), token via config file/env only, dropped path-scoped git allowed-tool in favor of prompted fallback. [S4]
- operations — /knowledge:setup flow: interview → render → marker → git init → config (600) → compose up/healthz or no-Docker path → Pages go-live checklist; re-run = reconfigure/re-render/abort via .kb-scaffold.json marker. [S5]
- security — setup never collects/writes secrets (Gemini via host env only; config chmod 600; token null by default); refuses unmarked non-empty targets. [S5]
- backend — write path auto-creates a minimal `docs/<project>/index.md` for a project's first document (never overwrites; joins the scoped commit); keeps every project satisfying the per-project deploy-gate invariant. [F1]
- api — POST /api/documents side effect documented: first doc of a new project also creates the project landing (new response field `landing_created: bool`); the explain skills' fallback branches ensure the same landing when the API is unreachable. [F1]
- qa — deploy-gate invariant (`site/<project>/index.html` per project) now holds for API- and fallback-written projects, proven by the S6 reproducer (render → POST into a new project → mkdocs build → `site_smoke.py` PASS on the grown corpus). [F1]

## Open Questions

- None blocking. (Advisory dependency edges are encoded on the slices; S1/S2 order is
  interchangeable.)
