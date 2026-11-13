# P28.S5 — result

- **status:** `done`
- **summary:** Round 04 §4.4/§4.7/§4.8 applied — one disclosure placement on all three forms (trigger stays in the head, the revealed `.kb-inlineform` is the head's next sibling, focus in and back out), the documents page finished with `.kb-searchbar__actions` / `.kb-hintline` / `.kb-snippet` / `.kb-taglist` + `.kb-chip--more` / `.kb-pager` / `.kb-page-flow` and its 422 mapping, and the auth gate rebuilt on `.kb-authgate` / `.kb-authcard*` with **every inline style in `auth-card.tsx` deleted**. Plus D18's login half (`?next=`, same-origin relative only, failing closed to `/dashboard`, honoured by both the form and `redirectIfAuthenticated`, with 25 unit cases), the operator-authorised iOS search-zoom fix in the new `kb-record-fixes.css`, and **one pre-existing bug found by actually minting a key: the project credentials form never sent `projectId`, so minting a project key had been failing outright.**
- **files_changed:**
  - `web/src/app/kb-record-fixes.css` (new) · `web/src/app/globals.css`
  - `web/src/lib/next-path.ts` (new) · `web/src/lib/auth-guards.ts` · `web/tests/next-path.test.ts` (new)
  - `web/src/app/(app)/documents/page.tsx` · `web/src/app/(app)/documents/delete-document-button.tsx`
  - `web/src/app/(app)/dashboard/create-project-form.tsx` · `mint-org-key-form.tsx` · `revoke-org-key-button.tsx` · `dashboard/page.tsx`
  - `web/src/app/(app)/projects/[projectId]/mint-credential-form.tsx` · `revoke-credential-button.tsx` · `projects/[projectId]/page.tsx`
  - `web/src/app/(auth)/layout.tsx` · `auth-card.tsx` · `credentials-form.tsx` · `login/page.tsx` · `login/login-form.tsx`
- **validation:**
  | command | result |
  |---|---|
  | `pnpm --dir web typecheck` | pass |
  | `pnpm --dir web lint` | pass (0 errors, 0 warnings) |
  | `pnpm --dir web test` | pass — 17 files, **113** tests (was 88 + the new file's 25) |
  | `pnpm --dir web build` | pass |
  | `python3 scripts/workflow.py validate` | pass (pre-existing P26 kind + oversized-doc warnings only) |
  | round 04 §9 items **7, 8, 9, 10** | pass — Aside `--account u1`, dev **and** the production standalone build (see below) |
  | `grep '@media' web/src/app/kb-record-fixes.css` | 0 at-rules (one mention in the charter comment) |
  | `grep -r 'min-\[720px\]' web/src` | **0** (the last mention was a comment; reworded so §9 item 7's grep is clean) |
- **deviations:** none from `plan.md`'s scope. Five readings of the record and one in-passing bug fix are itemised under *Readings* and *The bug* below.
- **doc_impact:** two lines appended to `phase.md` `## Doc impact` — `frontend.md + experience.md` (the §4.4/§4.7/§4.8 layer + the new corrections sheet) and `security.md + frontend.md` (the `?next=` open-redirect guard).

---

## What landed

### The corrections sheet — `web/src/app/kb-record-fixes.css`

New, imported **last** in `globals.css` (after `graph-r5.css`), with a comment there telling S7/S8 to insert `kb-docview.css` / `kb-print.css` **before** it. The file opens with its charter verbatim from `phase.md` `## Decisions`: operator-authorised corrections to a signed record only, one comment per rule naming the round, the section, the gap and the authorisation date, no width `@media`.

It has **exactly one rule**:

```css
@container kbmain (width < 40rem) { .kb-appsearch__input { font-size: 1rem; } }
```

Round 03 §7 says "Inputs are 16px below 40rem. Non-negotiable"; §3's phone block raises only `.kb-field__input`, and the documents search box is `.kb-appsearch__input` (14.4px at 390 → iOS Safari zooms on focus). The sibling project filter is already 16px through `.kb-searchbar__filter .kb-field__input`, which is what makes this a miss rather than an intention. **Font-size only** — measured 16px at 390 and still 14.4px at 820, exactly like round 03's own rule. The at-rule mirrors §3's search block (`kbmain`), not a width media query. Nothing else was put in the file; every other gap in the notebook stays reported.

### §4.4 — one disclosure placement

The record puts the revealed form **as the next sibling of the head**, which no "replace the trigger in place" component can do. So each disclosure component now **renders its own head** and takes the server-rendered head content as `children`:

- `CreateProjectForm` renders `.kb-pageframe` (title wrap = `children`) + the `.kb-inlineform--framed` sibling; both land as direct children of the dashboard's `.kb-page-flow` (a fragment adds no element).
- `MintOrgKeyForm` / `MintCredentialForm` render `.kb-panel__head kb-panel__head--start` (`.kb-panel__headmain` = `children`) + the `.kb-inlineform` sibling, inside the panel, before the table.

Trigger behaviour on all three: never disappears, toggles `aria-expanded`, carries `aria-controls`, focus to the first field on open and **back to the trigger on close**. The error is the field's own always-rendered `.kb-field__error` (measured `min-height: 17.6px` = 1.1rem, so nothing moves). Actions are `.kb-form-actions kb-form-actions--end`.

The show-once reveal needed one structural change the record did not foresee — see *Readings* (3).

### §4.7 — the documents page

`.kb-searchbar__actions` as the third cell (the unstyled third child S2 left); `.kb-hintline` replacing the hand-rolled mono utilities; `.kb-snippet` with **real `<mark>`** styled by `.kb-snippet mark` (the rebuild-from-literal-markers logic untouched — still no `dangerouslySetInnerHTML`); `.kb-taglist` with three chips + a non-interactive `.kb-chip--more` whose `title` lists the hidden tags; `.kb-pager`; `.kb-confirm` on the delete row; `.kb-panel__caption` for the count; and the page wrapped in `.kb-page-flow` with its `mt-[var(--kb-space-md)]` blocks deleted. The hidden passthrough inputs and the Search/Reset pair — the whole no-JS path — are intact and were round-tripped as a real GET.

### §4.8 — the auth gate

`(auth)/layout.tsx` drops `grid min-h-dvh place-items-center px-6 py-14` for `.kb-authgate` + `.kb-authgate__wrap`; `auth-card.tsx` has **zero** inline styles left (measured: `document.querySelectorAll('.kb-authcard [style]').length === 0`) and returns a fragment, because the wrap now sizes the column. `credentials-form.tsx` renders `.kb-authcard__error` **always** (empty string when none) between the password field and the submit, with `aria-invalid` + `aria-describedby` on **both** inputs while it stands, cleared by typing in either; the submit is `.kb-authcard__submit` with `busy` (`aria-busy` + spinner, never `disabled`).

### D18's login half — the security-shaped piece

`web/src/lib/next-path.ts` exports `safeNextPath(raw) → string`, deliberately **not** `server-only` so the server bounce and the client navigation run the *same* function.

**The accepted shape, for `P28.S6` to match:** a same-origin relative path — one leading `/`, optional `?query` and `#hash`, re-serialised through `URL` so `/a/../b` normalises to `/b`. `publicBase = "/@{org}"`, so round 05's `/login?next={publicBase}/documents/{id}` → `/login?next=/@acme/documents/41` is accepted as-is (there is a test case for exactly that string).

**Rejected → `/dashboard`, never an exception:** anything not starting with `/`; `//host` and `/\host` (protocol-relative — a backslash anywhere is rejected); any control character or whitespace (parsers strip tab/newline *before* resolving); a repeated `?next=` (arrives as `string[]`); the empty value; and `/login` / `/signup` themselves, which are a redirect **loop** rather than an attack.

Wiring: `login/page.tsx` launders once at the boundary and passes the safe value to both `redirectIfAuthenticated(next)` and `<LoginForm next>`; `credentials-form.tsx` launders again before `router.replace()` (belt and braces on a client island whose props a future caller could set). `redirectIfAuthenticated()` with no argument is byte-identical in behaviour to before, so `signup/page.tsx` is untouched.

`web/tests/next-path.test.ts` — 25 cases, pure function, no fixtures, no rendering (the harness is `environment: "node"`).

### Finishing the 422

`loadDocuments` maps **422** alongside 404/400 to `notFound()`, and the header comment that contradicted the code is corrected with the reason. Verified live: `/documents?project=not-a-uuid` now renders `Not found · 404 / No such view / That project filter doesn't match a project in your org.` inside the shell, in dev **and** production. A valid-but-unknown UUID still 404s. **Both halves of the 422 gap are now closed** — the review has nothing to file.

### The busy conversion

`create-project-form`, `mint-org-key-form`, `mint-credential-form`, `revoke-org-key-button`, `revoke-credential-button`, `delete-document-button`, `credentials-form` — every one now uses `<AppButton busy>` and moves its double-submit guard into the handler (`onSubmit` early return on `pending` for the action forms, the existing `if (pending) return` for the fetch form). **No form is left unguarded.** The show-once reveal's Copy/Dismiss were already `AppButton`s.

---

## Readings of the record (none of them a new visual decision)

1. **The documents page joins `.kb-page-flow`.** §4.1 says every console page is one flow; S4 applied it to the dashboard and the project page, and this page — its own §4.7 file — had not been reached. Wrapping it and deleting its `mt-[var(--kb-space-md)]` is §4.1 applied where §4.1 says.
2. **The search bar and its hint line are ONE flow child.** §4.7 draws `<p class="kb-hintline">` as the form's next sibling and §3 gives it `margin-top: 0.6rem`; making both flow children would add the flow's gap on top and detach the caption from the bar. They share one class-less `<div>`. Nothing is drawn by it.
3. **The show-once reveal needed a portal root, and this is the one structural change §8's apply map ("nothing structural — the phone sheet is CSS only") did not foresee.** §4.4's phone sheet and round 03's `column-reverse` are both written `@container kbapp (width < 40rem)`, and the dialog portals to `<body>` — *outside* `.kb-app` — so **neither rule could ever match** and the bottom sheet would never have appeared. Portalling *into* `.kb-app` is not the fix: a container is a containing block for its `position: fixed` descendants, so the overlay would pin to the document instead of the screen (the same trap that keeps `.kb-toast-region` a sibling of `.kb-app`). The portal root therefore does both jobs — `position: fixed; inset: 0; z-index: 50` **and** `container-name: kbapp; container-type: inline-size` at the viewport's inline size — and `.kb-reveal-overlay` gets the record's own `position: absolute; inset: 0` back (the P12-era inline override on it is gone). Measured at 390: overlay `align-items: end`, padding 0, sheet 390px wide, radius `8.8px 8.8px 0 0`, key block `column` with Copy full width (328px), settled bottom **exactly 844** = the viewport bottom, wrapper z-index 50 over the navbar's 30.
4. **§4.4's drawn markup is followed where the repo had diverged:** the mint trigger is `.kb-appbtn--secondary` (was primary — §4.4 draws it, and secondary is the right weight for a panel-head action beside a page-level primary); **Copy moves inside `.kb-reveal__key`** with Dismiss alone in `.kb-reveal__actions` (which is what gives round 04's `.kb-reveal__key .kb-appbtn { width: 100% }` phone rule something to match — it had nothing before); the dialog gains `.kb-reveal-in`; the title is `h2` (the dialog portals to `<body>`, so there is no heading hierarchy to respect). Create-project's trigger stays **primary** — it is the page-frame action and §4.4's snippet is the mint case.
5. **The disclosure forms' field labels are VISIBLE** (`.kb-field__label`, not `sr-only`). §4.4 draws `<label class="kb-field">…</label>`, which in round 03 §3's vocabulary is label + input; and once §4.4 moves the form *out of the head*, the heading that used to stand in for the label is no longer beside it. This is P28.S4's `org-slug-form.tsx` precedent, same reasoning.
6. **`text-ink` would have been wrong on the gate, and the measurement said so.** The old layout carried an inline `color: var(--kb-ink)`, which matters: `body` resolves that token in the LIGHT scheme, so anything in the gate without its own colour inherits near-black ink onto the dark card. The obvious replacement `text-ink` computed **rgb(38,33,28)** — Tailwind substitutes `--color-ink` at `:root`, outside the element's `data-md-color-scheme="slate"` scope. `text-[var(--kb-ink)]` computes **rgb(236,228,215)**, correct. `.kb-authgate` sets no `color`, so the utility only adds (the phase's cascade rule).

## The bug this slice found and fixed

**Minting a PROJECT credential has been broken, and the diff could not have shown it.** `mintCredentialAction` reads `formData.get("projectId")` and returns its generic error when it is missing — but `mint-credential-form.tsx` declared the `projectId` prop, threaded it down from the page, and **never rendered the hidden input**. Confirmed pre-existing (`git show HEAD:…` has no hidden input either). Live symptom: "Could not create the key. Please try again." on every attempt. The org-key form, which needs no id, was unaffected. Fixed with the one input the prop was always for, and re-verified: the key mints, the form collapses, the reveal opens with focus on Copy, the trigger comes back with `aria-expanded="false"`.

## Browser verification

**Instrument: Aside, `repl` over Bash, `aside repl --account u1`** (never `u0`). Runtime per `docs/current/operations.md` → `## Operator Runtime`: dev `pnpm --dir web dev` → `http://127.0.0.1:3030` with the API on `127.0.0.1:8766`, **and** the production standalone build (`pnpm --dir web build` → `node .next/standalone/server.js` on `:3040`, same env).

Interaction was driven at **top level, 1440×900 native** (Aside's fixed viewport); narrow widths came from S2's iframe harness proxy, recreated at `/tmp/p28s5/vpproxy.py` and stopped afterwards. Layout there is trustworthy, interaction is not — so everything interactive below is a 1440 measurement, and everything at 390/820/1024 is layout/computed style. Real typing used `page.locator(sel).fill()` and `page.keyboard.type()` (both work; a synthetic `input` event once produced a false negative on the error-clear check, which real typing then disproved — the app was right, the probe was wrong).

### Round 04 §9 — the four items this slice owns

- **7 · Search and Reset at every width; `min-[720px]:` gone.** `.kb-searchbar__actions` renders `[BUTTON:Search, A:Reset]` at **390 · 820 · 1024 · 1440**. At 390 the bar is `flex-direction: column` and Search flexes (282px) while Reset keeps its intrinsic 66px. `grep -r 'min-\[720px\]' web/src` → **0**. **Pass.**
- **8 · real `<mark>`, three chips + `+2`.** On a 5-tag row: one `<mark>` element, computed `background rgba(15,111,102,.15)`, `color rgb(10,84,78)`, `border-radius 2px` — i.e. `.kb-snippet mark`, not an arbitrary. Chips `round04 · taglist · overflow · +2`, the marker a non-interactive `<span>` with `title="chips, phone"`. The snippet renders inside the title cell. **Pass.**
- **9 · every disclosure opens under its head, trigger visible; reveal centred above 40rem, bottom sheet below, clearing the navbar.** All three disclosures measured live: form is `head.nextElementSibling` / `flow.children[1]`, trigger still rendered with `aria-expanded="true"`, focus `INPUT#name` on open, `focusBack: true` on Cancel. Reveal at **1440**: `box {x:480, y:330, w:480, h:241}` in a 1440×900 viewport = centred modal, focus on Copy. Reveal at **390**: bottom-anchored full-width sheet, top corners only, settled bottom = 844, z-index 50 over the navbar's 30. At 390 the inline form is `max-width: none`, full panel width, actions `justify-content: stretch`, buttons 44px tall; the framed variant is full width with its own surface. **Pass.**
- **10 · 25rem card, always-present error slot, 390 stage padding + field floors.** 1440: card **400px** = 25rem, zero inline styles, error `min-height 18.4px` (1.15rem) with `role="alert"`, sitting between `.kb-field` and `.kb-appbtn…__submit`. Wrong credentials → the message appears and `submitTop` (552) and `cardH` (462) are **identical** before and after: no layout shift; both inputs go `aria-invalid="true"` with `aria-describedby` = the error's id; typing one character in the **email** field clears the text and both attributes on both inputs; the password is cleared on failure; the submit is never `disabled`. 390: wrap padding `35.2px 16.8px 41.6px` = 2.2 / 1.05 / 2.6rem, card padding 1.15/1.15/1.05rem, inputs **45px tall at 16px**, submit 44px, three trust chips on one centred line, none truncated. **Pass.**

### The plan's item-3 list

| check | result |
|---|---|
| no-JS search round-trips as a plain GET | **pass** — native `form.submit()` from `/documents?tag=round04&q=probe`: landed on `/documents?tag=round04&q=overflow&project=`, the hidden `tag` passthrough survived, 1 row server-rendered |
| disclosure opens below its head, trigger visible, focus in and back | **pass** — all three (see item 9) |
| reveal: centred modal / bottom sheet clearing the navbar | **pass** (see item 9) |
| auth error slot holds its height | **pass** — no layout shift, numbers above |
| search input is 16px at 390 | **pass** — 16px at 390, 14.4px at 820 (the rule is phone-only, like round 03's own) |
| Delete spans the card at 390 | **pass** — **290px** = the full cell, was 57.7px. S2's note is closed: the rule was right, the `inline-flex` wrapper was wrong |
| `?next=` round trip | **pass** — signed in at `/login?next=/documents?q=overflow`, landed on `/documents?q=overflow`; in production too |
| hostile `next` refused | **pass** — see the table below |

Signed-in bounce through `redirectIfAuthenticated`, live (dev), plus `https://evil.example` again in production:

```
next=/graph                 ->  /graph
next=https://evil.example/x ->  /dashboard
next=//evil.example         ->  /dashboard
next=/\evil.example         ->  /dashboard
next=javascript:alert(1)    ->  /dashboard
next=/login                 ->  /dashboard
```

Also measured at 390: the armed `.kb-confirm` is `display:flex`, full card width (290px), the prompt takes its own full-width line above two 142px buttons that split the row. The revoke confirm at 1440: children in the record's order `prompt · ghost:Cancel · danger:"Yes, revoke"`, focus lands on **Cancel**, the trigger is replaced in the same cell, cancelling returns focus to the trigger (whose `aria-label` carries the row subject).

### Production build

Rebuilt and run standalone on `:3040` against the same API and `SESSION_SECRET`. Re-checked: gate card 400px / 0 inline styles / error slot / slate ink / `kbauth` container; `?next=/documents` round trip; `next=https://evil.example` → `/dashboard`; documents page `.kb-page-flow` + `.kb-searchbar__actions` + `.kb-hintline` + `.kb-panel__caption`; `/documents?project=not-a-uuid` → the designed 404; create-project disclosure as the frame's next sibling with focus on the field. **No dev/production divergence.** Server stopped afterwards.

### What is NOT verified, stated plainly

- **`env(safe-area-inset-bottom)` in the sheet's bottom padding** resolves to `0px` on a desktop Chromium, so the padding was measured as the base `1.15rem`. The declaration is round 04 §3's verbatim and unmodified; whether it insets correctly needs a real notched device, and belongs to `P28.S9` or the operator's gate walk.
- **iOS Safari's actual zoom-on-focus behaviour.** What was proved is the input's computed `font-size: 16px` at a true 390 CSS viewport, which is the condition the record states. The zoom itself is an iOS behaviour and needs an iPhone.
- **Touch/pointer interaction at 390.** The harness gives a true CSS viewport but no touch input and no reliable hydration, so every phone-width number above is layout/computed style. The armed-confirm and open-disclosure geometry at 390 was measured on **injected** markup identical to what React renders (verified live at 1440) — stated here rather than implied.
- **`prefers-reduced-motion`.** Not re-checked; this slice added no keyframes, and `.kb-reveal-in` is round 03's `kb-rise`, already inside its `no-preference` guard (P28.S2's finding).

## Runtime left behind

`kb-p28s2-pg`, `web/.env.local`, uvicorn on 8766 and `next dev` on 3030 are all **up and healthy**, as found. The harness proxy and the standalone production server were stopped.

**One thing changed for later slices, and it is an improvement with a cost.** Testing the gate meant signing out, and the `p28s2@example.com` password is recorded nowhere — so that session is not recoverable. A **throwaway tenant with a known password** was built to replace it and is now the fixture tenant: `p28s5@example.com` / `p28s5-throwaway-pw`, org slug **`p28s5`**, projects `default · research · notes · handbook` (research is **public**), six documents including a deliberate **five-tag row** for the overflow marker, and an org key. The p28s2 tenant's data is untouched in the same database and still reachable anonymously at `/@p28s2/...`; only its *session* is gone. Details are in `phase.md`'s runtime note.
