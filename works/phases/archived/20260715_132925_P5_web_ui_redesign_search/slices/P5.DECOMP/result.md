# Result — P5.DECOMP (decompose phase P5: Web UI redesign & search)

Executor: `slice-executor-high`. Completed 2026-07-10. Read-only audit + slice creation + phase.md seeding. No implementation, no commits, no status transitions.

## What I did

1. **Audited the current GitHub Pages site surface (read-only)** — `mkdocs.yml`, `.github/workflows/pages.yml`, `compose.yml`, `docs/index.md`, `docs/tags.md`, `docs/README.md`, the content tree (6 explainer docs across 3 project dirs + 11 `docs/current/*` + landing/tags), the design-asset state (confirmed clean slate), and the search config (empirically confirmed from the on-disk lunr `search_index.json` config). Verified every orchestrator pre-gathered fact against the live tree — all confirmed. Full findings with file:line pointers are in `phase.md` → Findings & Notes.
2. **Proposed a 4-slice breakdown** (S1 design via D2 promotion, S2 landing/UX, S3 CJK search, S4 optional build-smoke guard) with per-slice rationale, deliberate risk levels, and ordering logic — in `phase.md` → Decomposition.
3. **Created 3 middle slices as bare folders** (only `slice.json`, no `plan.md`) via `new-slice`. Did NOT create the D2-absorbing design slice — left it for the orchestrator to promote (spec below).
4. **Seeded `phase.md`** with breakdown, findings, constraints, doc-impact guidance, and the D2 promotion spec.

## Slices I created (bare folders)

| ID | Name | Kind | Risk | Order | Depends |
|---|---|---|---|---|---|
| `P5.S2` | Landing page & UX structure — index.md redesign (preserve explain:recent), nav/browse, tags page | implementation | medium | 2 | — *(advisory dep on P5.S1, see below)* |
| `P5.S3` | CJK-capable client-side search — Korean/CJK-aware search on the static Pages site | implementation | high | 3 | — *(advisory dep on P5.S1)* |
| `P5.S4` | Site-build CI smoke guard & hygiene — mkdocs build parity check + invariant assertions | implementation | medium | 4 | P5.S3 |

Each folder contains only `slice.json` (verified). I did NOT pre-fill any `plan.md`.

## Design slice — orchestrator must create via D2 promotion (I did NOT)

```
python3 scripts/workflow.py promote-deferred D2 --phase P5 --slice P5.S1 \
  --name "Design system — Claude-designed palette/typography/branding via theme config + extra_css tokens, logo/favicon" \
  --kind implementation --risk high --order 1
```

Run after DECOMP completes and before executing any middle slice (P5.S1 is order 1). Risk **high** → `slice-executor-high` (opus). This absorbs deferred D2 so the brief attaches, mirroring the P4/D1 pattern.

## Key decisions

- **Risk as the cost lever:** S1 design = **high** (design judgment + first frontend/experience truth + foundational). S3 CJK search = **high** (genuine research/design — lunr has no Korean pack, client-side-only constraint, approach is an open tradeoff). S2 landing = **medium** (bounded UX on S1's tokens, but the load-bearing `explain:recent` marker/bullet contract is a real correctness constraint). S4 = **medium** (edits deploy-critical CI + picks meaningful invariants — light judgment, not a fully-mechanical `low` haiku plan). No slice is `low`: none of this work is purely mechanical.
- **S4 is optional/droppable:** engineering hygiene (a site-build smoke guard for the first client-side assets), not part of the operator's "design + search" intent. Marked droppable so the orchestrator can cut it or fold the smoke check into each slice's validation.
- **`depends_on` on S2/S3 is encoded via `order`, NOT `--depends-on`:** P5.S1 doesn't exist yet at DECOMP time (orchestrator promotes it afterward), so a `--depends-on P5.S1` would be a dangling ref and fail `validate`. S4→S3 is a real, existence-valid dependency. The orchestrator may add `--depends-on P5.S1` to S2/S3 later once S1 exists.
- **Search design decision delegated to S3, visual language delegated to S1** — DECOMP did not prototype (plan: no heavy prototypes). The cheap empirical probe was inspecting the existing lunr index *config* (confirms `lang:["en"]`, `separator:"[\\s\\-]+"`, no CJK), not a fresh build.

## Validation

| Command | Outcome |
|---|---|
| `python3 scripts/workflow.py validate` (baseline, before creating slices) | passed |
| `python3 scripts/workflow.py new-slice` ×3 (P5.S2/S3/S4) | created (bare folders — only `slice.json`, verified) |
| `python3 scripts/workflow.py validate` (after creating slices) | **passed** |

## Doc impact

None from this DECOMP slice itself (it created no durable-truth changes). Doc-impact **guidance** for the middle slices (likely targets: `frontend.md`, `experience.md`, `decisions.md`, `operations.md`, maybe `product.md`/`architecture.md`/`qa.md`) is seeded in `phase.md` → Doc impact for slices to append to and P5.REVIEW to consolidate. Note: `frontend.md` and `experience.md` are still bootstrap v0001 placeholders — P5 produces the first real truth there.

## What the orchestrator must do next

1. Run the `promote-deferred D2 ...` command above to create the P5.S1 design slice (order 1).
2. Then proceed with `do-next-slice`/`do-whole-phase` starting at P5.S1.

## Deviations from plan.md

None. Followed the plan exactly: audited read-only (touched nothing outside `works/phases/active/P5/`), created only the 3 non-design middle slices as bare folders, left the design slice for D2 promotion, seeded `phase.md`, ran only `new-slice` + `validate` (no other workflow commands, no commits, no status transitions).
