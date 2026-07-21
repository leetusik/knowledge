# Result — P16.REVIEW: phase review

Executor: `slice-executor-high` (review slice). Date: 2026-07-21.
**Verdict: `pass`.** The phase meets its objective end-to-end; all suites are green;
the additive-contract, markdown byte-identity, and sandbox-pin constraints held exactly;
the known residuals are judged non-blocking. Durable docs consolidated into new versions.

## 1. Re-validation — all slices together (fresh runs)

| Suite | Command (cwd) | Outcome |
|---|---|---|
| Backend | `uv run pytest tests -q` (repo root) | **70 passed, 13 skipped, 1 warning** ✓ (matches S1's baseline; the 13 skips are Postgres-gated, the 1 warning is the pre-existing Starlette/httpx deprecation) |
| Web tests | `pnpm test` (`web/`) | **8 files, 58 tests passed** ✓ |
| Web lint | `pnpm lint` (`web/`) | **clean** ✓ |
| Web build | `pnpm build` (`web/`) | **compiled successfully, TypeScript no errors** ✓; the new route registers as `ƒ /api/documents/[id]/raw` |
| MCP | `uv run pytest` (`mcp-server/`) | **12 passed, 1 warning** ✓ |
| State | `python3 scripts/workflow.py validate` | **passed** ✓ (run again after doc consolidation — still passed) |

## 2. End-to-end behavioral check (API-level round-trip)

A TestClient scratch script over a temp `KB_ROOT` (scratchpad, not committed) exercised
the full pipeline in one flow — **ALL PASS** after two self-corrections in the *script*
(not the code, see Deviations):

- POST an html explainer (quiz-style, `<script>`) via `/api/documents` → **201**, `.html`
  rel_path, `format:"html"` in the response.
- On disk: the file starts with the `<!--kb` comment-frontmatter, the raw `<!DOCTYPE html>`
  body follows the `-->`.
- `GET /api/documents/{id}` → carries `format:"html"`, **never** `raw_html`; `markdown` is
  the extracted visible text (title + background present; `<script>` `SECRET`/`exfiltrate`
  and `<style>` `color:red` absent). DB row per the body rule: `raw_html` keeps the script,
  `markdown` excludes it.
- `/api/search` matches an extracted-text term (`divide`) and returns the doc; a `<script>`-only
  term (`exfiltrate`) → `total:0`.
- Wipe `kb.sqlite3` + `reindex()` → both the html row (`format`+`markdown`+`raw_html`) and the
  markdown row reproduced **byte-for-byte**; search still works post-rebuild.
- A markdown doc alongside → `format:"md"`, `.md` rel_path, `---` YAML frontmatter on disk,
  `markdown` = the raw markdown (per the pre-existing `_normalize_body` normalization).

**Not executor-verifiable (recorded operator residual):** the live **in-browser**
confirmation that the quiz JS actually runs inside the sandboxed iframe, and that a direct
top-level visit to the raw URL is sandbox-stripped. No jsdom/browser tooling exists in the
repo; every machine-verifiable layer (unit tests, runtime header check, this API round-trip)
passed. Not faked.

## 3. Review against intent — constraints verified

- **Objective met end-to-end.** HTML explainers are a first-class KB doc type: the API
  accepts them (additive `format`), storage is raw-on-disk + extracted-text-in-DB, search
  indexes the extracted text, the web viewer renders them safely-interactively, and MCP relays
  `format`. Confirmed by the suites + the E2E above.
- **Contracts stayed additive-only (spot-checked git diff `69d00a8`).** `DocumentIn.format:
  Literal["md","html"] = "md"` — additive with a default (existing callers byte-identical).
  `_public_doc`/`_DROP`/`_INTERNAL` gained `format` exposure and `raw_html` suppression — no
  existing field changed. `GET /app/documents/{id}/raw` is an entirely **new** route. MCP
  `CONTRACT.md` stays **v1** (`CONTRACT_VERSION = "1"`, `/healthz` `contract_version:"1"`); the
  `format` field is additive. `markdown`'s contract meaning ("readable text body") is
  preserved, not repurposed — markdown docs are byte-identical.
- **Markdown byte-identity held.** The unchanged `test_api_write.py` byte-exact frontmatter
  guard is green; the reindex reproduced both rows byte-for-byte. The one E2E assertion that
  first "failed" was over-strict on my part: the write path's `_normalize_body` (a **P2-era**
  commit `207f2ff`, unchanged by P16 — verified) strips the trailing newline for md and html
  alike, so stored `markdown` = input minus the final `\n`. Corrected the assertion; not a
  regression.
- **Sandbox pin survived implementation exactly.** `page.tsx` uses `sandbox="allow-scripts"`
  only — **no `allow-same-origin`** anywhere in `web/src` (the two grep hits are documentation
  comments explicitly stating it is NEVER granted). The CSP `sandbox allow-scripts;
  frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN` are **byte-identical** across the
  three layers (S1 backend route `server/documents_api.py`, S2 BFF relay
  `web/src/app/api/documents/[id]/raw/route.ts`, and the `next.config.ts` `/api/documents/:id/raw`
  entry); the global `/:path*` stays `DENY`.

## 4. Known residuals — judged, not tripped

- **(a) `scripts/plugin_parity.py` red gate — pre-existing, out of scope.** 36 issues now
  (34 before P16); the +2 are `server/documents.py` newly byte-drifting and the new
  `tests/test_html_documents.py` unshipped. The gate was already failing from P10+ server
  growth never mirrored into `plugin/templates/`; per the S1 plan P16 did not touch
  `plugin/templates/`. Remediation belongs to **P17** (the plugin/skill phase). Not a P16
  defect — did not trip on it.
- **(b) Format-flip-same-slug coexistence** (an `.md` and `.html` for the same project/date-slug
  can coexist; delete is per-rel_path) — accepted quirk recorded in S1; consistent, not a bug.
- **(c) S1 landing-skip test relaxation** — pre-existing auto-landing (`explainers/index.md`)
  behavior, unrelated to html; correctly skipped by reindex.
- **(d) Live browser quiz check** — operator visual-acceptance residual (see §2).

## 5. Doc consolidation (on this passing verdict)

Eight durable docs versioned, source `P16.REVIEW`, current rebuilt via `rebuild-docs`
(never hand-edited; old versions never patched):

| Doc | New version | Captures |
|---|---|---|
| **api** | `v0012` | additive `format` on POST + read projections, new `GET /app/documents/{id}/raw`, MCP `fetch_document` `format`; frozen `/api/*` + contract v1 preserved |
| **backend** | `v0007` | HTML ingest/storage/extraction/indexing, the body rule (write↔reindex byte-identity), `format`/`raw_html` columns, reindex/seed widening, the raw route |
| **architecture** | `v0013` | HTML doc type end-to-end (raw-on-disk canonical + extracted-text-in-DB) and the opaque-origin sandboxed-iframe XSS-containment stance; no new services |
| **data** | `v0008` | `documents.format` + `raw_html` disposable columns (idempotent ALTER TABLE); DB `markdown` = extracted text so FTS unchanged; Postgres untouched |
| **frontend** | `v0007` | the sandboxed opaque-origin iframe render + same-origin BFF raw-relay route + X-Frame exemption; markdown docs byte-identical |
| **experience** | `v0007` | the documents journey — an HTML explainer renders as an interactive in-app document (quiz runs), safely sandboxed; markdown unchanged |
| **product** | `v0007` | HTML explainer documents as a first-class KB doc type end-to-end (item 4 of the operator request; pipeline lands before the P17 skill upgrade) |
| **security** | `v0010` | the XSS-containment stance: opaque-origin iframe, CSP/X-Frame exemption, `raw_html` never in JSON, extracted-text-only search; "XSS-safe by construction" preserved while quiz JS runs |

**Not versioned:** `operations` (no new services/env/migrations/deploy topology — the
content-plane columns are disposable ALTER TABLE, no Alembic; confirmed), `decisions`, `qa`.

## Deviations from `plan.md`

1. **Also versioned the `security` doc (plan-instructed deviation).** The plan asserted "there
   is NO security doc" and to fold the XSS-containment stance only into `architecture` + `frontend`.
   In fact a `security` doc **does exist** (`v0009`), and the `phase.md` Doc-impact list explicitly
   flags **security** twice (S1 partial + S2 completes). The plan's premise was a factual error.
   At full judgment (review slice, `slice-executor-high`) the faithful consolidation of the phase's
   durable truth is to version the security doc too — it is where the "XSS-safe by construction"
   posture durably lives (it already documents the P12 web app's no-`rehype-raw` markdown render as
   the baseline this phase extends). I did **also** fold the stance into architecture (the design
   rationale) and frontend (the render side) as the plan directed; the security version is
   additive to that, not instead of it.
2. **Two E2E scratch-script self-corrections (test-authoring, not code):** (i) a markdown payload
   with 1 tag hit the domain's 2–5-tag rule (422) — fixed the script to use 2 tags; (ii) an
   over-strict byte-identity assertion included the trailing `\n` that the pre-existing
   `_normalize_body` strips — corrected to the true normalized body. Neither reflects a phase defect.

No source code was edited (review slice). No commits, status transitions, or `new-slice`.
