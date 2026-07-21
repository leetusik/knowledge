# Plan — P16.DECOMP (decompose phase)

Operator-approved at the do-whole-phase gate, 2026-07-21. Executor: `slice-executor-high`.

## Context

P16 makes standalone self-contained interactive HTML explainers (gist-style: inline CSS+JS, Background/Intuition/Code/Quiz sections, interactive quiz) a first-class KB document type end-to-end: API ingest, safe web rendering **with quiz JS working**, search indexing of extracted text, sane MCP read path — alongside existing markdown docs, which must be unaffected. Read `phase.md` and `intent.md` (phase root) first. The core design problem (from intent): **preserve the "XSS-safe by construction" stance while letting explainer JS run**. Cross-repo context: bootstrap P7 shipped; knowledge P17 (skill upgrade + public ingestion) comes after P16, so this pipeline is the rendering path for all future explainers.

## Verified starting points (orchestrator recon, 2026-07-21 — re-verify in repo, don't trust blindly)

- **Ingest**: `POST /api/documents` (`server/main.py::create_document`, `DocumentIn`) takes a `markdown` string; no format/content-type field anywhere. `.md` is hardcoded in ~6 places: `server/documents.py::rel_path` (`{project}/{date}-{slug}.md`), `validate_related`, `server/reindex.py::_FILENAME_RE`, `reindex_path` (`.endswith(".md")`), `_walk_root` (`rglob("*.md")`), `server/seed.py`.
- **Store**: content plane = disposable SQLite (`server/db.py::_SCHEMA`, `documents` table, body in `markdown` TEXT column; rebuilt from disk by reindex — schema changes cheap, no Alembic). Disk canonical: `docs/<project>/<date>-<slug>.md` (public tenant) / `tenants/<uuid>/...` (gitignored).
- **Search**: FTS5 external-content table over `(title, tags_text, markdown)` with auto-sync triggers; snippets, embeddings (`document_input(title, markdown)`), hybrid RRF all hang off the `markdown` column — putting **extracted text** there makes FTS/snippets/embeddings work unchanged.
- **Viewer**: `web/src/app/(app)/documents/[id]/page.tsx` → `markdown-body.tsx` = `react-markdown` + `remark-gfm`, deliberately **no `rehype-raw`** (raw HTML stripped — the safety stance). Fetch path: server component → `lib/knowledge/app.ts` → `client.ts::getJson` → `GET /app/documents/{id}`. `client.ts::getRaw` is an **unused byte-passthrough seam** — natural hook for a raw-HTML route.
- **Known trap**: `web/next.config.ts::headers()` sets global `X-Frame-Options: DENY` — blocks even same-origin iframes; a raw-HTML route must override/exempt (e.g. CSP `frame-ancestors 'self'` + route-level headers). No CSP exists yet.
- **MCP**: `mcp-server/` proxies `/api/*`; `fetch_document` returns `markdown` (+`truncated`/`total_chars`); `CONTRACT.md` v1 is **additive-only** — new optional output fields stay v1; repurposing `markdown`'s meaning is a breaking bump; extracted text is the closest-to-intent fill.
- **Adjacent surface**: mkdocs Track-1 site copies non-`.md` files through as static assets — a public-tenant `.html` doc would be served raw there; graph hooks parse `.md` only. Must not break; behavior choice is yours to pin.
- Tests: backend `tests/`, MCP `mcp-server/tests/`, web `web/tests/` (vitest). Keep suites terse per contract.

## Your job (decomposition only — no implementation code)

1. **Re-verify the recon**, then **decide and record in `phase.md`** the phase's pinned design decisions:
   - **Rendering approach** for interactive-but-safe HTML — decide concretely. Candidates: (a) sandboxed iframe via dedicated raw route (`sandbox="allow-scripts"` **without** `allow-same-origin` → opaque origin; route serves `text/html` with `Content-Security-Policy: sandbox allow-scripts` so top-level visits are also privilege-stripped; BFF relays bytes via the unused `getRaw` seam) — likely strongest; (b) `srcdoc` iframe (no new route; sizing/escaping tradeoffs). Sanitize-and-inline is ruled out (kills quiz JS). State why the choice preserves the XSS-safety stance (opaque origin: no cookies/storage/parent DOM), how iframe height/UX is handled, and the X-Frame-Options exemption.
   - **Ingest shape**: additive-only change to the frozen `POST /api/documents` contract (e.g. optional `format: "md"|"html"` or optional `html` body field, mutually exclusive with `markdown`); `.html` rel_path convention; which of the hardcoded `.md` points widen and how.
   - **Storage/indexing shape**: raw HTML canonical on disk; server-side **text extraction** (stdlib `html.parser`-based; no heavy deps) feeding the DB `markdown` column so FTS/snippets/embeddings work unchanged; a `format` (or equivalent) column in the disposable SQLite schema; reindex handles `.html` incl. incremental `reindex_path`.
   - **Read paths**: `/app` read routes expose format + raw-HTML access for the viewer; MCP `fetch_document` stays contract-v1 (extracted text in `markdown`, additive optional field(s) like `format`; record the exact shape).
   - **Adjacent-surface stance**: mkdocs site / graph hooks with `.html` files present (required: nothing breaks; pick and record the behavior), `validate_related`'s `.md` requirement, project landings, delete path.
2. **Create the middle slices** with `python3 scripts/workflow.py new-slice --phase P16 --slice P16.S<n> --name "..." --kind implementation --risk <r> --order <n>` — bare folders only; never pre-fill their `plan.md`. Set `--order` and `--risk` deliberately (risk = executor tier = cost lever; `low` only for fully mechanical work — expect none here). Anticipated shape (final cut is yours): backend ingest+extraction+index slice; web render slice (raw route + sandboxed iframe + format switch in the document page); MCP read-path slice; each slice carries its own terse tests. End-to-end behavioral validation belongs to `P16.REVIEW` — do not add a verification slice.
3. **Seed `phase.md`**: the breakdown + rationale under `## Decomposition`, pinned design decisions and findings under `## Findings & Notes`, and record under `## Constraints`: existing markdown docs' behavior byte-for-byte unaffected; frozen `/api/*` and MCP contract v1 additive-only; content-plane SQLite schema may change freely (disposable), Postgres control plane untouched; no new services/deploy topology; keep test files small; web-slice chrome reuses the existing KB design system (no new visual design — if a slice turns out to need genuine visual decisions, it goes through the design-cowork gate instead of improvising).
4. Write your `result.md` (free-form) in this slice folder.

## Boundaries

- You may run `new-slice` (this is a decomposition slice). Do not commit, do not transition slice/phase status, do not run `doc-new-version`, do not write implementation code, do not touch other slices' `plan.md`.
