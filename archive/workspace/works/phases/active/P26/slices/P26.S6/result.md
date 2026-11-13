# Result — P26.S6 (Audit and refresh README.md)

## What changed

`README.md`: 84 → 118 lines, all six sections kept, in order, with their voice. This was an
audit-and-fix against the eleven pre-recorded items in `phase.md` §*Already-spotted README
staleness*, cross-checked against `docs/current/product.md`, `docs/current/operations.md`,
`compose.yml`, `compose.prod.yml`, `deploy/knowledge.conf`, `Dockerfile`, `Makefile`,
`cli/README.md`, and `plugin/README.md` — not taken on the item list's word alone.

Per item:

1. **Headline links (lines 3–4).** Re-verified live: `GET /graph/` → 308 → `/graph` → 307 → `/login`
   (title `Sign in · knowledge`) — the sign-in wall, exactly as recorded — and `GET /` → 200 with
   the marketing-landing title, not a library index. Replaced with `https://knowledge.hi2vi.com`
   (described honestly as the product's sign-in-first entry point) plus the **public**
   `https://knowledge.hi2vi.com/@leetusik/graph` — verified 200, unauthenticated, real `.kb-graph`
   mount in the response body — a working anonymous entry point in place of the old broken pair.
2. **Publish path (old "How it's built" §2).** Replaced the retired P9 mkdocs-at-root description
   with the real three-upstream edge, cross-read from `deploy/knowledge.conf` and
   `compose.prod.yml`: `/api/ /auth/ /app/ = /healthz` → `knowledge-api`, `/api/auth/` (regex-beats
   `/api/`) + `/` → `knowledge-web`, `/mcp` → `knowledge-mcp`. *Fresh-on-write* is restated (not
   deleted) per the plan's instruction.
3. **Hosted web app (previously absent).** Named in a new paragraph right after the lede (four ways
   in: web app, plugin, CLI, MCP) and again in "How it's built" → Publish path.
4. **Pretty share URLs (P25, previously absent).** New "Pretty share links" bullet in "How it's
   built": `/@{org}/{project}/{doc-slug}`, `/@{org}/graph`, old id/uuid links still resolving.
5. **MCP retrieval service (P15, previously absent).** Named in the same new four-ways paragraph and
   in the Publish-path bullet (`/mcp`, any AI agent).
6. **CLI on-ramps (P20).** Curl installer (`curl -fsSL https://knowledge.hi2vi.com/install.sh |
   bash`, verified live 200) is now the primary CLI install line; the `uv tool install git+…` form
   is kept as "also usable directly." Added the env-var agent quickstart
   (`KB_API_BASE_URL`/`KB_API_TOKEN`, names confirmed against the locked snippets in
   `web/src/content/marketing/content.ts`) and the published `/SKILL.md` (verified live 200). The
   `knowledge init` line was already correct against `cli/README.md` — left untouched, per the
   audit-not-rewrite instruction.
7. **Write path (search + doc format).** "FastAPI + SQLite (FTS5 full-text search)" corrected to
   the real hybrid search (BM25 + recency decay + Gemini embedding cosine, RRF-fused, confirmed
   against `data.md`/`architecture.md` via `phase.md`'s S2 notes) and the HTML-explainer document
   type is now named.
8. **"Nothing publishes until I push."** Scoped correctly: the hosted box pushes every write itself
   (`KB_GIT_PUSH=true` in `compose.prod.yml`); locally and from the plugin nothing pushes until the
   operator does (unchanged default `false`).
9. **Knowledge-map bullet.** Now names both graphs and which is which: the hosted app's live in-app
   graph (linked, verified 200) vs. the **local** MkDocs site's still-live static build
   (`scripts/graph_hook.py`, confirmed present and wired via `compose.yml`'s `kb` service) — the
   copy self-hosters and the plugin scaffold get. Neither claim needed inventing; both tracks are
   real and still current.
10. **"Recreating from scratch" → Restore this KB.** Verified: `compose.yml` now unconditionally
    sets `DATABASE_URL` (unlike operations.md's "may be left empty" note), so a plain
    `docker compose up -d` restore does start `postgres`. Traced `get_tenant_one_id()`
    (`server/api_auth.py:88`): with `KB_OPERATOR_EMAIL` unset (the local compose default), it
    returns `None` immediately, before any Postgres query — so the documented P10-cutover
    crash-loop deadlock (which requires `KB_OPERATOR_EMAIL` to be set against an unmigrated DB)
    does **not** apply to a bare local restore, and the content plane still self-heals exactly as
    the old text claimed. The README now says both things precisely: content-plane restore is
    still one command; the accounts plane (signup/login) starts unmigrated/empty until an explicit
    `docker compose exec api alembic upgrade head`. This was a genuine code-read finding, not
    something the item list handed me — recorded here and in the fixed text, no code changed.
11. **Still-plausible claims, cross-checked.** Plugin install lines
    (`/plugin marketplace add …` → `/plugin install …`), the Python 3.12+/Docker/GitHub
    requirements, and the "11 tracks" description all matched `docs/current/product.md`,
    `operations.md`, and `plugin/README.md` verbatim — left alone, except one small accurate
    addition (Connect mode needs none of the listed requirements; only Scaffold does — the old
    text implied every install needs them).

## The doc-impact call

**Decided: no.** Every correction above pulls `README.md` *up to* what `docs/current/product.md`
and `docs/current/operations.md` already state correctly — no drift was found inside the durable
docs themselves during this audit (which is what the "expected: no" framing in `phase.md` §Open
Questions predicted). `README.md` is not under `docs/`, so it is not a `doc-new-version` candidate
regardless of the finding. Recorded as a one-line "none" entry in `phase.md`'s Doc impact list, and
the cross-slice note above spells out why, per item.

## What was found but deliberately left alone

- The "Install the plugin" and "Agentic workflow" sections were already accurate against
  `plugin/README.md` and the current workspace contract — touched only for the one small
  Connect/Scaffold clarification (Install section); Agentic workflow untouched.
- `docs/current/operations.md`'s own "Locally `DATABASE_URL` may be left empty…" note (P10-era) is
  now slightly stale against `compose.yml`'s current unconditional `DATABASE_URL` — but that is a
  `docs/current/` drift, explicitly out of scope for this slice (`intent.md`; `phase.md` §Constraints
  7). Not fixed here; noted for `P26.REVIEW`/the operator to decide whether it's worth a future doc
  pass. It does **not** rise to a doc-impact note under this slice's own scope, since S6 is
  contractually barred from widening into `docs/current/` — flagging it in `result.md`/`phase.md`
  instead, as the plan's "record it as a note — do not fix it" instruction says.

## Validation

- `git diff --stat README.md` → `1 file changed, 64 insertions(+), 30 deletions(-)` — blast radius
  confirmed to be exactly one file.
- Grepped the corrected file for each stale claim to confirm it's gone (`graph/**`, "library index",
  "Nothing publishes until I push", the old mkdocs-serves-`/`-at-root wording) — all absent — and
  for each new claim to confirm it's present (`install.sh`, `SKILL.md`, `KB_API_BASE_URL`, `hybrid`,
  `MCP`, `postgres`, `@leetusik/graph`, `pretty`) — all present.
- Every URL named in the file was `curl`-checked live (never Python `urllib`, per constraint 3):
  - `https://knowledge.hi2vi.com/` → 200 (marketing landing)
  - `https://knowledge.hi2vi.com/graph/` → 308 → `/graph` → 307 → `/login` (sign-in wall, confirms
    item 1's finding still holds)
  - `https://knowledge.hi2vi.com/@leetusik/graph` → 200 (the new headline link)
  - `https://knowledge.hi2vi.com/install.sh` → 200
  - `https://knowledge.hi2vi.com/SKILL.md` → 200
  - `https://knowledge.hi2vi.com/mcp` (bare GET) → 406 (routed MCP liveness, not a gateway error)
  - `https://knowledge.hi2vi.com/healthz` → 200
- Every command named was checked against its real source: `/plugin marketplace add …` /
  `/plugin install …` (`plugin/README.md`), `knowledge init`/`save` lines (`cli/README.md`
  verbatim), `docker compose up -d` (`compose.yml`, `Makefile`'s `dev` target),
  `docker compose exec api alembic upgrade head` (matches the verified-live P10-cutover runbook
  form in `operations.md`, adapted to the local compose file with no `-f` flag needed).
- `python3 scripts/workflow.py validate` → `Workflow validation passed.`

## Deviations from plan.md

None in substance. The plan estimated a "plausibly 95–110" line result; the actual result is 118
lines (84 → 118, +40%), a bit past that estimate but nowhere near "twice as long" (168) — the extra
few lines bought the item-10 restore-precision fix and the Connect/Scaffold clarification, both
judged worth the space rather than trimmed for a round number. No section was added, reordered, or
dropped; no other repo file was touched; no `docs/current/*.md` edit; no `doc-new-version` run.
