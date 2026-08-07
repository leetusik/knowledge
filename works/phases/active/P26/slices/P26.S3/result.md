# Result — P26.S3 (Knowledge: the read surfaces — two front ends)

**Explainer 3 of 5 published.** Run inline by the orchestrator per `phase.md` §Constraints 1.

## What landed

| | |
|---|---|
| Document id | **31** |
| Version | **1** (`PRIOR=none`) |
| Title | Knowledge's Read Surfaces: Two Front Ends, One Corpus |
| `rel_path` | `knowledge/2026-08-08-knowledge-s-read-surfaces-two-front-ends-one-corpus.html` |
| URL | `https://knowledge.hi2vi.com/@leetusik/knowledge/knowledge-s-read-surfaces-two-front-ends-one-corpus` |
| Tags | `frontend`, `iframe-sandbox`, `nextjs`, `design-system`, `new-maintainer` |
| Extracted text | 22,047 chars |

`committed: true` (`ea020e67`), `pushed: false` + `push_pending: true` (normal), `landing_created: false`.

## Research section: **included**

Two MDN pages opened and cited with the bare domain in plain text:

- `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe` — the verbatim
  warning that `allow-scripts` **plus** `allow-same-origin` lets the framed document remove its own
  sandbox ("no more secure than not using the `sandbox` attribute at all"), and that omitting
  `allow-same-origin` yields an origin that always fails the same-origin policy. This is the repo's
  pinned decision, stated by the platform.
- `https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage` — the emphatic "always
  specify an exact target origin, not `*`" guidance.

The second produced the most useful section in the document: a **justified divergence**. The repo
uses `targetOrigin: "*"` deliberately, and the reasoning holds up against the warning — an opaque
origin has no nameable value, the message carries no data, it is delivered into one specific frame's
`contentWindow`, and MDN's companion instruction ("verify the sender's identity using `origin` and
possibly `source`") is honored via `source`, because `origin` is the useless literal `"null"`. Framed
as: the rule's *purpose* is satisfied by a different mechanism because the rule's *assumption* does
not hold.

## Verification (with `curl`)

`id: 31`, `version: 1`, `format: html`, 22,047 chars; all five section headings and the
`developer.mozilla.org` citation domain present in the extracted text.

**One run sufficed.** `frontend.md` is the largest single track (841 lines) but it is one subject.

## The `canonical_path` glance (asked for by the plan, from S1's finding)

**Resolved — nothing is broken, and the explanation is now written into the series.**
`grep -n canonical_path server/*.py` shows it in **`documents_api.py`** (the `/app` plane's two
*detail* reads) and **`graph_api.py`** only. `server/main.py` — the `/api` plane — has none.

So S1's observation (`canonical_path: null` on `GET /api/documents/by-path/…` while the pretty URL
resolves) is expected behaviour with two independent causes stacked:

1. **P25 was additive to the `/app` plane only**, because `/api/*` is the frozen consumer contract.
   The `/api` projection never gained the field.
2. Even on `/app`, it rides **detail** reads and not the shared list projector — deliberately, to
   avoid an accounts-plane lookup per row.

The 201's pretty `url` comes from a *third* site (`main.py` builds it via its own `resolve_org_slug`
dependency), which is why the save reported a pretty URL that the by-path read appears not to know
about. Captured in the explainer as a callout ("you are looking at the wrong plane") and as quiz
question 3. **No code change proposed or made** — this slice writes none.

## Findings

1. **The MkDocs viewer's status is the single most confusing thing in this area**, and it is the one
   fact a maintainer is most likely to get wrong: retired from production at P14, yet shipped verbatim
   to every self-hoster by the plugin. Both dead code and product, simultaneously. The explainer leads
   with it, and it became a proposed next step (name that status in one place, so nobody "cleans up"
   files a plugin user depends on).
2. **The P25.F4 debugging lesson generalizes and deserves to outlive the fix:** the height-handshake
   race looked branch-specific (member broken, anonymous fine) but existed on every article view — the
   member branch just hydrates five client islands against `PublicShell`'s zero, so it lost the race
   more often. Only deterministic under CPU throttling.
3. **For S4:** the browser-QA residuals cluster here — the quiz actually rendering, graph feel in both
   schemes, the direct raw-URL sandbox strip — all recorded as owed to the operator because the repo
   has no browser/jsdom tooling. S4 owns the QA-gate story and should say what *is* machine-verified
   versus what is an operator residual; S3 lists them but does not own the gate map.
4. **For S5:** the design-provenance discipline (locked `extra.css` §1, `kb-console.css` copied
   verbatim, three quarantined on-token extensions rather than edits to the canvas) is stated here as
   a *practice*. The ADR behind it — why a design round's record must not be retro-edited — is S5's.

## Doc impact

**None** — by construction.
