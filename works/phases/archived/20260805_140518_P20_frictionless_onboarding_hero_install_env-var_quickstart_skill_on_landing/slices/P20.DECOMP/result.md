# P20.DECOMP — result

Decomposed P20 "Frictionless onboarding" into five middle slices + REVIEW, built around the
four fixed operator-approved decisions (curl installer, depict-the-prompt password honesty,
D16-folds-into-S1, D10-rides-the-design-round). Full breakdown, risk rationale, verified findings,
constraints, and the "Doc impact" seed are in [`phase.md`](../../phase.md).

## What I created

Three bare middle-slice folders (via `new-slice` — `slice.json` only, **no pre-filled `plan.md`**),
leaving **order 1 free** for S1:

| Slice | kind | risk | order | depends_on | Name |
|---|---|---|---|---|---|
| `P20.S2` | `co-work` | `high` | 2 | — | Design round 02: env-var quickstart + skill-on-landing sections (handoff) |
| `P20.S3` | `implementation` | `high` | 3 | `P20.S2` | Implement designed sections: env-var quickstart + parity-gated skill on landing |
| `P20.S4` | `implementation` | `high` | 4 | `P20.S3` | Ship + live verify: push main, prod deploy, installer/hero/skill/init smoke |

**S1 was deliberately NOT created** (per the plan's S1-exception): its scope folds in deferred **D16**,
and `promote-deferred` transitions deferred state (orchestrator's job). Its full spec is recorded in
`phase.md` (id `P20.S1`, kind `implementation`, risk `high`, **order 1 reserved**). The orchestrator
creates it next via:

```
promote-deferred D16 --phase P20 --slice P20.S1 --name "installer + hero honesty + CLI onboarding fixes" --kind implementation --risk high --order 1
```

I did **not** run `promote-deferred` or `defer-job`.

## Risk rationale (the cost lever)

No slice is `low`/`medium` — this phase has no fully mechanical work:
- **S1 high** — bundles authoring a live-served `curl | bash` installer, a security-adjacent
  credential reuse-gate change (D16), and honest hero copy tracking real `init` output.
- **S2 high, co-work, never dispatched** — new landing sections are product visual design → the
  design-cowork gate; DesignSync is main-thread-only, so the orchestrator runs it inline.
- **S3 high** — design-fidelity implementation + the skill-parity plumbing (landing copy must
  derive from `scripts/skills_parity.py`, never fork).
- **S4 high** — prod access + operator-gated push/deploy + live smoke.

## Validation

- `python3 scripts/workflow.py validate` → **passed** ("Workflow validation passed.").
- `python3 scripts/workflow.py rebuild` → dashboards regenerated; backlog shows S2/S3/S4 as `[ ] todo`
  under P20, `REVIEW` unchanged, "Next slice: `P20.S2`" (correct — order 1 is free until the
  orchestrator creates S1).

## Findings recorded (spot-checked live this session)

Verified and recorded in `phase.md`: the broken hero line + `terminals.ts` structure; `web/public/`
is served live at `/install.sh` with zero infra (standalone image `COPY public`, `.dockerignore`
doesn't exclude it, nginx `/` catch-all — edge is nginx on OCI, **not** Cloudflare); the working
`git+…#subdirectory=cli` install form installs GitHub-main (→ S1 CLI changes need the S4 push);
`cmd_init`'s real output + the D16 reuse-gate bug at `auth.py:496-498`; the org-level mint
(`credential_create_org` → `POST /app/credentials`, `project_id NULL`); the explain skill
(`plugin/skills/explain/SKILL.md`, 486 lines, parity-guarded); the env-var path + its blockers; and
round-01 design provenance / reusable primitives.

## Deferrals recorded for the orchestrator to file

- **Windows `install.ps1`** — the curl installer is POSIX-only; a PowerShell equivalent is deferred.
  Suggested `defer-job` line is in `phase.md` → "Deferrals to file". I did **not** run `defer-job`.

## Doc impact

DECOMP changes no durable truth, so nothing to consolidate. I seeded a **"Doc impact"** section in
`phase.md` with the *expected* durable-doc areas (`decisions.md`, `frontend.md`/landing doc,
`cli.md`/onboarding) so each implementing slice appends the concrete docs it touches and REVIEW
consolidates them once.

## Deviations from plan.md

None. Followed the suggested shape; S2/S3/S4 match the plan's suggested slices, S1 kept as spec-only
with order 1 reserved, D16/D10 linkage recorded per the plan, Windows `install.ps1` recorded as a
deferral to file. The only refinement is documenting S4's logical dependency on S1 in prose (S1 is
not listed in S4's `depends_on` because S1 does not exist at DECOMP `validate` time — `validate`
checks `depends_on` for existence, and ordering already sequences S1 before S4).
