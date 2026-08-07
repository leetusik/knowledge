# Plan — P26.S3 (Knowledge: the read surfaces — two front ends)

## What this slice is

**Explainer 3 of 5.** One `/explain` run, published to the KB as project `knowledge`. No repo source
changes. Run **inline on the main thread** (`phase.md` §Constraints 1).

## The question this explainer answers

*What does this look like to a reader, and how is that built?* S2 ended at a document sitting on
disk with a row in SQLite. S3 is everything between that and a human's eyes.

## The framing that makes this slice worth its own document

There are **two distinct front ends**, built years and philosophies apart, and the honest telling is
that one of them was **retired from production and survives as something else**:

1. **The MkDocs viewer** — the original public library: a hand-authored "calm editorial library"
   design system in `extra.css` (§1–§9), browser-only lunr search with CJK handling, and a vendored,
   no-CDN canvas knowledge-graph renderer fed by a build-time `graph.json`. **Retired from production
   at P14** when the Next app took `/` — it lives on as a local tool and as the scaffold the plugin
   ships to self-hosters.
2. **The Next.js app** — the current product surface: four route groups, a sealed-cookie BFF, the
   public `/@{org}` namespace, and the sandboxed explainer render.

Do not present these as one evolving front end, and do not quietly write the MkDocs one out of the
story — a maintainer who meets `docs/stylesheets/extra.css` and `docs/javascripts/graph.js` needs to
know what they are, why they are still here, and that the plugin ships them.

## Series framing

Part 3 of 5. **Do not re-explain the write path or the self-reference** — S2 owns both and paid the
latter off. Reference and move on.

## Sources to cover

Per `phase.md` §*Sources per knowledge topic* → **S3**:

- **Docs:** `frontend.md` (all of it — stack, `mkdocs.yml` theme config, the design system `extra.css`
  §1–§9, fonts wiring, landing markup, per-project & tags pages, client-side CJK search, the
  knowledge-map renderer + `extra.css` §10, conventions & constraints, then the whole `web/` half:
  the authenticated app P12, the marketing landing P14, the HTML explainer render P16, the height
  handshake, the Org API keys panel P18, the public route group P19, the onboarding landing P20,
  member delete P21, graph label focus P22, version history P23, and the `/@{org}` namespace P25).
  Cross-read `experience.md` §*Route / screen map* + §*UX states* as the screen inventory (S1 owns
  them as journeys).
- **Code:** `web/src/app/` (the four route groups and the BFF routes under `app/api/`),
  `web/src/lib/` (`session.ts`, `bff.ts`, `auth-guards.ts`, `explainer-height.ts`, …),
  `web/src/components/`; and the MkDocs side — `mkdocs.yml`, `docs/index.md`,
  `docs/stylesheets/extra.css`, `docs/javascripts/graph.js`, `scripts/graph_hook.py`.

## Anchors the explainer must land

- **The "calm editorial library" visual language** — warm paper, exactly one deep-teal accent, serif
  display over clean sans — and that the design system is hand-authored CSS sections, not a framework.
  Its provenance is the operator's Claude Design project; it is not agent taste.
- **The sealed-cookie BFF**: the browser talks only to the Next origin; Next calls the backend
  server-to-server with a bearer and seals the session token into an AES-256-GCM httpOnly cookie. The
  payoff is structural — the backend needs no CORS, no cookie middleware, and no web-side database.
- **The opaque-origin sandboxed iframe** — the heart of this slice. `allow-scripts` **without**
  `allow-same-origin` is what lets an explainer's quiz run while denying it the session, storage, and
  the parent DOM. Explain *why sanitizing was rejected* (it kills the quiz), and that the same CSP +
  `X-Frame-Options` pair is asserted identically at three layers so no header ordering can resolve
  wrong.
- **The height handshake** (and the P25.F4 hydration-race fix) — how a sandboxed frame that cannot be
  measured from outside tells its parent how tall it is.
- **Browser-only by design**: the public site never calls the API. Its search is lunr in the browser;
  its graph is a build-time static asset. That decoupling is exactly what lets two services cohabit
  one domain with no CORS.
- **CJK search at the query layer**, and its honestly-recorded limits (no mid-compound substring
  match; particles stopword-filtered).
- **Graph labels follow the selection** (P22) on the in-app map only — the public MkDocs map still
  has the older ladder. One shared canvas component, two behaviours; say which is which.
- **404-never-403 as it appears in the public routes**, and the P25 forward asymmetry (anonymous
  visitors forward to the pretty URL; members stay on the id URL because it carries member-only
  affordances).

## Invocation

Topic mode, no trailing flags. Let the judgment gate decide research and **record the outcome**. An
`included` outcome is plausible here — iframe sandboxing and BFF session handling are well-documented
external practices — but do not force it; if the gate skips, that is a legitimate result to record.

## Constraints

Inherited from `phase.md` §Constraints: no `here` flag; no repo source changes; verify with `curl`;
`git pull --rebase` after the save, before committing.

Also: **glance at the `canonical_path`-null-on-`by-path` note from S1** while in the public-route
code. Report what you find in `result.md`; do not fix anything — this slice writes no code.

## Done when

- Published (201 recorded) and verified with one `curl` GET.
- `result.md` records the topic, identifiers, research outcome, whether one run sufficed, the
  `canonical_path` glance, and any finding for S4/S5.
- Cross-slice note appended to `phase.md`; `validate` passes.
