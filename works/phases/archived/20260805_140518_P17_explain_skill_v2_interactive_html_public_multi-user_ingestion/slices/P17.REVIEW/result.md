# Result — P17.REVIEW: phase review

**Verdict: `pass`.** All five middle slices + F1 validate together; the phase meets the
intent's four confirmed points and every constraint held; the residuals are honest and
non-blocking (the operator delegated / P16-precedent class). Six durable-doc versions
consolidated the phase's `### Doc impact` lines. No source touched (review slice); no
commit; no status transition.

## Validation matrix (all slices together)

| Slice | Check | Outcome |
|---|---|---|
| all | `python3 scripts/workflow.py validate` | **passed** (exit 0) |
| all | `git log --oneline` shows the work commits | **present** — `fd35a34` DECOMP · `c74350c` S1 · `4171bd0` S2 · `7ada848` S3 · `3ad7bd9` S4 · `07db7d4` S5 · `f923822` F1 |
| S4 | `python3 scripts/plugin_parity.py` | **exit 0** — "PASS — plugin templates are in parity with the repo" (was FAIL 36) |
| S2 | `python3 scripts/skills_parity.py` | **exit 0** — "PASS — explain skill copies are in body parity" |
| S1/S3 | `claude plugin validate .` + `claude plugin validate ./plugin` | **both ✔ Validation passed** (CLI present) |
| S1 | `sample-explainer.html`: first line `<!DOCTYPE html>` | **yes** |
| S1 | self-containment greps (`src=`, `<link`, `@import`, `url(http`, `fetch(`, `XMLHttpRequest`, `<form`, `target="_blank"`) | **all 0 matches** |
| S1 | structure: 5 `<section>`, 5 `data-correct="true"`, `pre-wrap` present | **yes** (5 / 5 / 1 CSS rule) |
| S1/S3 | §2 resolver run once (scratch `XDG_CONFIG_HOME`, connect-mode config, real config untouched) | **`KB_STATUS=configured`**, host echoed, `KB_LOCAL_FALLBACK=no` |
| S2 | project copy `.claude/skills/explain/` absent | **absent** |
| S2 | `diff ~/.claude/skills/explain/SKILL.md plugin/skills/explain/SKILL.md` | **empty (identical)** — operator applied the staged v2 `cp`; S2's `needs_operator` gate is resolved |
| S3 | scratch connect-mode config → resolver | **configured**, `KB_API_BASE_URL=https://knowledge.hi2vi.com`, `KB_LOCAL_FALLBACK=no` (remote-only) |
| S5 | live re-probe `GET /healthz` | **200** `{"status":"ok",…,"documents":13}` |
| S5 | live re-probe `POST /auth/login` nonsense creds | **401 `invalid email or password`** (migrated/live discriminator) |
| S5 | live re-probe unauth `GET /app/documents/1/raw` | **401** (P16 route present on the box; a stale api returns route-absent 404) |
| S5 | full 17/17 hosted E2E + MCP `vk_` fetch | **cited** from `P17.S5/result.md` Stage-B re-run (not repeated; secret-safe) |
| F1 | `bash -n deploy/deploy.sh` | **clean** |
| F1 | the three edits present (force-recreate `--no-deps api`, `assert_api_fresh` + `DEPLOY_START_TS`, corrected prose) | **all present** |
| regression | backend `uv run pytest tests -q` | **70 passed, 13 skipped** (== P16 baseline) |
| regression | mcp-server `uv run pytest` | **12 passed** |
| regression | `git diff --name-only` over P17 commits, filtered to `server/ mcp-server/ web/` | **none** — P17 touched no server/mcp/web source, so the suites prove non-regression |

Web suite skipped by judgment (zero `web/` changes). Live probes were credential-free
re-probes only (python3 `urllib` + browser `User-Agent`; Cloudflare 403s the default UA) —
no accounts created, nothing POSTed to prod beyond the read-only login discriminator.

## Review against the intent's four confirmed points + "beyond intent"

1. **Always-HTML gist-style explainer, both modes, markdown house style fully replaced (S1)** —
   **met.** Inspected the canonical `plugin/skills/explain/SKILL.md` directly: line 17-18
   and §4 state "one output format everywhere… There is no markdown output any more" for
   both topic and code-change modes; §4 replaced the §4 markdown house style with the HTML
   spec (Background → Intuition → Code → Best practices → Quiz; 5-MCQ quiz; HTML/CSS-or-SVG
   diagrams; `pre-wrap`; skeleton contract). The `sample-explainer.html` fixture is
   grep-proven self-contained.
2. **Best-practices section default-on + judgment gate + mandatory visible-domain citations
   + graceful offline skip (S1)** — **met.** §3 "default-on" with the judgment gate (§3.2)
   and forced `research`/`no-research`; §4.3 "Every claim carries a source link… no
   citation, no claim" + the visible-domain-in-text convention (so provenance survives
   FTS/MCP extraction); §3.4 "Degrade gracefully — never hang, never loop, never fail the
   save" (required because bootstrap P8 runs this unattended at reviews).
3. **Public multi-user ingestion (S3 Connect mode + S5 live cutover, incl. MCP `vk_`)** —
   **met.** S3 folded Connect mode into `/knowledge:setup` (resolver proven remote-only on a
   scratch config this session); S5 executed the prod accounts-plane cutover and verified
   the hosted skill path end to end against a fresh throwaway tenant — including the MCP
   `vk_` `fetch_document` relaying `format:"html"` — closing the P13 "hosted E2E pending" and
   the P15 MCP residual. One-key-serves-all-repos is documented and asserted.
4. **All copies reconciled with a CI guard (S2)** — **met.** Project copy deleted; `.agents`
   portable body byte-identical to canonical; user-level copy operator-updated (verified
   identical this session); `skills_parity.py` wired into `plugin-ci.yml` as a second drift
   gate (green this session).
- **Beyond intent:** D9 delivered (S4 — `plugin_parity.py` green, was FAIL 36; scaffold
  boots dormant single-tenant, Docker-verified); the split-deploy deploy-hygiene fix (F1).

### Constraints — all held

- **No `/api/*` or MCP contract change anywhere.** Confirmed by `git diff` — P17 edited no
  repo `server/`, `mcp-server/`, or `web/` source; S1's `format:"html"` is an **additive
  USE** of the frozen P16 contract.
- **No design-cowork breach.** The explainer look is the operator-chosen gist reference
  applied by a generated-document template (operator-ratified); S1 invented no new product
  visual language.
- **Terse tests.** S2's `skills_parity.py` is 74 lines stdlib-only; S4's four test mirrors
  are byte-copies (no new suites); F1 is static-only. No fixture sprawl.
- **Docs versioned only here.** No non-review slice ran `doc-new-version`; each appended a
  Doc-impact line (consolidated below).

## Residuals (judged; none block)

- **In-browser quiz-render eyeball** — operator visual-acceptance residual (P16 accepted the
  same class). The raw-HTML relay + all four sandbox headers are proven live; only a real
  browser can eyeball the rendered quiz. Natural moment: the operator's post-phase dogfood
  (install from the public marketplace, connect, `/explain`, view) — which also completes
  S2's flagged steady-state (drop the redundant user-level copy). Recorded in **qa**/**experience**.
- **F1 armed-but-not-live-proven** — `deploy.sh` self-upgrades from the box clone, so the
  fix arms from the **second** post-F1 dispatch; the optional two-dispatch proof stays open,
  proven on the next organic deploy. Recorded in **operations**.
- **Two throwaway prod tenants + doc 13** (emails in `P17.S5/result.md`; no delete API) —
  namespaced, isolated from tenant #1; operator may purge. Recorded in **qa**.
- **`alembic/` deliberately unshipped** from the scaffold template (S4 limitation — multi-tenant
  self-hosting migrations stay undocumented for open-core). Recorded in **architecture**.
- **D13** (`source_url`) and the F1 P16-discriminating smoke probe are noted-not-built (both
  out of P17 scope), carried forward as they were.

## Docs consolidated (source `P17.REVIEW`)

Six new versions from the ten `### Doc impact` done-lines. The S1 "api usage" line records
**no** contract change, so — per plan latitude — it was **folded into decisions/architecture
(additive-use of the frozen P16 contract)** rather than versioning **api**; `api` genuinely
did not change (no `server/` edit), so a new api version would assert a change that did not
happen. Every affected durable area got exactly one version capturing the whole phase:

- **product** → `v0008_p17_…connect_mode_one_vk__serving_every_repo` — explain v2 output +
  public multi-user Connect-mode ingestion, one key all repos.
- **experience** → `v0008_p17_…connect_hosted_vs_scaffold_self-host_modes` — the `/explain`
  authoring UX (both modes, cited best-practices) + `/knowledge:setup` Connect vs Scaffold.
- **decisions** → `v0016_p17_…parity_mirror-not-narrow_plugin_0.3.0` — three D-P17 ADRs
  (always-HTML + gated cited offline web research; copy topology + `skills_parity`; parity
  mirror-not-narrow) + the markdown-house-style superseded note + additive-use of the P16
  contract.
- **operations** → `v0018_p17_…skills_parity_second_ci_gate` — accounts-plane cutover marked
  executed/verified live, P16 shipped same push, the F1 split-deploy fix + arming note, the
  second plugin-CI drift gate, connect-mode operational, scaffold's unused postgres.
- **qa** → `v0008_p17_…quiz-render_eyeball_is_the_one_operator_residual` — the hosted
  skill-path E2E (credential-free re-probes + throwaway-account tiers) + the quiz-eyeball
  residual; closes the P13/P15 hosted-E2E gaps.
- **architecture** → `v0014_p17_…skills_parity_guards_the_shipped_explain-skill_copies` —
  the open-core template mirroring the SaaS server (dormant-safe render token), the second
  drift gate, `openai.yaml` no-tools-field, and the no-contract-change note.

`rebuild-docs` regenerated `docs/current/*` from these; `docs` + `validate` confirm the
index is consistent (the operations version was recreated once with a shorter summary
because the first slug + the editor's temp-suffix exceeded the 255-byte filename limit — no
functional difference). Never hand-edited `docs/current/*`; never touched an old version.

## Deviations from plan

- **api not versioned** — as the plan explicitly allowed: the S1 "api usage" line is a
  no-contract-change additive use, folded into decisions + architecture. Rationale above.
- Operations version recreated once (long-slug filename limit) — bookkeeping only, no content
  impact.

No other deviations.
