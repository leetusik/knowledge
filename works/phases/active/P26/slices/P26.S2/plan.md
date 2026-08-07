# Plan — P26.S2 (Knowledge: system internals — content plane, write path, contracts)

## What this slice is

**Explainer 2 of 5.** One `/explain` run, published to the KB as project `knowledge`. No repo source
changes. Run **inline on the main thread** (`phase.md` §Constraints 1).

## The question this explainer answers

*How does it actually work?* — the mechanism behind everything S1 described as a promise. This is the
engine-room document: the storage model, the write path end to end, the module map, the schema, and
the wire contracts. A reader finishing S2 should be able to open `server/` and know where they are.

## The opening idea, and why it must come first

**Disk is canonical; the database is a disposable projection.** Every other decision in this slice
follows from it — why `reindex` is a repair tool rather than a migration, why a document rowid is not
a durable identity (and so why P25's org slug had to live in the *accounts* plane), and why a
version archive is a file on disk. Open with it, in the Intuition section, with concrete toy data.
Do not bury it in the walkthrough.

## Series framing

Part 2 of 5. S1 established *what* and *who*; this is *how*. Say so, and hand off explicitly: the
front ends are S3, shipping/deploy/security/QA is S4, the decision record is S5.

## Sources to cover

Per `phase.md` §*Sources per knowledge topic* → **S2**:

- **Docs:** `architecture.md` — **excluding** §*Plugin packaging (P7)* and §*Open-core template
  mirrors the SaaS server (P17)*, which belong to S4; `backend.md` (stack, `server/` module layout,
  invariants, error handling); `data.md` (storage, entities, indexes/search, the sqlite-vec
  extension point, migrations, reconciliation, retention); `api.md` (the contract catalogue —
  auth, tenant resolution, the `/app` read plane, MCP v1, the HTML format, org credentials +
  get-or-create, public/anonymous reads, versioned publishing + history, the P25 slug resolver and
  `canonical_path`, and the **frozen consumer contract**).
- **Code:** `server/documents.py` and `documents_api.py` (the write path, frontmatter
  serialize/parse, HTML text extraction, the version archive), `search.py`, `embeddings.py`,
  `gitops.py`, `publish.py`, `reindex.py`, `api_auth.py`, `app_api.py`, `config.py`, `db.py`, plus
  the `accounts/`, `persistence/`, `usage/` packages; `alembic/versions/0001…0005`;
  `mcp-server/src/knowledge_mcp/`.

Read the real code for the write path and the storage model — those carry the teaching. Skim the
rest for shape; the module map does not need every function read.

## Anchors the explainer must land

- **Disk canonical / DB disposable**, with `reindex` as the drift-repair tool that proves it.
- **The two planes**: the SQLite content plane and the async Postgres accounts plane, the latter
  dormant when `DATABASE_URL` is unset (which is what makes single-tenant self-hosting work).
- **The single write path**, in order, with the P24 change called out: write file → index → embed →
  git commit → **respond** → background push + embed. The 201 is returned *before* off-box work,
  which is exactly why `push_pending: true` is a success (S1 introduced this claim; S2 proves it).
- **Versioning on disk**: the archive at `.versions/<project>/<date>-<slug>/vNNNN.html`, why the
  identity (id, URL, date, slug) is preserved, and why changing `project` or `format` is a 422.
- **HTML as a document type**: `serialize_html_frontmatter` writes a `<!--kb …-->` comment block,
  `extract_html_text` strips scripts and styles so FTS and embeddings index only visible text, and
  `raw_html` is dropped from every JSON projection.
- **Hybrid search**: BM25 + exponential recency decay + embedding cosine, fused by RRF, with CJK
  handled by query-layer prefix expansion rather than the tokenizer.
- **The frozen consumer contract** and the MCP v1 contract as things a maintainer may extend but not
  break — and the thin-proxy, forward-the-bearer-verbatim shape of the MCP service.
- **The self-reference payoff, owed by this slice** (`phase.md` §Judgment calls, and S1's handoff
  note): this series is written *by* this write path *into* the repo that implements it. Say plainly
  what that means in practice — the hosted API commits and pushes to `origin/main` while the phase's
  own slice commits accumulate locally.

## Invocation

Topic mode, no trailing flags; let the judgment gate decide the research section and **record which
way it went**. A skip is likely (internal architecture), but the hybrid-search fusion and the
disk-canonical stance both have genuine external comparison surfaces, so an `included` outcome would
also be legitimate — do not force either.

## Constraints

Inherited from `phase.md` §Constraints: no `here` flag; no repo source changes; verify with `curl`,
never Python `urllib`; `git pull --rebase` after the save and before committing this slice.

**Do not re-explain S1.** Assume the reader has it. Where a product fact is needed (orgs, keys,
visibility), reference it in a clause and move to the mechanism.

## Done when

- Published (201 recorded: id, version, `rel_path`, URL) and verified with one `curl` GET.
- `result.md` records the topic invoked, the document identifiers, the research outcome, whether one
  run sufficed, and any finding for later slices.
- A cross-slice note is appended to `phase.md`; `validate` passes.
