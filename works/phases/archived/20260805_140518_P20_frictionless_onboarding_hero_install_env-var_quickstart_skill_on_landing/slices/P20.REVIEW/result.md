# P20.REVIEW — result (phase review)

Executor: `slice-executor-high`. Reviewed the whole phase (DECOMP + S1–S4) together, validated
every slice's commands, judged the work against the objective and `intent.md`'s four threads, and
— on a passing verdict — consolidated the `phase.md` "Doc impact" list into six new durable-doc
versions.

**Verdict: `pass`.** All four intent threads are delivered and live-verified; every validation is
green; the constraints held.

## Validation — all slices together

| Command | Slice(s) | Outcome |
|---|---|---|
| `python3 scripts/skills_parity.py` | S3 | **PASS** — "explain skill copies are in body parity (web copy byte-identical)" (the third web copy held) |
| `bash -n web/public/install.sh` | S1 | **PASS** (shellcheck not installed on this box) |
| `cli/.venv/bin/python -m pytest cli/tests -q` | S1 | **PASS** — 40 passed (system `python3` is 3.13 w/o pytest; repo venv is 3.12, per phase.md gotcha) |
| `cd web && npm run typecheck` | S1/S3 | **PASS** — `tsc --noEmit` clean |
| `cd web && npm run lint` | S1/S3 | **PASS** — `eslint .` clean |
| `cd web && npm run test` | S1/S3 | **PASS** — 66 vitest tests, 9 files |
| `cd web && npm run build` | S1/S3 | **PASS** — `next build`; `/` is `○ (Static)` (build-time `fs` read of `public/SKILL.md` proven) |
| Live `/healthz` | S4 | **200** `{"status":"ok",…,"documents":24}` (23→24 is normal publish-on-write box drift; a public doc was added since S4) |
| Live `/install.sh` | S4 | **200** `application/x-sh`, first line `#!/usr/bin/env bash`, `cmp`-identical to `web/public/install.sh` |
| Live `/SKILL.md` | S4 | **200** `text/markdown`, 26041 B, `cmp`-identical to canonical `plugin/skills/explain/SKILL.md` (parity gate served, not a fork) |
| Live `/` landing HTML | S4 | **200** — curl hero (2×), broken `uv tool install knowledge-cli` **gone (0×)**, `id="agents"` (1×), `id="skill"` (1×), `href="/SKILL.md" download` (1×), `KNOWN TRAP` (2×) |
| `python3 scripts/workflow.py validate` | all | **PASS** — "Workflow validation passed." (before and after doc consolidation) |

## Judgment vs the objective and `intent.md`'s four threads

1. **Broken install line → curl installer, live.** ✓ `web/public/install.sh` uses
   `git+https://github.com/leetusik/knowledge#subdirectory=cli` (bootstraps `uv` via Astral, then
   `uv tool install --reinstall`) — **not** PyPI (D-P13-1 stands). Hero line 1 is the curl one-liner;
   `terminals.ts` only references the broken string in a code comment noting the departure. Live
   `/install.sh` 200 + byte-identical. Clean-env `curl | bash` E2E proven (S4 Stage B, resolved to
   post-P20 `9742f56`).
2. **init/password honesty.** ✓ Hero depicts the `Password:` prompt; `auth.py:569` prints
   `web login: {base_url}/login (same email + password)`. No password generator, no backend change
   (decision 2 held). Live-proven on a throwaway prod account.
3. **Env-var REST path promoted with blockers surfaced.** ✓ Landing `#agents` section carries the
   `KB_API_BASE_URL`/`KB_API_TOKEN` exports, the `~/.zshenv` trap, the Codex
   `[sandbox_workspace_write] network_access = true` toggle, and a `200`/`401` health legend. Live
   in the landing HTML.
4. **Explain skill published copyable + downloadable, agent-first.** ✓ `/SKILL.md` served 200,
   byte-identical to canonical; `scripts/skills_parity.py` holds the third full-file web copy;
   landing has `<a href="/SKILL.md" download>` + a Copy control (fetches the served file, never a
   fork) + an expandable reader, with agent-first guidance.

**Constraints held.** `web/design/rounds/01-*` untouched and `02-onboarding` present (no git drift on
`web/design/rounds/`); no PyPI publish; `docs/current/*` not hand-edited (versioned here, once);
D16 → **promoted** (into S1), D10 → **dropped-as-done** (resolved by round 02), D20 (Windows
`install.ps1`) → **filed**; design DoD walked item-by-item (S3 result); S4 residue documented
(throwaway account + private doc id 24, no delete API). Slice statuses: DECOMP/S1/S2/S3/S4 all `done`.

## Doc versions created (one per affected doc, whole-phase)

Consolidated the "Doc impact" list into six new versions (`--source P20.REVIEW`), then `rebuild-docs`:

| Doc | New version | Captures |
|---|---|---|
| `product` | v0011 | Frictionless-onboarding product move (real hero, env-var quickstart, published skill; D16/D10) |
| `experience` | v0011 | Honest hero UX, `init` web-login line + D16 reuse, landing env-var quickstart + copyable/downloadable skill |
| `frontend` | v0010 | Honest hero copy, design round 02, the two new sections + copy-control island + served `/SKILL.md` |
| `operations` | v0021 | `install.sh`/`SKILL.md` served live (zero infra); push+web-deploy cutover verified live; no migration, D11 inert |
| `decisions` | v0018 | Five P20 ADRs (curl-not-PyPI, D16 reuse, prompt honesty, full-file parity copy, hero-copy-vs-design-round) + the D-P18 re-mint supersession |
| `qa` | v0010 | copy-button vitest (61→66), third full-file parity copy, live installer + init/D16/save E2E; new fragile-area |

`architecture`/`backend`/`data`/`api`/`security` intentionally **not** versioned — P20 added no
schema, endpoint, or trust-boundary change (the env-var REST path already existed; the installer +
`SKILL.md` are static files on existing infra).

## Observations (non-blocking; not fix slices)

- **`content.ts:99` still reads "An authenticated workspace"** — a generic P14-era feature-connect
  phrase. P18's frontend note flagged the surviving marketing "workspace" string as "left for P20,"
  but P20's confirmed intent + the four fixed decisions did **not** include a workspace→org copy
  rewrite of existing sections (S2's round 02 covered the two *new* sections + the D10 ledes only).
  Reworking designed-section copy is design-gated territory; this one word is a minor future copy
  touch-up, not a P20 defect. (`workspace-write` at `content.ts:230` is the correct Codex sandbox
  mode name and must not change.)
- **Depicted-vs-live nuance (S4, not a defect):** on prod a brand-new org's `default` project is
  server-pre-created at signup, so `init` #1 shows `project: default (already existed)` not the
  hero's `(created)`. The hero stays honest for a genuinely new org; captured in `experience`/`qa`.

## Deviations from plan.md

- **Doc set = 6, including `qa`** (the plan's expected set was decisions/experience/operations/
  frontend/product, "plus any doc the review judges durable-truth-changed, e.g. qa"). Versioned `qa`
  for the new vitest test + the third full-file parity copy + the live E2E posture — a genuine
  QA-truth change.
- **Cosmetic:** the `frontend` version filename carries a doubled extension
  (`…served_skill.md.md`) because the summary I passed ended in "…served_skill.md" and the tool
  appended `.md`. `docs/index.json`, the version file, and the regenerated `docs/current/frontend.md`
  are all coherent (validate + rebuild-docs green); left as-is rather than orphan the version.
- Otherwise none.
