# Result — P17.DECOMP

Decomposed **P17 — "Explain skill v2: interactive HTML + public multi-user ingestion"**
into five middle slices + `REVIEW`. Recon in `plan.md` was spot-checked this session and
confirmed (see *Recon spot-check* below); the breakdown, rationale, findings, constraints,
open questions, and the *Doc impact* running list are seeded into
`works/phases/active/P17/phase.md`.

## What I created (bare folders, no `plan.md` pre-filled)

| Slice | Order | Risk | Deps written | Job |
|---|---|---|---|---|
| `P17.S1` | 1 | high | — | Explain skill v2 rewrite (canonical `plugin/skills/explain/SKILL.md`) |
| `P17.S2` | 2 | medium | `P17.S1` | Reconcile the OLD skill copies from the canonical copy |
| `P17.S3` | 3 | high | — | Public-host onboarding surface for plugin users |
| `P17.S5` | 5 | high | `P17.S1`, `P17.S3` | Prod accounts-plane cutover + hosted end-to-end skill-path verification |

Each folder holds only `slice.json` (verified — no `plan.md`). Full breakdown +
rationale is in `phase.md` → `## Decomposition`.

**Order 4 is deliberately left open for the D9 parity slice** (below).

## D9 parity slice — the orchestrator must create it via `promote-deferred` (I did NOT)

Per the plan I did not `new-slice` the parity slice; it is the remediation D9 was
deferred for. Create it with the exact parameters:

```
python3 scripts/workflow.py promote-deferred D9 \
  --phase P17 \
  --slice P17.S4 \
  --name "Plugin-template parity remediation: mirror the SaaS server into plugin/templates/kb (D9)" \
  --kind implementation \
  --risk medium \
  --order 4
```

- **id/order:** `P17.S4`, order `4` — sits between S3 (3) and the S5 cutover (5), so the
  parity fix is committed before S5's operator push.
- **risk:** `medium` recommended but **borderline — bump to `high`** at the plan gate if
  the manifest classification or dormant-boot verification looks non-trivial. Rationale
  in `phase.md`: the setup skill *renders* this template, so a broken mirror silently
  breaks `/knowledge:setup` for every self-host user; and the job is more than a byte-copy
  (it must render + import cleanly and boot single-tenant without `DATABASE_URL`, which
  means `pyproject.toml`/`uv.lock` must carry the accounts-plane deps). Left at medium so
  the orchestrator can still bump up (it may only bump up, never down).
- **deps:** none required; `order 4` enforces the sequencing. Optionally add `P17.S4` to
  `P17.S5`'s `depends_on` after promotion (I could not, because `validate`
  existence-checks `depends_on` and S4 did not exist at DECOMP time).

## Why this shape

- **S1 first, deploy-independent, high tier.** The always-HTML rewrite + the cited
  web-research section is the phase's core and its highest-judgment authored artifact.
  Nothing about it needs the deploy done — an emitted explainer renders the moment it
  ships (P16 already renders `format:"html"` docs), so it leads.
- **S2 medium, depends on S1.** Reconciliation is a *structural derivation* of S1's v2
  body into two copies with different frontmatter shapes plus one bounded decision
  (the `~/.claude` dupe) — mid-tier work, with the operator-machine touch and the
  optional sync-automation call flagged as escalation hooks.
- **S3 high, independent.** The plugin onboarding shape (setup-skill public-host mode vs
  new skill vs defer-to-CLI) is a genuine product-design decision + implementation; the
  CLI is the reference. Its full E2E can only run after the cutover, so it folds into
  S5/REVIEW.
- **S4 (D9) parity before the push.** Operator-ratified: mirror the SaaS server into the
  template, not narrow `shipped_dirs`. Order 4 keeps it ahead of S5's push.
- **S5 last, high tier, operator gates.** Live prod cutover + hosted `vk_`-path E2E; the
  push carries every prior slice's commits. Each operator-run action (push, box secrets,
  `Production Deploy` dispatch, migrate/seed one-shot) is planned as an explicit `pending`
  gate, and its first step is verifying the live box state (the docs are inconsistent
  about the 2026-07-17 partial attempt).

## Decisions made at decomposition (so slices inherit, not re-litigate)

- **postMessage iframe-height handshake (deferred from P16): PARKED — not built this
  phase.** P16 already ships a working fixed-height sandboxed iframe with internal scroll;
  the parent-side listener would drag the `web/` subsystem into this phase for pure
  reading-comfort polish outside the confirmed intent, and a template-only height signal
  with no parent listener is dead code. Flagged in `phase.md` Open Questions as a
  candidate future deferred if the operator wants it.
- **Reconciliation and onboarding are two slices, not one** (the plan allowed 1–2): they
  have different risk profiles (medium mechanical derivation vs high product decision) and
  splitting lets the cheaper work run at the lower tier — the cost lever.
- **The `"no external deps"` gist rule is recorded as a hard constraint**, not a
  preference: the P16 iframe is opaque-origin `sandbox="allow-scripts"`, so any external
  fetch/CDN renders broken. S1 must keep the explainer fully self-contained.

## Recon spot-check (this session, before deciding)

- `python3 scripts/plugin_parity.py` → **FAIL, 36 issues** (matches the plan's 36;
  D9's own record says 34 as of 2026-07-17 — the delta is P13/P16 growth). The 36 break
  down as 8 byte-drift `identical` + 1 `parameterized` (`compose.yml`) + 27 completeness.
- `python3 scripts/workflow.py validate` → **passed**; `next` → current `P17.DECOMP`,
  next `P17.REVIEW` (no middle slices existed — confirming DECOMP creates them).
- `git log origin/main -1` → `284fc03` (P15.F1); local main **8 commits ahead** (all P16,
  unpushed) — matches the plan's D9-trigger-already-fired claim.
- `diff -q .claude/skills/explain/SKILL.md ~/.claude/skills/explain/SKILL.md` → **silent**
  (byte-identical duplicate registration confirmed). Line counts 291 / 188 / 186 for
  plugin / `.claude` / `.agents` copies as stated; `.agents/skills/explain/agents/openai.yaml`
  present.
- Read `cli/src/knowledge_cli/auth.py` + `config.py` — the `init` flow (signup/login →
  project → mint `vk_` → `config.save` writing `api.token`) and `DEFAULT_BASE_URL =
  "https://knowledge.hi2vi.com"` confirmed; it writes the same config file the explain
  resolver reads.
- Read `docs/current/api.md` L114–207 (P16 contract additions) and `operations.md`
  L410–428 (cutover runbook incl. the boot-deadlock one-shot order) — both match the
  recon verbatim. `plugin/.claude-plugin/plugin.json` is v0.2.1; noted the `setup/SKILL.md`
  `0.2.1`-vs-`0.1.0` inconsistency to clean up on the version bump.

## Validation

- `python3 scripts/workflow.py validate` → **passed** (after creating S1/S2/S3/S5; no
  `depends_on` breakage — S5 deliberately omits the not-yet-created S4).
- Slice folders verified bare (`slice.json` only).

## Deviations from `plan.md`

None. Followed the suggested 4–5-slice shape (landed on 5, one of which is the promoted
D9 parity slice), left order 4 open for the orchestrator's `promote-deferred`, created no
`plan.md`, versioned no docs, and transitioned no status.

## For the orchestrator

1. Create the D9 parity slice with the `promote-deferred` command above (order 4).
2. Consider bumping S4 to `high` at its plan gate (rationale above).
3. S1/S2/S3 own live design decisions (section placement + force-arg; `~/.claude` dupe;
   onboarding shape) — flagged in `phase.md` Open Questions with their owning slice.
4. Two operator-machine / operator-action gates to expect: the `~/.claude` dupe touch
   (S2) and the whole S5 cutover chain (push, secrets, deploy dispatch, migrate/seed).
