# Intent — P37-1p

- Captured at: 2026-10-30T17:10:15+09:00
- Origin: operator

## Original Input (verbatim)

> and maybe we should drop the graph of the knowledge since it's only looks noisy. never looked.

Confirmation of the name, objective and the three recommendations (old links, landing page, plugin template):

> I'll take brave. yes.

## Confirmed Intent (refined + clarified)

Remove the knowledge graph from the hosted product (knowledge.hi2vi.com). The operator finds it noisy and never uses it.

- **Gone from the app:** the graph page and its entry in the app's navigation.
- **Gone from the public side:** the public graph pages (`/@{org}/graph`, `/graph/{id}`).
- **Gone from the API:** the graph endpoint, once nothing else depends on it.
- **Gone from the landing page:** the graph feature section and the decorative graph motif. If the landing looks bare without them, that is a design question for the operator, never an improvised fill.
- **Old links keep working:** an old shared graph link redirects to the org's library instead of breaking.
- **Not touched:** the knowledge plugin's starter template, which gives other people's own sites their own graph. Only the hosted product drops it.

## Clarifications Resolved

- Q: Its own phase, separate from the Hermes chat (P36-1s)? — A: yes.
- Q: Old shared graph links: redirect to the org's library rather than a 404? — A: yes (redirect).
- Q: The landing page: remove both the graph feature section and the decorative graph motif, with a design round only if the page then looks bare? — A: yes.
- Q: Leave the plugin's starter template alone and drop the graph only from knowledge.hi2vi.com? — A: yes.

## Notes

- Surfaces found at intake: `web/src/app/(app)/graph`, `web/src/app/(public)/graph`, `web/src/app/(public)/[org]/graph`, `web/src/components/app-shell/rail-nav.tsx`, `web/src/components/marketing/feature-graph.tsx` and `graph-motif.tsx`, `server/graph_api.py`, `scripts/graph_hook.py` (the retired mkdocs site's build hook). Not an exhaustive list.
- Independent of P36-1s; it can run first.
