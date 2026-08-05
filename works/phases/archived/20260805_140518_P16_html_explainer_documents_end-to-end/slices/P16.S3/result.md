# Result — P16.S3: MCP read path — format-aware `fetch_document`

Executor: `slice-executor-mid`. Status: **done**. Bounded, additive change; the plan
matched the ground exactly — no deviations, no escalation.

## What changed (all in `mcp-server/`)

1. **`src/knowledge_mcp/server.py::_map_document`** — added
   `"format": doc.get("format") or "md"` to the returned dict (relayed verbatim from
   the S1 upstream read; the `or "md"` default tolerates an older upstream that omits
   the field — NOT a hardcoded constant). Updated the docstring's upstream-shape list
   to include `format` and noted that for an `"html"` doc `markdown` = server-extracted
   readable text.
2. **`server.py` `fetch_document` `@mcp.tool(description=…)`** — added `format` to the
   `Returns {…}` list and one clause: `format` is `"md" | "html"`; for an `"html"` doc
   (a standalone HTML explainer) `markdown` carries the server-extracted readable text.
3. **`CONTRACT.md`** — under `### fetch_document` → `**Output**`: added a `"format":
   "md"` line to the fenced JSON block and a bullet documenting `"md" | "html"`, the
   extracted-text meaning for html docs, and the tolerate-absent-on-older-server rule.
   **No `CONTRACT_VERSION` bump** — a new output field is additive under the existing
   `## Versioning & stability` rule. `config.py` untouched.
4. **`tests/test_search_tool.py`** — `_FETCH_KEYS` gained `"format"`; the `_DOC`
   payload gained `"format": "md"` with `assert out["format"] == "md"` in the existing
   `test_fetch_by_id_maps_contract_and_forwards_bearer`; added ONE terse test
   `test_fetch_relays_html_format_and_defaults_when_absent` covering (a) an html-doc
   payload (`format: "html"`, `markdown` = an extracted-text string) → `out["format"]
   == "html"` + `markdown` passthrough, and (b) a payload with the `format` key removed
   → defaults `"md"`. Search hits (`_map_hit`) left unchanged (out of scope — upstream
   search results carry no format).

Verified non-impacts, per plan, left untouched: `upstream.py` (raw JSON passthrough —
format flows through), no pydantic/schema layer (`dict[str, Any]` return),
`scripts/e2e_smoke.py`, no mcp CI job, no linter.

## Validation

Command (run from `mcp-server/`):

```
uv run pytest
```

Outcome: **12 passed, 1 warning in 0.25s** (`tests/test_host_allowlist.py` 1 +
`tests/test_search_tool.py` 11, which now includes the new format test). The one
warning is a pre-existing `StarletteDeprecationWarning` about `httpx`/`starlette.testclient`,
unrelated to this slice.

## Deviations from `plan.md`

None. Every edit site matched the plan's description of the ground.

## Doc impact

Appended to `phase.md`'s running Doc-impact list (see below) — consolidated by
`P16.REVIEW`, not versioned here:

- (P16.S3) **api** — MCP `fetch_document` output gains an additive `format`
  (`"md" | "html"`) field, relayed verbatim from the S1 upstream read (default `"md"`);
  `CONTRACT.md` updated in-source; contract stays **v1** (additive output field, no
  `CONTRACT_VERSION` bump).
