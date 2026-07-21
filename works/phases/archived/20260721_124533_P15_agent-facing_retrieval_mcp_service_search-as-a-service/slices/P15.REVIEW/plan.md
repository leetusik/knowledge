# P15.REVIEW (re-review) — consolidate the P15.F1 fix

_Supersedes the original P15 review plan (that review passed and consolidated api v0011,
architecture v0012, operations v0016, product v0006). The phase was reopened to add **P15.F1**,
which fixed the deployed server's `421 Invalid Host header` (FastMCP's localhost-only
DNS-rebinding allowlist rejected both the public edge host and the internal `knowledge-mcp:9000`
path). This re-review consolidates **only the F1 delta**._

## Already established (do NOT re-do — this is the review's evidence, provided by the orchestrator)
- **Behavior is verified in production.** After the F1 redeploy (Production Deploy Action, sha
  `284fc03`, conclusion success): the Action's external smoke logged `smoke OK (406, routed MCP
  server): https://knowledge.hi2vi.com/mcp`; an independent probe returned HTTP 406 + a `jsonrpc`
  body; and the full authenticated `e2e_smoke.py` against `https://knowledge.hi2vi.com/mcp` with
  the master `KB_API_TOKEN` returned **PASS** (initialize → both tools listed → search 5 hits →
  fetch_document 40298 chars). The fix is real and the public path works end-to-end.
- F1's own tests passed (`uv run pytest -q` → 11 passed) and `validate` is clean.

## Your job
1. **Sanity re-validate** (fast — do NOT re-prove prod): `python3 scripts/workflow.py validate`
   (state integrity) and `cd mcp-server && uv run pytest -q` (expect 11 passed). Report output.
2. **Consolidate the F1 doc-impact note into a new operations version.** The note is the last
   `(F1)` line in `works/phases/active/P15/phase.md`'s "Doc impact" list; it is tagged *operations
   doc*, and no other doc changed — **operations is the ONLY new version** (do NOT re-version
   api/architecture/product/security):
   - `python3 scripts/workflow.py doc-new-version --doc operations --summary "P15.F1 MCP transport-security Host allowlist: MCP_ALLOWED_HOSTS/MCP_ALLOWED_ORIGINS required — FastMCP localhost-only DNS-rebinding default 421s public+internal hosts; protection stays on" --source P15.REVIEW`
     (this seeds `docs/versions/operations/v0017_*.md` from the current v0016 body).
   - Edit the **newly created** `docs/versions/operations/v0017_*.md` (NEVER hand-edit
     `docs/current/` or the old v0016 file) so the existing "MCP retrieval service deploy (P15)"
     section states the deploy **requires** `MCP_ALLOWED_HOSTS` (+ `MCP_ALLOWED_ORIGINS`): FastMCP's
     default localhost-only DNS-rebinding allowlist returns `421 Invalid Host header` to the public
     host and the internal `knowledge-mcp:9000` path; protection stays ON via an explicit env-driven
     `TransportSecuritySettings` (`config.allowed_hosts()`/`allowed_origins()` = localhost defaults +
     the env vars); matching rule — port-less public host = **exact** entry `knowledge.hi2vi.com`,
     internal path = `knowledge-mcp:*`; concrete compose values
     `MCP_ALLOWED_HOSTS="knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*"`,
     `MCP_ALLOWED_ORIGINS="https://knowledge.hi2vi.com"`. Keep the rest of the section intact. Also
     flip any lingering "operator post-deploy / nothing live yet" phrasing in that section to
     reflect that the container is now **deployed and the public path is verified** (406 routed +
     authenticated E2E PASS with the master token); the real hi2vi `vk_` provisioning + D13 remain
     the only outstanding follow-ups.
   - `python3 scripts/workflow.py rebuild-docs`; confirm `docs/current/operations.md` regenerated
     and `python3 scripts/workflow.py docs` shows operations latest = v0017.
3. Write `works/phases/active/P15/slices/P15.REVIEW/result.md` (what you validated, the new
   operations version id, the verdict) and append a one-line re-review note to `phase.md`.
4. Return a structured verdict. Expected **pass** (fix verified in prod; only doc consolidation
   remained). Do NOT commit and do NOT run `review-phase`/`finish-slice` — the orchestrator records
   the verdict and transitions the phase.

## Out of scope
No code changes, no deploy, no archive (a separate manual step), no api/architecture/product/security
re-version.
