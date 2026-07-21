# P14.DECOMP — Result

Decomposed **P14: Landing Page & Product Webpage via Claude Design Gate** into three middle slices
and seeded `phase.md`. No code, no docs, no other slice's `plan.md` touched.

## Slices created (bare folders — `slice.json` only, no `plan.md`)

| Slice | Kind | Risk | Order | Depends on |
|-------|------|------|-------|-----------|
| P14.S1 — Design gate: landing + public marketing pages (Claude Design round 1) | co-work | high | 1 | — |
| P14.S2 — Implement the landing + marketing pages from the read-back spec | implementation | high | 2 | P14.S1 |
| P14.S3 — Ship the web app: standalone Dockerfile + knowledge-web compose service + edge vhost routing | implementation | high | 3 | — |

`P14.REVIEW` left untouched. Verified each new folder contains `slice.json` only.

Commands run (the only workflow-mutating commands this slice may run):

```
python3 scripts/workflow.py new-slice --phase P14 --slice P14.S1 \
  --name "Design gate: landing + public marketing pages (Claude Design round 1)" \
  --kind co-work --risk high --order 1
python3 scripts/workflow.py new-slice --phase P14 --slice P14.S2 \
  --name "Implement the landing + marketing pages from the read-back spec" \
  --kind implementation --risk high --order 2 --depends-on P14.S1
python3 scripts/workflow.py new-slice --phase P14 --slice P14.S3 \
  --name "Ship the web app: standalone Dockerfile + knowledge-web compose service + edge vhost routing" \
  --kind implementation --risk high --order 3
```

## phase.md seeded

Filled **Context**, **Decomposition** (three-slice table + rationale), **Findings & Notes**,
**Constraints**, **Open Questions**, and a running **Doc impact** list. Highlights:

- **S1** is `co-work`, **round 1 only**, **orchestrator-inline / never dispatched** (executors have
  no DesignSync). Writes only `handoff.md`, pushes the branch, holds a hard `pending` gate, reads
  cards back via DesignSync, lands AS-IS + SIGNOFF, and writes the approved-direction spec into
  `phase.md`. No code.
- **S2** implements from S1's `build-prompt.md` (reclaim `/`, `(marketing)` route group, section
  content + components, reuse staged marketing tokens + pill button); **expect the read-back to
  re-shape it** into fractional-order sub-slices (per-section + SEO file routes). Not over-planned
  here — the design dictates the breakdown.
- **S3** deploy: new `web/Dockerfile` (multi-stage `node:22-slim`, standalone), a `knowledge-web`
  compose service (`expose: 3000`, no host ports, `changple_shared_network`), and edge vhost
  routing that **preserves** the `/api /auth /app /healthz`→FastAPI contract and resolves the
  `/api/auth/*` collision. Likely ends in a `pending` operator edge-deploy gate (mirrors P13).

Design record / DesignSync work is described in `phase.md` for S1 to carry out — **not** performed
here.

## Validation

```
python3 scripts/workflow.py validate   # PASS — state integrity clean after slice creation
```

## Deviations from plan.md

None. All three slices created exactly as specified; `phase.md` sections filled per the plan;
`P14.REVIEW` untouched; no docs versioned, no status transitioned, no commit.
