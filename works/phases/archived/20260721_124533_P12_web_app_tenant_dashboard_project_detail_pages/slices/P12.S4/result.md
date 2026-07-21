# P12.S4 result — Project detail: info + credentials + project usage

**Status: done.** Built the per-project page at `web/src/app/(app)/projects/[projectId]/`
— project info + credential management (mint show-once `vk_` key / list / revoke) + that
project's usage — frontend-only, no backend change. All four verification gates green.

## What I built

**Route `web/src/app/(app)/projects/[projectId]/` (new):**
- `page.tsx` — server component. **Single fetch** `getProjectUsage(token, id)` (knowledge's
  `/app/projects/{id}/usage` bundles `project` + `credentials` + usage — verified against
  `server/usage_api.py::_project_usage_response`, so no second call, cleaner than vocky's two).
  `requireIdentity()` destructured **outside** any try; `notFound()` isolated in a `loadProject`
  helper mapping `ApiError` **404 or 400 → `notFound()`** and rethrowing everything else. Header
  (`.kb-app-eyebrow`/`.kb-app-title` = project name/`.kb-app-sub` = created date) → `StatTiles`
  (4 tiles, Active = created−deleted, no deltas) → trend `.kb-panel` (`daily_counts.map(d=>d.searches)`)
  → credentials `.kb-panel` with the `.kb-dtable` (Name · Key `token_prefix…` · Status · Created ·
  Last used · Revoke). Static `metadata` (no `generateMetadata` — every fetch is `no-store`).
- `actions.ts` (`"use server"`) — `mintCredentialAction` + `revokeCredentialAction`. UUID-parse
  ids; `requireIdentity()` outside the try; status-mapped errors (**mint: 400 AND 422 → invalidName**
  because knowledge answers body-validation as 422, 401→sessionExpired, 404→notFound);
  `revalidatePath("/projects/[projectId]", "page")`. The plaintext `key` rides back only in the
  mint action-state return.
- `mint-credential-form.tsx` (`"use client"`) — the panel-head "New key" disclosure (S3 pattern) +
  `useActionState` + the `ShowOnceKey` show-once modal. `INITIAL_STATE` lives here (a `"use server"`
  file exports only async fns). Modal shown when `state.key` present **and `state.ok !== dismissedAt`**
  (dismissal keyed by the `ok` stamp, not a boolean). Collapse-on-success done inside the action
  transition (not a `useEffect`, per the repo's `react-hooks/set-state-in-effect` rule).
- `revoke-credential-button.tsx` (`"use client"`) — two-step inline confirm (not `window.confirm`),
  ids as hidden inputs, **terracotta `.kb-appbtn--danger`** (knowledge HAS the danger variant);
  already-revoked rows render no action.
- `not-found.tsx` — branded `.kb-empty` not-found (title + sub + back-to-dashboard link).

**Extended (S3 seams):**
- `web/src/lib/knowledge/app.ts` — `getProject` / `createCredential` (returns whole `{credential, key}`
  envelope, never unwrapped) / `revokeCredential` (204) / `getProjectUsage`. `encodeURIComponent`
  each id; `cache:"no-store"`; branch on `ApiError.status`.
- `web/src/lib/knowledge/types.ts` — `KbCredential` / `KbMintedCredential` / `KbProjectUsage`
  (reusing S3's `KbUsageWindow`/`KbUsageTotals`/`KbDailyCount`).
- `web/src/content/index.ts` — barrel-exports the new `project` module.

**New (pure logic + copy + test):**
- `web/src/lib/knowledge/credential-status.ts` — `credentialStatus()`: `revoked_at→revoked` (wins
  even if used) · else `last_used_at→active` · else `idle`. Pure module (no `server-only`).
- `web/src/content/project.ts` — the `PROJECT` copy + status-keyed `MINT_CREDENTIAL_ERRORS` /
  `REVOKE_CREDENTIAL_ERRORS`.
- `web/tests/credential-status.test.ts` — 3 terse cases (active / idle / revoked precedence).

## The show-once modal (security-sensitive core), as built

Behavior built from scratch (the KB handback ships no reveal JS; `.kb-reveal-overlay` is
`position:absolute`):
- **Real viewport modal** — `createPortal(..., document.body)` with the overlay's `position`
  overridden to `fixed` via **inline style** (the S2R rule: inline beats the unlayered `.kb-*`),
  `z-index:50`.
- **A11y** — `role="dialog"` + `aria-modal`, `aria-labelledby`/`aria-describedby`; a Tab focus-trap;
  **Escape-to-dismiss**; focus-in on mount, focus-return to the "New key" trigger on unmount
  (captured at mount to satisfy `react-hooks/exhaustive-deps`).
- **Copy** — `navigator.clipboard.writeText` with a `select-all` manual fallback; the catch sets a
  flag and **never logs the key**.
- **Scrim-click does NOT dismiss** — deliberate: an accidental outside click would destroy an
  unrecoverable key; Escape and the explicit Dismiss button are the only exits.

**Security invariants (grep-verified):** the `vk_` plaintext exists **only** in the client
action-state and the one-time render (`{value}` in `.kb-reveal__code`) + the sanctioned
`clipboard.writeText`. No `console.*`, `localStorage`, `sessionStorage`, `document.cookie`,
`window.location`, or `.href=` anywhere in the slice files. The credentials list only ever shows
`token_prefix`.

## Design fidelity

Composed entirely from the delivered `.kb-*` vocabulary (`.kb-panel`, `.kb-dtable`, `.kb-status--*`
via `Badge`, `.kb-reveal*`, `.kb-field*`, `.kb-appbtn--{primary,danger,ghost,sm}`, `.kb-empty`,
`.kb-tile*`, `.kb-trend*`) + `lucide-react` icons. **No project-detail specimen exists** in the
handback, so the page is a faithful composition following the dashboard card's patterns + vocky's
structure — no new visual design invented, no designed affordance simplified away. Reused S3's
`components/usage/` StatTiles + TrendChart as-is (one usage block → no `kb-trend-fill` gradient-id
collision). **Flagged for the phase review** as a composition (a future design pass may refine it).

## Verification

| Command | Result |
| --- | --- |
| `pnpm --dir web typecheck` | ✓ pass (tsc --noEmit clean) |
| `pnpm --dir web lint` | ✓ pass (0 errors, 0 warnings) |
| `pnpm --dir web test` | ✓ pass — 42 tests, 6 files (3 new credential-status cases; S2/S3 unchanged) |
| `pnpm --dir web build` | ✓ pass — `/projects/[projectId]` compiles as `ƒ` (Dynamic) |

**Interactive E2E not run** (needs a running backend + seeded login; knowledge has no host-mapped
Postgres — same limitation S3 recorded). The manual smoke — open a project, mint a key (shows once,
copy works, never re-reveals after dismiss/reload), revoke (row flips to Revoked), bad id → branded
not-found — is **left to the phase review**.

## Deviations from plan.md

- **None material.** One clarification: `TrendChart` in this repo (S3) takes `series`/`ariaLabel`/`empty`
  props with a fixed gradient id, and `StatTiles` takes a pre-computed `tiles` VM — not vocky's
  `heading`/`totals`/`window` prop shape. The page builds the tiles VM and series inline (exactly as
  S3's dashboard does) and reuses both components unchanged; the plan's "reuse as-is" intent holds,
  and with one usage block there is no gradient-id collision (no unique-id prop needed).
- `getProject` was added to `app.ts` per the plan (completeness/reuse) but the page does not call it —
  the single `getProjectUsage` fetch supplies the header too.

## Notes for S5 / the review

- The credentials `last_used_at` is the real ingest-recency stamp; live per-project **document totals**
  still await S5's control-plane UUID ↔ content-plane name bridge (the header shows the single project
  `name`, no slug/chip — the dashboard mock's chip was illustrative).
- Doc impact recorded in `phase.md`: `frontend.md` + `experience.md` (**no `api.md`** — no backend
  change). The review consolidates these into doc versions on a pass.
