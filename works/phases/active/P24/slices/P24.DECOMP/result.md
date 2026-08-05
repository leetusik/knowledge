# Result — P24.DECOMP

## What I did

Researched the `POST /api/documents` write path end to end (server, git, embeddings,
nginx, both of our clients), **confirmed the operator's timeout hypothesis from code**
with one refinement, decided the fix shape, cut three middle slices as bare folders, and
seeded `phase.md` (Context / Decomposition / Findings / Constraints / Doc impact).

## Confirmed failure mode

The document is durably saved partway through the handler, and then the request spends
its remaining time on **unbounded network work before the 201 is written**:

- `server/main.py:669-749` (`WRITE_LOCK`): file write + `db.upsert_document`, which
  **commits** (`server/db.py:254`) → the save is durable here.
- `server/main.py:793-798` → `server/gitops.py:58-91`: `git fetch origin main` →
  `git rebase origin/main` → `git push origin HEAD:main`, **in-request, inside
  `WRITE_LOCK`**, and prod has `KB_GIT_PUSH: "true"` (`compose.prod.yml:52`).
  `gitops._run` calls `subprocess.run(...)` with **no `timeout=`** (`server/gitops.py:29-36`)
  — the stage is unbounded. Measured single read-only `git ls-remote origin main` RTT
  here: 0.49–0.66 s; fetch+rebase+push is several such round-trips.
- `server/main.py:803-819` → `server/embeddings.py:108-163`: a Gemini `embed_content`
  HTTPS call per write, no explicit timeout, still before the response.
- `server/main.py:86-109`: the `BaseHTTPMiddleware` metering hop (`await record_usage`)
  runs after the handler and before the body reaches the client.

Meanwhile `/explain` publishes with `curl -sS --max-time 5` (`plugin/skills/explain/SKILL.md:431,433`)
and treats any non-zero curl exit as "**the API is unreachable** → step 6" (line 435),
which either hand-writes a duplicate locally or reports failure for a document that is
in fact published. nginx allows 120 s (`deploy/knowledge.conf:184`) and uvicorn does not
cancel a sync threadpool handler, so the server finishes the write regardless. That is
exactly "upload successful, but no finish return".

Refinement to the hypothesis: the culprit is not the *commit* (local, fast) but the
**network** stages after it — git fetch/rebase/push above all.

## Slices created (bare folders, no `plan.md` pre-filled)

| ID | Name | Kind | Risk | Order | Depends on |
|---|---|---|---|---|---|
| `P24.S1` | Fast, bounded write response: git push + embed off the response path | implementation | high | 1 | — |
| `P24.S2` | Explain skill: honest publish timeout + verify before retry (3 copies) | implementation | high | 2 | `P24.S1` |
| `P24.S3` | CLI: honest write-timeout reporting on `knowledge save` | implementation | high | 3 | `P24.S1` |

All three are `high`: each writes real code (or load-bearing behavioral prose) across
more than one file, and S1/S2 carry byte-parity mirror gates. Rationale, the rejected
"instrumentation slice", and the per-slice validation list are in `phase.md`.

## Validation

| Command | Outcome |
|---|---|
| `python3 scripts/workflow.py validate` | PASS — "Workflow validation passed." |
| `python3 scripts/plugin_parity.py` | PASS (baseline, before any change) |
| `python3 scripts/skills_parity.py` | PASS (baseline, before any change) |
| `git ls-remote origin main` ×3, timed | 0.49 / 0.57 / 0.66 s — read-only RTT evidence for the push stage |

Both parity baselines were captured deliberately so S1/S2 know they start from green.

## Deviations from `plan.md`

- The plan said the `/explain` skill has **four** copies; there are **three**
  (`plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`,
  `web/public/SKILL.md`), per `scripts/skills_parity.py`. Recorded in `phase.md`.
- The plan suggested 2–3 middle slices and floated a possible verification/instrumentation
  slice; I cut 3 and folded any instrumentation into S1 (a second slice touching
  `server/main.py` would duplicate the mirror-parity churn for no gain).

## Doc impact

None from this slice (no durable truth changed). The expected doc impact **of the phase**
is recorded as a "Doc impact expectations" list in `phase.md` for `P24.REVIEW` to
consolidate: `api.md`, `backend.md`/`architecture.md`, `operations.md`, and the
client-behavior doc.
