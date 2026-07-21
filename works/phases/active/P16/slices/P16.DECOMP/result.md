# Result — P16.DECOMP (decompose phase)

Executed by `slice-executor-high`, 2026-07-21. Decomposition only — no implementation
code written; no state transitions; no commits; no `doc-new-version`.

## What I did

1. **Re-verified the orchestrator's recon in-repo.** Every starting point in `plan.md`
   holds. The confirmed line-level details are recorded under `phase.md` →
   _Findings & Notes → Recon re-verified_. Files read: `server/main.py`,
   `server/documents.py`, `server/reindex.py`, `server/db.py`, `server/seed.py`,
   `server/documents_api.py`, `server/embeddings.py` (signatures),
   `web/.../documents/[id]/page.tsx`, `markdown-body.tsx`, `web/src/lib/knowledge/{client,app,types}.ts`,
   `web/next.config.ts`, `mcp-server/CONTRACT.md`, `mcp-server/src/knowledge_mcp/{server,upstream}.py`,
   `mkdocs.yml`, `scripts/graph_hook.py`, and the `.md`-hardcode grep across `server/`+`scripts/`.
   No surprises; the recon was accurate.

2. **Pinned the phase's design decisions** in `phase.md` → _Findings & Notes → Pinned
   design decisions_ (5 pins): rendering approach (sandboxed opaque-origin iframe via a
   dedicated raw route, with the full XSS-safety argument, the CSP-sandbox top-level-visit
   defense, the X-Frame-Options exemption, and the iframe-height stance), ingest shape
   (additive `format` on `DocumentIn`, `.html` rel_path), storage/indexing shape
   (raw-HTML-on-disk with HTML-comment frontmatter + extracted-text in the `markdown`
   DB column + new `format`/`raw_html` columns + reindex/seed widening), read paths
   (additive `format` everywhere + the new `GET /app/documents/{id}/raw` route + MCP
   contract-v1 preservation reasoning), and the adjacent-surface stance (mkdocs/graph/
   validate_related/Recent/landing/delete — all "nothing breaks", with rationale).

3. **Created the three middle slices** (bare folders — only `slice.json`, no `plan.md`):
   - `P16.S1` — Backend: HTML ingest, storage, text extraction, indexing — `kind:
     implementation`, `risk: high`, `order: 1`.
   - `P16.S2` — Web: safe interactive HTML render (sandboxed iframe + raw relay) —
     `kind: implementation`, `risk: high`, `order: 2`, `depends_on: P16.S1`.
   - `P16.S3` — MCP read path: format-aware `fetch_document` — `kind: implementation`,
     `risk: medium`, `order: 3`, `depends_on: P16.S1`.

4. **Seeded `phase.md`**: `## Context`, `## Decomposition` (breakdown + rationale),
   `## Findings & Notes` (recon + pins + a `Doc impact` running list for the review to
   consolidate), `## Constraints`, and `## Open Questions`.

## Risk-tier rationale (the phase's main cost lever)

- **S1 high**: touches the frozen `/api/*` contract (additively), the disposable
  schema, `reindex` (drift-repair critical), `seed`, embeddings, and adds text
  extraction + a security-headered raw route — the most cross-cutting slice. Kept as
  one coherent slice (splitting write from reindex would create disk↔DB drift).
- **S2 high**: the XSS-safety-critical render — a slip in sandbox attrs / CSP /
  X-Frame exemption is a security hole, and the Next.js header wiring has real gotchas.
- **S3 medium**: a bounded additive MCP change (one output field + `CONTRACT.md` note +
  one test); the contract reasoning is already pinned, so `slice-executor-mid` fits —
  the deliberate cost saving in this phase. Not `low` (updating a consumer-pinned
  contract and the extracted-text semantics warrant judgment).

## Validation

- `python3 scripts/workflow.py new-slice … P16.S1/S2/S3` — all three created OK.
- `python3 scripts/workflow.py validate` — **passed** (after slice creation; the three
  new slices have no `plan.md` yet, which is correct for `todo` slices — each fills its
  own at its turn).
- Verified each new slice folder contains **only** `slice.json` (bare, no `plan.md`).
- `python3 scripts/workflow.py next` — confirms `next_slice=P16.S1`, ordering intact
  (S1=1 < S2=2 < S3=3 < REVIEW=9999).

## Doc impact

No durable-doc version created (correct — decomposition never versions docs; the review
consolidates). A `Doc impact` running list is seeded in `phase.md` naming the docs the
review is expected to consolidate (api, architecture/backend, frontend/experience,
security, possibly product) — each implementation slice appends its own precise line.

## Deviations from `plan.md`

None. Executed the plan as written (decomposition + pins + seeding + result).
