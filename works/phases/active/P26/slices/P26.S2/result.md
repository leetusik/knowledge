# Result — P26.S2 (Knowledge: system internals)

**Explainer 2 of 5 published.** Run inline by the orchestrator per `phase.md` §Constraints 1.

## What landed

| | |
|---|---|
| Document id | **30** |
| Version | **1** (`PRIOR=none` — no prior document on this subject) |
| Title | Knowledge System Internals: The Content Plane, the Write Path, and the Contracts |
| `rel_path` | `knowledge/2026-08-08-knowledge-system-internals-the-content-plane-the-write-path-and-the-contracts.html` |
| URL | `https://knowledge.hi2vi.com/@leetusik/knowledge/knowledge-system-internals-the-content-plane-the-write-path-and-the-contracts` |
| Tags | `internals`, `write-path`, `sqlite`, `architecture`, `new-maintainer` |
| Extracted text | 26,037 chars |

`committed: true` (`fe0ead0d`), `pushed: false` + `push_pending: true` (normal P24 success),
`landing_created: false` — correct, since S1 created `docs/knowledge/index.md`.

## Research section: **included**

The judgment gate was applied, not skipped by reflex. S1's subject (product shape) had no external
comparison surface; S2's does — hybrid-search rank fusion, SQLite's single-writer model, and
in-process background work versus a task queue are all substantive engineering choices with
documented prevailing practice. Three pages were **actually opened** and are cited with the bare
domain in plain text (verified below):

- `https://www.sqlite.org/wal.html` — the single-writer/concurrent-reader guarantee, quoted verbatim.
- `https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion` — the RRF
  formula and the default rank constant **60**, matching `search.py`'s `RRF_K = 60`.
- `https://fastapi.tiangolo.com/tutorial/background-tasks/` — the in-process-vs-Celery boundary, used
  to frame `publish.py`'s deliberate third option.

**Two fetches failed first** (`dl.acm.org` → 403; `sqlite.org/wal.html` without `www` → empty) and
were not retried in a loop, per the skill's degradation rule; both were replaced by reachable
equivalents rather than cited unread.

Four concrete next steps were proposed, each grounded in the code: bound the worker-side Gemini embed
the way git is bounded (matches open deferred **D23**), reconcile the publish queue at boot, consume
the `sqlite-vec` seam when the cosine loop gets slow, and populate the MCP citation `url` (**D13**)
now that pretty URLs resolve.

## Verification (with `curl`)

`GET /api/documents/by-path/…` → `id: 30`, `version: 1`, `format: html`, 26,037 chars extracted.
All five section headings present in the extracted text (**Background, Intuition, Code, Best
practices, Quiz**), and all three citation domains — `sqlite.org`, `elastic.co`,
`fastapi.tiangolo.com` — survive extraction as plain text. That last check is the whole point of the
skill's "link plus the bare domain" rule: the FTS index and the MCP surface store extracted text, so
an `href` alone would lose provenance. Confirmed working end to end here.

**One run sufficed.** The grouping is large (four doc tracks plus the `server/` tree) but coherent,
because everything in it descends from one idea. No re-split needed.

## Findings

1. **The self-reference is paid off, as S1 handed over.** The Code section closes by walking this
   document's own path — skill → hosted API → a write into *its own clone of this repo* → 201 →
   background push to `origin/main` — and states the operational consequence for anyone working this
   way: `git pull --rebase` between saves or the histories diverge. `phase.md` §Judgment calls
   required this; it is done, and S3–S5 need not repeat it.
2. **The durable/disposable split is the right spine for the series.** Framing disk-canonical /
   DB-disposable as *the* opening idea made three otherwise-unrelated decisions fall out as
   consequences in one paragraph each (why the rowid is a bad share link → the P25 slug's home in
   Postgres; why version bodies are files; why `reindex` is a repair tool). Later slices can lean on
   this instead of re-deriving it.
3. **For S4:** the deploy-side halves of two things S2 only touched belong there and were
   deliberately left alone — `KB_GIT_PUSH` as a *deployment* flag with its edge/secret story, and the
   publish worker's operator surface (the failure only ever reaches the container log, so the box's
   positive assertion is git state, not a log grep).
4. **For S5:** the two-implementations config seam (the CLI resolver vs the skill's inline resolver,
   which cannot be merged and whose drift is a standing risk) is named in S2 as a contract but its
   *rationale* is a decision-record item. S5 owns the "why we accepted two implementations" telling.

## Doc impact

**None** — by construction; the output is KB content, not this repo's durable doc tracks.
