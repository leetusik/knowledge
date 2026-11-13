# Intent — P25

- Captured at: 2026-08-07T14:33:25+09:00
- Origin: operator

## Original Input (verbatim)

> for make it possible to public documents

Follow-up in the same conversation:

> well, I see project level public sharing already possible. but one thing. the url link is "https://knowledge.hi2vi.com/documents/25" and it's not cool to share I think.

## Confirmed Intent (refined + clarified)

Give shared public documents (and the public graph) human-readable, durable URLs. P19's project-level visibility already covers *whether* something is public; this phase fixes *what the link looks like* and how long it survives:

- Introduce an **org slug** (durable, unique, in Postgres — the accounts plane) as the public identity of a tenant.
- Address public documents by slug, e.g. `/@{org}/{project}/{doc-slug}` — the exact URL shape (`@`-prefixed vs bare path vs `/docs/...`) is a decomposition-time design decision; the `@`-prefix avoids collisions with existing top-level routes (`/documents`, `/graph`, `/dashboard`, ...). A resolver primitive already exists: `find_latest_document_by_slug(project, slug)` in `server/db.py` (P23).
- Address the public graph by org slug instead of tenant UUID — this subsumes deferred job **D19** ("Org slug vanity URLs for the public graph"); promote D19 into this phase during decomposition.
- Old links keep working: `/documents/{id}` and `/graph/{uuid}` redirect to the canonical pretty URL. This also fixes a durability problem — numeric doc IDs come from the disposable content-plane SQLite and are not guaranteed stable across a full index rebuild.
- Share affordances (copy-link button, the 201 URL returned on save) hand out the pretty URL.

**Not in scope:** per-document visibility, secret share-link tokens, sitemap/SEO expansion.

## Clarifications Resolved

- Q: Does "make it possible to public documents" mean new visibility semantics (per-document public flag, unlisted share links)? — A: No — project-level public sharing (P19) is sufficient; the problem is the share URL itself (`/documents/25` is "not cool to share").

## Notes

- D19 (`works/deferred/open/D19`) is this phase's trigger firing ("Operator wants pretty share URLs") — promote it into P25 at decomposition, don't leave it parked.
