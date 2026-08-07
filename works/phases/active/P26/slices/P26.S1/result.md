# Result — P26.S1 (Knowledge: what it is and how it is used)

**Explainer 1 of 5 published.** Run inline by the orchestrator per `phase.md` §Constraints 1.

## What landed

| | |
|---|---|
| Document id | **29** |
| Version | **1** (new document — `PRIOR=none`) |
| Title | Knowledge: What It Is and How It Is Used |
| `rel_path` | `knowledge/2026-08-08-knowledge-what-it-is-and-how-it-is-used.html` |
| URL (from the 201) | `https://knowledge.hi2vi.com/@leetusik/knowledge/knowledge-what-it-is-and-how-it-is-used` |
| Tags | `knowledge-base`, `product-overview`, `multi-tenant`, `developer-tools`, `new-maintainer` |
| Extracted text | 25,242 chars |

Response flags: `committed: true` (`81b904f5`), `pushed: false` + `push_pending: true` — the **normal
P24 success**, not a failure. `landing_created: true` and `recent_updated: true`: this was the first
document ever filed under project `knowledge`, so the API also created `docs/knowledge/index.md` and
inserted the Recent bullet in `docs/index.md`, exactly as `phase.md` §Constraints 5 predicted.

## Invocation

Topic mode, no trailing flags:

> `/explain the knowledge product — what it is, who it serves, and how it is used: the problem it
> solves, its four distribution surfaces (the Claude Code plugin, the standalone knowledge CLI, the
> MCP retrieval service, and the hosted multi-tenant web app) as product roles, the user → org →
> project → document model with org-level keys and get-or-create projects, public/private project
> visibility and the P25 pretty share URLs, versioned documents, and the self-contained interactive
> HTML explainer as a first-class document type. Part 1 of a five-part series for a new maintainer.`

**KB research:** `GET /api/documents?project=knowledge&limit=200` → `total: 0`. No prior document, so
this is a plain create, not a version bump.

**Research section: `skipped-by-judgment`.** The subject is this repo's own product shape — roles,
ownership model, sharing semantics — which has no meaningful external comparison surface. The
explainer therefore has four sections (Background / Intuition / Code / Quiz) and no
`#best-practices` entry in its ToC, which is the documented behaviour, not an omission. This matches
vocky `P15.S1`, whose equivalent product explainer also skipped by judgment.

**One run sufficed** for the merged grouping. No re-split needed.

## Verification (with `curl`, per §Constraints 3)

- `GET /api/documents/by-path/knowledge/2026-08-08-…html` → `id: 29`, `version: 1`, `format: html`,
  title matching, extracted text 25,242 chars containing both `Background` and `Quiz` — i.e. the
  server's text extractor sees the real section content, so FTS and the MCP surface will too.
- `GET https://knowledge.hi2vi.com/documents/29` (anonymous) → **307**.
- `GET https://knowledge.hi2vi.com/@leetusik/knowledge/…` (anonymous) → **404**.

## Findings

1. **The `knowledge` project is private, so this series is not publicly readable yet — and that is
   the correct P19 default, not a defect.** The anonymous 307 on the id URL proves a
   `canonical_path` *was* emitted (the P25 forward only fires when a pretty URL exists), and the
   anonymous 404 on the pretty URL is the 404-never-403 rule applied to a private project. **Operator
   decision, not a blocker:** if this new-maintainer series should be publicly readable, flip project
   `knowledge` to public from its project page in the dashboard. Nothing in this phase's confirmed
   intent requires it — the intent says "saved to the KB" — so the loop did not stop for it.
2. **The org slug is `leetusik`.** The 201's `url` came back as `/@leetusik/knowledge/<doc-slug>`,
   confirming the org has claimed a P25 public URL name; no fallback to the id URL was needed.
3. **`canonical_path` is `null` on the `by-path` read projection** even though the pretty URL
   resolves. Consistent with the recorded P25 scope note (`canonical_path` rides detail reads and the
   resolver, not every projection) — worth a glance in **S3**, which owns the public route surfaces,
   but not a defect to chase here.
4. **Content note for S2:** the self-reference is set up but not paid off. This explainer states that
   it was written by the write path into the repo that implements it and defers the mechanism to S2.
   S2 owns that payoff (`phase.md` §Judgment calls) — do not let it go unwritten.

## Doc impact

**None** — by construction. The output is KB content, not this repo's durable doc tracks. The only
working-tree changes from this slice are `works/` bookkeeping; `docs/knowledge/` and `docs/index.md`
were written by the hosted API's own commit, pulled in separately.
