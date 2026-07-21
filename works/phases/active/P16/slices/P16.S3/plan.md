# Plan — P16.S3: MCP read path — format-aware `fetch_document`

Operator-approved at the do-whole-phase gate, 2026-07-21. Executor: `slice-executor-mid` (`risk: medium`).

Read `phase.md` first (Pinned design decision 4 + the S1/S2 notes). This slice is bounded and near-mechanical: follow the edit sites exactly; if anything on the ground contradicts this plan, return `escalate` with findings rather than improvising.

## Context

S1 and S2 are done: the API serves HTML docs with an additive `format: "md"|"html"` on every doc read projection — **including `/api/documents/{id}` and `/api/documents/by-path/{rel_path}`, the MCP upstream** — and for HTML docs `markdown` = server-extracted readable text. Contract v1 (mcp-server/CONTRACT.md) is additive-only: a new output field does NOT bump the version. Your job: relay `format` through `fetch_document`.

## The one correction over in-repo comments

`server.py::_map_document`'s docstring (and the test `_DOC` payload) predate S1 and say upstream has no `format` key. **Upstream NOW sends `format`.** The mapper must **relay** it — `doc.get("format") or "md"` (default tolerates an older upstream) — NOT emit a hardcoded constant. Vocabulary is upstream's verbatim: `"md" | "html"`.

## Exact edit sites (all in `mcp-server/`; nothing else changes)

1. **`src/knowledge_mcp/server.py::_map_document`** (~L116-139) — add `"format": doc.get("format") or "md"` to the returned dict; update the docstring's upstream-shape list to include `format`.
2. **`server.py` `fetch_document` `@mcp.tool` `description=`** (~L298-320) — add `format` to the hardcoded `Returns {…}` list and one clause: `format` is `"md" | "html"`; for `"html"` (a standalone HTML explainer) `markdown` carries the server-extracted readable text.
3. **`CONTRACT.md`** — under `### fetch_document` → `**Output**` (fenced JSON block ~L122-135): add a `"format": "md"` line + one bullet: `"md" | "html"`; for html docs `markdown` = extracted readable text; consumers must tolerate the field being absent on older servers. **No `CONTRACT_VERSION` bump** (the `## Versioning & stability` additive rule covers a new output field). `config.py` untouched.
4. **`tests/test_search_tool.py`** — `_FETCH_KEYS` (~L158-161) gains `"format"`; `_DOC` payload gains `"format": "md"` with `assert out["format"] == "md"` in the existing fetch test; add ONE terse test covering: an html-doc payload (`format: "html"`, `markdown` = an extracted-text string) → `out["format"] == "html"` + `markdown` passthrough, and a payload with no `format` key → defaults `"md"`. Search hits (`_map_hit`) unchanged — upstream search results carry no format; out of scope.

Verified non-impacts (do not touch): `upstream.py` (returns raw JSON — format flows through), no pydantic/schema layer (bare `dict[str, Any]` return), `scripts/e2e_smoke.py` (subset checks tolerate new fields), no mcp CI job, no linter.

## Validation (run and report exact commands + output)

From `mcp-server/`: `uv run pytest` — suite green. Nothing else.

## On finish

Write `result.md` in this slice folder; append to `phase.md`: one cross-slice note (MCP relays `format` verbatim, default `"md"`; contract v1 unchanged, no version bump) + a Doc-impact line (**api**: MCP `fetch_document` output gains additive `format`; CONTRACT.md updated in-source). Never commit; never transition slice/phase status; no `doc-new-version`; no `new-slice`; touch nothing outside `mcp-server/` (plus the two workspace files above).
