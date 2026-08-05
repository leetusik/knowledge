# P20.DECOMP — plan (orchestrator native plan, operator-approved 2026-07-22)

Decompose P20 "Frictionless onboarding: hero, install, env-var quickstart, skill on landing" into middle slices. Executor: `slice-executor-high`.

## Your job (and only this)

1. Create the phase's middle slices as **bare folders** with `python3 scripts/workflow.py new-slice --phase P20 --slice P20.S<n> --name "..." --kind ... --risk ... --order ...` — **except S1** (see "S1 exception" below). Never pre-fill any created slice's `plan.md`.
2. Record in `phase.md`: the slice breakdown (what each slice covers and why, including S1's full spec), the risk rationale per slice, the grounded findings below (verify/extend them as you research), the operator-approved decisions, and anything later slices need. Fill the empty `## Context` / `## Constraints` / `## Open Questions` sections as appropriate.
3. Run `python3 scripts/workflow.py validate`.
4. Write `result.md`, return the structured verdict.

No implementation code. No commits. No state transitions beyond `new-slice`.

## S1 exception (deferred-job linkage)

S1's scope includes deferred job **D16** (`works/deferred/open/D16/` — "knowledge init --project other re-mints an org key (reuse-gate relaxation)"; its trigger "next CLI onboarding slice (e.g. P20)" fires now). `promote-deferred` transitions deferred state, which is the orchestrator's job — so do **not** create S1 yourself and do **not** run `promote-deferred`. Instead record S1's full spec in `phase.md` (id `P20.S1`, name, kind, risk, order — reserve order 1), and the orchestrator will create it via `promote-deferred D16 --phase P20 --slice P20.S1 ...` right after you return. Create your other slices with orders that leave order 1 free.

Similarly: do **not** run `defer-job`. Where new deferrals are warranted (e.g. Windows `install.ps1`, below), record them in `phase.md` under a "Deferrals to file" note; the orchestrator files them.

## Operator-approved decisions (fixed — decompose around these, don't relitigate)

1. **Install fix = curl installer** (operator's explicit lean, this run): hero line 1 becomes `curl -fsSL https://knowledge.hi2vi.com/install.sh | bash`. The script: `set -euo pipefail`; check for `uv`, bootstrap via the official Astral installer if missing (clearly echoed); then `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli`; verify `knowledge` on PATH; print the next step (`knowledge init --email you@example.com`). Not PyPI (operator account + release process — stays "a later, separate call", D-P13-1 stands), not the raw git+ line in the hero (too long for a hero). **Windows `install.ps1` is deferred** — record as a deferral to file, don't build it.
2. **Password honesty = depict the prompt; no password generator.** Hero terminal gains the password-prompt line (`knowledge init` already prompts via getpass; `--password-stdin` / `$KNOWLEDGE_PASSWORD` exist; no `--password` flag by design). Plus one line added to `knowledge init` success output pointing at web login with the same email + password (base_url-aware). No signup-flow/backend change.
3. **D16 folds into S1** (org keys are project-agnostic, `project_id NULL` — `init --project other` should reuse the org key, not re-mint). **D10** ("Landing feature-section lede copy" — trigger "next design round" fires) **rides the design round**: its lede-copy question goes into the design handoff, posed to the operator; bookkeeping closed after the design lands. Note both in the breakdown.

## Grounded facts (verified this session — spot-check, then record in phase.md)

- Hero terminal copy: `web/src/content/marketing/terminals.ts:25` (`uv tool install knowledge-cli` — the live failure; `knowledge-cli` was never published, D-P13-1 at `docs/current/decisions.md:711-719`). Consumed only by `web/src/components/marketing/hero.tsx`; renderer `TerminalBlock` is a static `<pre>` (not copyable).
- `web/public/` ships in the standalone Next image (`web/next.config.ts:12` `output: "standalone"`; Dockerfile copies `public/`; `web/.dockerignore` doesn't exclude it) and nginx (`deploy/knowledge.conf:251-257`) proxies `/` catch-all → a committed `web/public/install.sh` is live at `https://knowledge.hi2vi.com/install.sh` with zero infra work. `curl | bash` is content-type-agnostic. No end-user installer exists in-repo today. Edge is nginx on Oracle Cloud (no Cloudflare config in-repo — corrects the intent's Cloudflare assumption; either way no barrier).
- Working install form: `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli` (`cli/README.md:11`; also `guide.py:37` INSTALL_COMMAND). CLI: `requires-python >=3.12`, single dep httpx, console script `knowledge` (`cli/pyproject.toml`). The git+ form installs **what's on GitHub main** → shipping S1's CLI changes requires an operator-gated `git push`.
- `knowledge init` (`cli/src/knowledge_cli/auth.py:458`): signup-or-login → ensure project → key reuse-or-mint gate (`auth.py:491-522`; reuses same-service/same-project keys, mints P18 org-level key via `POST /app/credentials` with `project_id NULL`) → config to `~/.config/knowledge-kb/config.json` (0600) → prints resolver re-verification + `done — /knowledge:explain now writes to this knowledge base`. D16's bug lives in that reuse gate.
- Skill to publish: `plugin/skills/explain/SKILL.md` (486 lines, canonical; operator's "explain.md"). Byte-parity-guarded against `.agents/skills/explain/SKILL.md` by `scripts/skills_parity.py` (bodies must match; CI: `.github/workflows/plugin-ci.yml:25`). A landing-served copy must **join or derive from this gate** (e.g. build-time copy from canonical + parity check extension), never fork.
- Env-var agent path (the recommended setup this phase promotes): `KB_API_BASE_URL` / `KB_API_TOKEN` override everything in the skill's resolver (`SKILL.md` §2) and the CLI config (`cli/src/knowledge_cli/config.py:57-58`). Known blockers to reflect in copy (from intent.md): repo `.env` is never auto-loaded (recommend `~/.zshenv`), Codex needs `[sandbox_workspace_write] network_access = true`.
- Landing design provenance: `web/design/rounds/01-landing/` (handoff, SIGNOFF, output/build-prompt.md, tokens). Locked brand: teal-only interactive accent, Fraunces / Source Sans 3 / JetBrains Mono, warm paper, no emoji. Runtime tokens: `web/src/app/kb-tokens.css`, `globals.css` `@theme` bridge, `marketing.css` band mechanics, shared primitives in `web/src/components/marketing/primitives.tsx`. Copy-to-clipboard idiom to reuse exists (`web/src/components/copy-link-button.tsx`, `ShowOnceKey` in `mint-credential-form.tsx`).
- New landing sections (env-var quickstart, skill-on-landing) ⇒ **design-cowork round 02**. Per the design-cowork skill: the design slice is `--kind co-work --risk high`, is run by the **orchestrator on the main thread** (DesignSync is main-thread only — this slice is never dispatched), produces only `handoff.md` → pending → read-back → landed design + SIGNOFF; implementation is a **separate** slice sized from the returned `build-prompt.md`. Do not over-plan the implement slice now — the read-back routinely re-shapes it.
- Changing the hero terminal's command text is a copy/content fix inside the already-designed component (content lives in `terminals.ts`, cited "verbatim from build-prompt.md §4" — the design record itself is read-only; note the departure in a code comment, never edit `web/design/rounds/01-*`). It does NOT need a design round. New sections DO.

## Suggested shape (you own the final breakdown — adjust if research says otherwise)

- **S1 — installer + hero honesty + CLI onboarding fixes** (implementation; no design dependency; spec only — orchestrator creates it): `web/public/install.sh`, `terminals.ts` hero fix (curl line + password-prompt line + keep depicted output honest to real init output), init success web-login line, D16 reuse-gate relaxation. Consider whether `cli/README.md` / `guide.py` INSTALL_COMMAND copy should mention the one-liner too.
- **S2 — design round 02** (`co-work`, risk high, order 2): handoff covering the env-var quickstart section + skill-on-landing section (+ D10 ledes posed back as operator questions).
- **S3 — implement the designed sections** (implementation, order 3; scope deliberately loose until the read-back; risk per your judgment — likely high given design fidelity + parity plumbing).
- **S4 — ship + live verify** (implementation, order 4, operator gates: push main to GitHub, prod deploy; then `curl -fsSL https://knowledge.hi2vi.com/install.sh | bash` smoke in a clean environment, live hero check, skill copy/download check, `knowledge init` against prod).
- `P20.REVIEW` exists; never pre-plan it.

Risk is the cost lever: `low` ONLY for fully mechanical work (slice-executor-low is a literal plan-follower); `medium` → mid tier; anything needing judgment or prod access → `high`. Give each middle slice a deliberate `--risk` and record why.

## Validation

`python3 scripts/workflow.py validate` must pass with your created slices; the backlog rebuild will show them.
