# P28.S5 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Round 04 apply: disclosures, the documents page, the auth gate — plus D18's login `next`, the operator-authorised iOS fix, and the second half of the 422.** Executor: `slice-executor-high`.

Scope is round 04's contract **§4.4, §4.7, §4.8** (`web/design/rounds/04-console-surfaces/output/build-prompt.md`). **RESPECT THE DESIGN.** §3, §4.1–4.3, §4.5 and §4.6 landed in `P28.S4` — do not revisit them.

Read `works/phases/active/P28/phase.md` whole first. Binding and not restated here: **the cascade rule** (a Tailwind utility can only *add* a property the `.kb-*` classes do not set), **the `kb-record-fixes.css` decision**, **the Aside viewport recipe** and S3's addendum, the **local runtime left running**, and **the deaf-dev-server trap** (S4 lost ~20 minutes to an orphaned `next dev` that had silently stopped rebuilding CSS — if a new import produces no new rules, restart it before debugging anything else).

## You create the corrections sheet

`web/src/app/kb-record-fixes.css` — new, **imported last** in `globals.css`. Its charter is in `## Decisions`: **operator-authorised corrections to a signed record only**, never new design. Every rule carries a comment naming the round and section it corrects, what the gap is, and that the operator authorised it on 2026-09-21. Later slices insert `kb-docview.css` and `kb-print.css` **before** it — leave a comment in `globals.css` saying so.

It has exactly **one** rule to start with: **the iOS search-box zoom.** Round 03 §7 says "Inputs are 16px below 40rem. Non-negotiable", and §3's phone block raises only `.kb-field__input` — the documents search field is `.kb-appsearch__input` and measures 14.4px at 390, so iOS Safari zooms the page on focus. Raise it to 16px, **font-size only** — no border, no background, no repaint — mirroring the at-rule form round 03's own phone block uses (a `kbmain` container query, not a width `@media`). This implements the record's own explicit rule where §3 missed an element; it is not a new visual decision. Do not instead give the input `.kb-field__input`, which would repaint it.

Resist putting anything else in this file. Every other gap in the notebook is reported, not authorised.

## D18's login half — the security-shaped part of this slice

Verified absent today: `credentials-form.tsx` hard-codes `router.replace("/dashboard")`, `lib/auth-guards.ts`'s `redirectIfAuthenticated` always goes to `DASHBOARD_PATH`, and `requireSession` bounces to `LOGIN_PATH` with no return address.

- Accept **same-origin relative paths only**. Reject absolute URLs, protocol-relative `//host`, anything not starting with a single `/`, and anything that normalises out of the app. **An open redirect on a login page is a real vulnerability** — write the guard so that it fails closed to `/dashboard`.
- Honour `next` in **both** the form's post-login navigation **and** `redirectIfAuthenticated`.
- **`P28.S6` will emit `/login?next={publicBase}/documents/{id}`** from the public graph's gate line. You land first, so **you define the accepted shape and record it in the notebook** for S6 to match.
- This is the one part of the slice where a small unit test earns its place: the workspace writes tests for core behaviour, and "which redirect targets are accepted" is exactly that. Put a handful of minimal cases beside the existing `web/tests/*.test.ts` (there is already `session-guards.test.ts` and `auth-routes.test.ts` to sit next to). No fixture scaffolding, no component rendering — the harness is `environment: "node"` with no jsdom.

## Finish the 422

`documents/page.tsx` is the remaining half (S4 closed the project page). The API types the project filter as a UUID, so FastAPI answers **422** for a non-UUID while `loadDocuments` maps only 404/400 to `notFound()` — `/documents?project=not-a-uuid` therefore shows the 500 editorial instead of the designed 404, contradicting the file's own header comment. Add 422 to the mapping and correct the comment. One status, one call site, no new copy.

## Section notes

- **§4.4 disclosures** — one placement for **create project**, **mint org key**, **mint credential**: the trigger stays put and never disappears (it toggles `aria-expanded` and closes the form), and the revealed form becomes the **next sibling of the head** as `.kb-inlineform` — `--framed` for create-project, which hangs off the page frame with no panel to supply a surface. Focus moves to the first field on open and **back to the trigger on close**. The error is the field's own always-rendered `.kb-field__error`, so no layout moves. **S4 left both mint components whole and inside the head, verified working** — you are changing a working disclosure, not repairing one; read its note for exactly what is where. The show-once reveal keeps its overlay and becomes a bottom-anchored full-width sheet below 40rem, clearing the navbar, with `env(safe-area-inset-bottom)` in its padding.
- **§4.7 documents page** — `.kb-searchbar__actions` as the third cell, which is what finishes the **unstyled third child S2 deliberately left you**. Those buttons and the hidden passthrough inputs are the **entire no-JS search path**: never delete them for tidiness. Also delete the remaining `min-[720px]:` utilities, and land `.kb-hintline`, `.kb-snippet` (with **real `<mark>` elements**, per §9 item 8), `.kb-taglist` + `.kb-chip--more`, and `.kb-pager`.
- **§4.8 auth** — **delete every inline style in `auth-card.tsx`**. The gate declares its own `kbauth` container, so round 03's 44px/16px floors (scoped to `kbapp`) do **not** reach it — §4.8's own table is what supplies them below 40rem. The status-keyed error renders **always** (empty string when none) between the password and the submit, with `aria-invalid` + `aria-describedby` on **both** inputs while it stands, cleared by typing in either. `data-md-color-scheme="slate"` and **no `data-kb-scheme`** — the gate is always dark. Trust chips wrap to as many centred lines as needed and are never truncated or reduced to two of three.
- **The busy conversion is yours for the files you own** — `create-project-form.tsx`, `mint-org-key-form.tsx`, `mint-credential-form.tsx`, `revoke-org-key-button.tsx`, `revoke-credential-button.tsx`, `delete-document-button.tsx`, the show-once reveal, and `credentials-form.tsx`. `AppButton`'s `busy` deliberately does **not** set `disabled`, so **move each one's double-submit guard into its handler** (an early return on the pending flag). Do not leave a form unguarded. S4 did the same on the two forms it owned; follow that pattern.
- **The Delete control that does not stretch** (S2's note): round 03's `.kb-dtable tr > td:last-child .kb-appbtn { width: 100% }` resolves against `delete-document-button.tsx`'s own `inline-flex` wrapper `<form>`, so it measures 57.7px at 390 instead of the card width. **The rule is right; the wrapper is what changes** — and you are rewriting that file anyway.

## Validation

1. `pnpm --dir web typecheck` · `lint` · `test` · `build`. **Never** `prettier --write` an existing web file (**D22**).
2. **Round 04 §9 items 7–10.** Items 1–6, 11 and 12 were S4's and pass; do not re-run them as your own. Item 11's spirit applies to your new sheet too — keep `kb-record-fixes.css` free of width `@media` for the same reason the round sheets are.
3. **In the operator runtime, in a real browser.** Prove the things a diff cannot: the no-JS search path still round-trips as a plain GET; each disclosure opens below its head with the trigger still visible and focus landing correctly, and returns focus on close; the show-once reveal is a centred modal above 40rem and a bottom sheet below it that clears the navbar; the auth error slot holds its height with no layout shift; **the search input is 16px at 390** (the whole point of the authorised fix); the Delete control now spans the card; a `?next=` round trip works and a hostile `next` is refused.
4. Narrow viewports through S2's harness — remember **layout there is trustworthy, interaction is not**, so drive clicks and focus checks at the top level (1440×900 native). Where a check is inherently interactive *and* phone-only, say plainly in `result.md` that it is unverified rather than implying otherwise.

## Before you finish

- Append **one** `## Doc impact` line (`frontend.md` for the §4.4/§4.7/§4.8 layer and the new corrections sheet; `security.md` for the login `next` guard).
- Edit the notebook: consume the notes you used (S2's three, S4's seam note, the 422 note — the deferred-job candidate for the review can be dropped once both halves are closed), **record the accepted `next` shape for S6**, add `## Decisions` for anything you had to read into the record, and rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first, naming the instrument and listing which §9 items you verified and how.

You never commit and never transition slice or phase status.
