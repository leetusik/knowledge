# Result — P8.S4: secrets provisioning runbook + frozen consumer contract

Executor: `slice-executor-mid`. Two authoring-only deliverables; no server code,
no `docs/` edits, no secret values anywhere, no `pending`.

## What I did

### A. `deploy/SECRETS.md` (new) + `deploy/README.md` pointer wiring

Created the operator secrets/DNS provisioning runbook and wired README to it.

- **`deploy/SECRETS.md`** — the "generate + register" half of provisioning, split
  from README's "place + bring up" half to avoid duplicated steps:
  1. `KB_API_TOKEN` — `openssl rand -hex 32`; goes into the box `.env`
     (`/opt/knowledge/.env`); the same value is hi2vi's `KNOWLEDGE_API_TOKEN`
     (single shared cross-repo secret).
  2. SSH deploy key — `ssh-keygen -t ed25519 -N '' -C knowledge-api@oci`; register
     the **public** half on `leetusik/knowledge` → Settings → Deploy keys **with
     write access**; private half → `/opt/knowledge-secrets/knowledge_deploy_key`
     (chmod 600 — the exact `compose.prod.yml` mount path); origin must be the SSH
     URL `git@github.com:leetusik/knowledge.git`. known_hosts pinning + placement
     mechanics are referenced to README §1b (not duplicated), with a note to delete
     the local key copies after placement.
  3. Cloudflare — add the **proxied** `knowledge` record on the `hi2vi.com` zone;
     plus a **cert-coverage check** (openssl SAN read on the edge cert) that
     branches: wildcard `*.hi2vi.com` → reuse hi2vi's cert; per-host → issue a
     dedicated `knowledge.hi2vi.com` origin cert and follow the vhost's PER-HOST
     variant comment.
  4. Optional `GOOGLE_API_KEY` — recommended; BM25-only fallback with zero code
     change if skipped.
  5. A **handoff checklist** ("all boxes ticked = ready for bring-up per README
     §1").
  - Placement paths are the exact ones `compose.prod.yml` mounts. **No secret
    values anywhere.**
- **`deploy/README.md`** — replaced the four bare `P8.S4` slice-id references with
  explicit `[SECRETS.md](SECRETS.md)` links (intro pointer, prerequisites, the
  `.env` token comment, the Cloudflare step). No steps duplicated between the two;
  the intro now states SECRETS.md is done first (produce/register), README second
  (place/bring up).

### B. `works/phases/active/P8/contract.md` (new) — frozen consumer contract

The verbatim-ready draft for P8.REVIEW to consolidate into `docs/current/api.md`
as a `## Hosted deployment + frozen contract` section. **I did not touch
`docs/`** — versioning happens only at the review.

- Config, `POST /api/documents` request + all four responses (201/409/422/401),
  read/search endpoints, and operational semantics (publish flow, retry/
  idempotency, single-daily-writer, hybrid/BM25 fallback), plus a freeze header
  (additive-only after P8).
- Shapes are **TestClient-verified against `server/main.py`**, not guessed (see
  Validation).
- Linked from `phase.md` Doc impact, marked "consolidate verbatim into api.md at
  review".

### Cross-slice notes

Appended a `### P8.S4 …` findings section and a `Realized by P8.S4` Doc-impact
block (api.md / operations.md / security.md) to `phase.md`, and linked
`contract.md`.

## Validation

Shapes were verified by exercising every endpoint through the pytest `TestClient`
over a temp KB tree (scratch probe under the session scratchpad; the repo tree was
never touched — confirmed via `git status`). Verified ground truth:

- **201** key order: `id, rel_path, url, title, project, slug, date, tags, related,
  recent_updated, landing_created, committed, commit_sha, pushed` (+ optional
  `commit_error` / `push_error`). `pushed` is present even when push is disabled.
- **409** = `{"detail": {message, rel_path, id?, existing_title?}}` — `id` /
  `existing_title` only when a DB row exists (bare on-disk collision omits them).
- **422** = `{"detail": "<reason>"}` (e.g. `"tags must have 2-5 items, got 1"`).
- **401** = `{"detail": "missing or invalid bearer token"}` (write and, with
  `KB_REQUIRE_READ_AUTH=true`, read).
- Search item keys + `signals={bm25?, recency, vector?}`; list item drops
  `markdown`; get-by-id/by-path adds it; tags/projects/healthz shapes confirmed.
- Cross-checked against `server/main.py` `create_document`/`_delete_document`
  response dicts and the `DocumentIn` model, and against `docs/current/api.md`.

Commands run:

| Command | Outcome |
|---|---|
| `.venv/bin/python -m pytest -q` | **65 passed** (unchanged — nothing behavioral) |
| `python3 scripts/plugin_parity.py` | **PASS** — 0 issues (touched no shipped paths) |
| `python3 scripts/workflow.py validate` | **Workflow validation passed** |

## Deviations from plan

None. Stayed within the plan's file scope (`deploy/SECRETS.md` new,
`deploy/README.md` pointer-only, `works/phases/active/P8/contract.md` new,
`phase.md` Findings + Doc impact, this `result.md`). No server/test/template
changes, no `docs/` edits, no secret values. The two S4 open questions
(push-credential form, Gemini-at-launch) are documented as settled operator
choices in SECRETS.md rather than left open — recorded in `phase.md` findings.
