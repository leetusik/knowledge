# Intent — P22

- Captured at: 2026-08-05T14:25:01+09:00
- Origin: operator

## Original Input (verbatim)

> for below tasks:
> ---
> 1. the documents should be able to remove on the web.
> 2. the graph all grpah title shown is kinda sucks. make it possible to see only clicked one.
> 3. the documents should be handled version control. so the coding agent can see the previous document, and add v2 and v3 of it not new post. you should support this feature, and /explain will be updated in bootstrap repo. you create phase for them. on the ./bootstrap...sh
> 4. changple5 prod successfully connected to the knowledge prod. but reported some callback? is disconnected. even the docuemnt uploading it self is successful.

(This phase covers item 2; the four items were split into phases P21–P24.)

## Confirmed Intent (refined + clarified)

The graph view currently paints every document's title at once, which is visually overwhelming ("all graph title shown is kinda sucks"). Change label behavior so a title is shown only for the clicked/selected node; the hover tooltip behavior stays. This replaces the current "quiet-label ladder" in `web/src/app/(app)/graph/graph-canvas.tsx`, where all doc labels saturate to full alpha once display zoom passes ~1.35× fit or any focus/filter is active.

## Clarifications Resolved

- Q: (Phase split) Merge with the web-deletion work into one web UX phase? — A: No; four separate phases (P21–P24).

## Notes

- Relevant code: `labelTarget()`/`ladder()` around `graph-canvas.tsx:849–852`, `drawLabel()` at `:1093`; click-select interaction already exists (`endDrag()` tap → `select(id)`), shared by the member page and the public/org graph page.
