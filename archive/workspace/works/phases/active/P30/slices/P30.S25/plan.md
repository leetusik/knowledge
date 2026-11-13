# P30.S25 — Legacy reader (`09-legacy-and-print`), the handshake retired, D37

## Goal

Legacy html explainers open in a full-screen legacy reader, where the sandboxed frame is the **only**
scroller. A ~1 KB bridge carries scroll, restore and link interception across the frame boundary, and
replaces the height handshake. Per P29 *S2 Legacy path* and the round's legacy sections, it covers:
- the full-screen `100dvh` frame as the only scroller;
- the bridge (scroll, restore, link interception), replacing `injectHeightReporter` in **both raw relays**
  (`/api/documents/{id}/raw` and the versions raw route);
- the sandbox gaining `allow-popups allow-popups-to-escape-sandbox`, **still with no `allow-same-origin`**;
- the parent validating `event.source` (it must be this frame's `contentWindow`) and the shape of every
  message, including the `navigate` message (same-origin reader paths only, through `safeNextPath`-style
  laundering; external links open as popups, per the prompt's *Links*);
- **retiring the handshake**: delete `web/src/lib/explainer-height.ts`, its parent half in
  `explainer-frame.tsx`, and the frame's print pinning;
- the document bar (`LegacyBar`), hide and show, keyboard and focus;
- resume, progress, finishing and bookmarks through the bridge (S8's API; the bookmarks as S21 left them
  for legacy);
- languages and versions;
- loading, relay failure and not found;
- the legacy Display (`LegacyDisplay`), with `color-scheme` following the theme, and *The theme over the
  document*, including the `look` field;
- **D37:** `Cache-Control: no-transform` (beside the existing `no-store`) on both raw relays.

**Core invariant:** the sandbox and the cross-frame message boundary. Explainer html is untrusted.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/09-legacy-and-print/rounds/01-legacy-and-print/build-prompt.md`: every legacy section, from *What the legacy reader is* to *Links*, plus *Data
    the page needs*, *Additions to signed parts*, the strings, and *Open questions this build waits on*
    (signed as drawn, so take the drawn answer);
  - the canvas `docs/reference/design/jobs/09-legacy-and-print/rounds/01-legacy-and-print/canvas/project/`.
- P29 *S2 Legacy path* and *S3 Resume and progress* (via `phase-section P29 Decisions`).
- `works/deferred/open/D37/brief.md`.
- `topics/notes-server.md` → *S4*: the version-raw relay has **no nginx location**. If S25 needs the
  version raw path served in production, add the location to `deploy/knowledge.conf` the way S4 added
  its relay. It takes effect at the next deploy, on the operator's word.
- `topics/notes-later.md`: S13's html redirect (OQ57: html chapters currently redirect to the legacy
  frame `/documents/{id}`), the reader notes, and S21's legacy notes.
- Code: `web/src/lib/explainer-height.ts`, `explainer-frame.tsx`, the raw relay routes under
  `web/src/app/api/documents/[id]/raw` and the versions raw route, `injectHeightReporter`, the CSP
  (`web/src/lib/csp.ts`; the raw relays keep `sandbox allow-scripts; frame-ancestors 'self'`), and the
  print pieces S26 will retire.

## Approach

1. **The bridge:** a tiny inline script injected by the relays, in place of `injectHeightReporter`. Inside
   the frame it:
   - reports scroll position and fraction, and the visible block if the prompt defines one;
   - restores the position on a `restore` message;
   - intercepts link clicks and posts `navigate` for internal links.

   It posts with `targetOrigin` handled per the sandbox (an opaque origin, so `"*"` outbound is
   unavoidable; the **parent** validates `event.source`). It accepts messages only from `parent`. Keep it
   around 1 KB.
2. **The parent** (`legacy-reader.tsx`):
   - validates `event.source === frame.contentWindow`;
   - checks message type and shape, with a strict schema and a size cap;
   - ignores everything else.

   `navigate`: an internal reader path goes through the router; anything else is refused or opened per
   the prompt.
3. **The relays:**
   - inject the bridge;
   - add `no-transform`;
   - extend the sandbox attribute on the iframe (`allow-scripts allow-popups
     allow-popups-to-escape-sandbox`; never `allow-same-origin`) and the relay's CSP `sandbox`
     directive to match.
4. **Routes:** html chapters (S13's redirect, OQ57) and `/documents/{id}` for html both open the legacy
   reader.
5. **Retire** `explainer-height.ts` and its parent half. Grep that nothing else imports them.
6. **Very-core tests:**
   - the message validator: wrong source, bad shapes, oversized messages, and a `navigate` to an external
     or `javascript:` target are all refused;
   - the relay emits the bridge, `no-transform`, and the sandbox without `allow-same-origin`.

## Live check (in addition to the rules)

- A legacy explainer at the manifest viewports, with exactly one scroller (the frame), at DPR 2 and with
  classic scrollbars where possible.
- Resume after a reload.
- Links: internal links navigate, external ones open in a popup.
- A crafted message from another window is ignored.
- The legacy Display themes.

## Out of scope

- Print (S26). Leave `print-blocks.tsx` and `export-pdf-button.tsx` for S26 to retire, unless they only
  served the handshake.

## Notebook (in addition to the rules)

- `result.md` lists D37 as shipped for REVIEW to close, and states whether D38–D40's droppable condition
  ("once S25 ships") now holds.

## Hand-offs (must do)

- From S21 (`topics/notes-later.md` → *Annotations II as shipped*): the legacy bar gets a bookmark control
  and the line "Highlights are not available in this document." Follow that note.
- The web login limiter answers 429 after a handful of sign-ins, so reuse one session during live checks
  (from S24).

## Dispatch

slice=P30.S25
phase=P30
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
