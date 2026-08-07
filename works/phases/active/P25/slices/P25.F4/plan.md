# Plan — P25.F4: member document view — consolidate explainer scroll (lost height handshake)

## Why (operator report + research, 2026-08-07)

On the member view of an HTML explainer the iframe scrolls internally instead of the page scrolling as one document. The anonymous view is verified fine (desktop Chrome: frame grows to content height, one scrollbar). Research (static analysis, high confidence) ruled out the layout: AppShell/`9d3c01b` introduces **no** nested scroll container — the shell CSS carries only `min-height` floors.

**Root cause (ranked #1): a hydration race that latches.** The parent's message listener attaches only in a `useEffect` (`web/src/app/(public)/documents/[id]/explainer-frame.tsx:85`); the iframe `src` is in the SSR HTML, so the sandboxed child loads and posts its height within ~16ms of `DOMContentLoaded` (`web/src/lib/explainer-height.ts:88`) — often before hydration on the member branch, which post-`9d3c01b` carries five client islands (AppFrame + icons, RailNav, LogoutButton, CopyLinkButton, DeleteDocumentButton) vs PublicShell's zero. The child then **dedupes**: `explainer-height.ts:55` (`var last = -1`) and `:69` (only re-posts when height changed ≥2px) — so a missed first message is permanent. `height` stays `null`, `data-measured` never set, and the CSS fallback (`explainer.css:40-43`: `height: calc(100dvh - …)`) is exactly the reported symptom. Corroboration: a window resize (a real height change) un-wedges it.

## The fix — deterministic re-request handshake (both sides, small)

1. **Parent** (`explainer-frame.tsx`): on listener attach (in the same `useEffect`) and on the iframe's `load` event, post `{ type: "kb-explainer-request" }` into the frame via `frameRef.current?.contentWindow?.postMessage(..., "*")` (`"*"` is required — the child is an opaque origin). Keep every existing inbound-message safeguard verbatim: `event.source === frame.contentWindow` identity check (`event.origin` is the literal `"null"` for all opaque origins — cannot be used), shape-check, clamp to `[MIN_HEIGHT, MAX_HEIGHT]`.
2. **Child reporter** (`web/src/lib/explainer-height.ts`): listen for `kb-explainer-request` (shape-checked; sender is the parent — reply via `window.parent.postMessage`) and respond by re-posting the current height **bypassing the `last` dedupe** (reset `last = -1` then `schedule()`, or post directly). Use `setTimeout`, never rAF (rAF does not fire in these frames — documented in the file). Keep the dedupe for all other triggers (it exists to stop feedback loops).
3. **No sandbox change** — `sandbox="allow-scripts"` without `allow-same-origin` is P16 pinned decision 1; the parent must never measure the frame directly. No CSS change expected; if the failure-mode fallback needs adjusting, it lives in `explainer.css` (co-located) — never in `kb-console.css` (a verbatim design handback; `app-frame.css:9-12` documents that rule).
4. **Coverage for free**: both raw relays (`api/documents/[id]/raw/route.ts:96` and `.../versions/[v]/raw/route.ts:83`) inject the same reporter, and every article view (id page member+anon, pretty page, versions view) renders the same `ExplainerFrame` — one fix covers all. Member and anonymous must keep rendering identically (9d3c01b's stated invariant); this fix is branch-agnostic by construction.

## Reproduce first, verify after (local, no prod access needed)

- Repro: local stack (`compose.yml` or `npm run dev` against the local api) with a seeded HTML explainer; view as a signed-in member; hard-reload (client-side nav from `/documents` hydrates early and may mask the race — test hard reloads). CPU-throttle in devtools if the race is timing-shy. Confirm the wedge: no `data-measured` on `.kb-explainer`, fixed fallback height, and a window resize snapping it to full height.
- After the fix: hard reload with throttling → frame grows without any resize nudge; verify on the id page (member AND anonymous), the versions view, and — if a slug is claimable locally — the pretty page.
- If the race does NOT reproduce even under throttle, do not shotgun-fix: implement the handshake anyway (it is correct regardless and hardens all branches), state the repro outcome honestly in `result.md`, and note the residual uncertainty for the review.

## Tests / validation

- The raw-route tests assert `HEIGHT_REPORTER_MARKER` — keep them green; extend minimally only if the reporter's injected marker changes.
- `web/tests/` idiom: if a cheap unit test of the reporter's request-handling exists within reason (the reporter is a TS module), add ONE small case; otherwise rely on the manual repro evidence. Tests stay small.
- `cd web && npm run lint && npm run typecheck && npm run build && npm run test` (baseline 15 files / 85 tests).
- `scripts/plugin_parity.py` (web-only → trivially green). `python3 scripts/workflow.py validate`.
- Append Doc impact notes to `phase.md` (frontend.md: the request/re-post handshake and why the dedupe alone was unsafe; qa.md: the hydration-race repro technique). Note: P25's earlier Doc-impact list was closed by the passed re-review — mark these as the F3/F4 round for the NEXT review pass to consolidate (F3 already flagged this in phase.md).

## Boundaries

No sandbox/CSP changes, no relay-route behavior changes beyond the reporter script content, no AppShell/layout changes (the layout is not the culprit), no backend. If the true cause turns out to be something the research missed and the fix balloons, STOP and return with findings.
