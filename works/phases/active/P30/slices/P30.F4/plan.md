# P30.F4 — Sweep fixes: X3 (hash landing) and X4 / OQ183 (bound chapters redirect)

## Why

S27 → `slices/P30.S27/result.md` → *Defects* X3 and X4, with repro scripts in `slices/P30.S27/evidence/repro/`.
- X3 breaks the signed "Sign in to save" return to the same chapter and block (`01-reader` §12, P30.S11).
- OQ183 is decided: bound chapters redirect.

## Do

1. **X3, land on `#section`:** after a client navigation, a same-origin `#…` link, or the sign-in round
   trip, the reader never scrolls to `location.hash`. The URL keeps `#quiz-section`, but `scrollY` stays 0.
   - Fix it in the reader. After hydration and after any client navigation into a reader page, if
     `location.hash` names an element, bring it into view the way the signed design lands a jump: S13's
     hash jumps are instant, with `scroll-behavior: auto` under `.rd-root`, accounting for the sticky top bar
     through `scroll-margin-top`.
   - Find out why the native browser behaviour doesn't fire: client-side routing, the resume pill's restore
     overriding the hash, or late layout from fonts and images. Fix the cause.
   - **A hash must win over the saved resume position.** Check S15's resume logic.
   - Cover the sign-in return (`/login?next=…#block`), a same-page `#` link, and a cross-chapter
     `chapter:` link with a fragment.
   - Do the same for the legacy reader, if a hash applies there: it goes through the bridge's restore, if
     the prompt defines it.
2. **X4 / OQ183, bound chapters redirect:** `/documents/{id}` and the loose canonical
   `/@{org}/{project}/{slug}`, for a document that is a book chapter (native, md or legacy html), redirect
   **307** to its chapter URL from `readerHref`.
   - Keep `?v=` and `?lang=`. The browser carries the fragment.
   - Unbound documents are unchanged.
   - A version page (`/documents/{id}/versions/{v}`) is D51's and stays as it is.
   - Resolve the binding from the existing reads (S2's `canonical_path` and chapter data). Change the
     server only if a read lacks it, and then `plugin_parity` must pass.
   - Never redirect to something the reader can't read: no leak, and the constant not-found stays.
   - **Very-core test:** the redirect decision (bound or unbound, with query kept).

## Verify

- Re-run S27's X3 and X4 repros on the production build in a scratch stack: 3 of 3 and 5 of 5 land on the
  block, signed out and signed in, and after a real sign-in.
- `/documents/1` and `/documents/23` (or their equivalents in your stack) land on the chapter URL with
  Contents and Next.
- Follow `topics/surface-slice-rules.md` for the runtime, gates, D22 and PIDs. Reuse one sign-in, since the
  limiter returns 429.

## Notebook

- `phase.md`:
  - mark X3 and X4 as fixed;
  - add one Doc impact line (`frontend.md`: bound chapters redirect from the loose URLs; hash landing);
  - update `## Now`.
- `result.md`: verdict block first.
