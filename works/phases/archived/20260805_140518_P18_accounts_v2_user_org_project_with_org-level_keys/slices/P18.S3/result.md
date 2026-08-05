# Result — P18.S3: Web app — org API keys panel + workspace→org copy

Executed 2026-07-22 by `slice-executor-mid`. Web-only slice; no `server/**`, no new
route, no new visual design. Design stance #6 honored — the Org API keys panel reuses
the P12 keys-table + mint-modal + revoke language at org scope, so **no Claude Design
round was needed** (I did not find a genuinely new-design surface; no escalation).

## What changed

### BFF helpers (`web/src/lib/knowledge/`)

- **`types.ts`** — `KbCredential.project_id` is now `string | null` (org keys serialize
  `null`; project-bound keys keep their UUID), per S2's cross-slice directive. Added a
  doc comment explaining the split.
- **`app.ts`** — three org-credential helpers mirroring the project ones, keyed to the
  org (no path project id): `listOrgCredentials(token)` → `GET /app/credentials`
  (`{credentials:[...]}` envelope, `?? []`), `createOrgCredential(token, name?)` →
  `POST /app/credentials` (returns the `{credential, key}` envelope WHOLE — show-once
  plaintext), `revokeOrgCredential(token, credentialId)` → `DELETE /app/credentials/{id}`
  (204 → void). Added `KbCredential` to the type import.

### Server actions (`web/src/app/(app)/dashboard/actions.ts`)

Appended `mintOrgCredentialAction` / `revokeOrgCredentialAction` to the existing
`"use server"` module (which already held `createProjectAction`). Copied from the
`projects/[projectId]/actions.ts` pattern: `requireIdentity()` OUTSIDE the try (redirect
throws), zod name/id validation, status-mapped error copy, show-once plaintext key in
the mint action state, `revalidatePath("/dashboard", "page")`. Mint has no `notFound`
case (an org key targets the always-existing caller tenant); revoke maps 404 →
`notFound`. Only async exports (state interfaces are types, erased before the loader).

### Client islands (`web/src/app/(app)/dashboard/`)

- **`mint-org-key-form.tsx`** (`MintOrgKeyForm`) — page-local copy of
  `MintCredentialForm` minus the `projectId` hidden input, with the `ShowOnceKey`
  portal modal inlined (page-local copies are the established pattern per plan; no
  shared abstraction invented). Reads `DASHBOARD.orgKeys.mint` / `.keyPanel`.
- **`revoke-org-key-button.tsx`** (`RevokeOrgKeyButton`) — page-local copy of
  `RevokeCredentialButton` with only a `credentialId` hidden input (org revoke is by id
  alone). Two-step inline confirm, terracotta `.kb-appbtn--danger`. Reads
  `DASHBOARD.orgKeys.revoke`.

### Dashboard page (`web/src/app/(app)/dashboard/page.tsx`)

- Added `listOrgCredentials(token)` as the third leg of the existing `Promise.all`.
- Added `orgKeyColumns` (name / `token_prefix…` mono / derived `Badge` status via the
  reused `credentialStatus` / created `formatCreated` / last-used `relativeTime` /
  revoke action) reusing the existing page helpers.
- Rendered a full-width **`Org API keys`** `kb-panel` (heading + lead + `MintOrgKeyForm`
  disclosure over a `DataTable`) BELOW the projects/activity grid. No rail change, no
  new route.

### Copy — Workspace → Org (labels only, `web/src/content/`)

- **`dashboard.ts`** — new `DASHBOARD.orgKeys` section (heading, lead, columns, empty,
  unnamed, three status labels, mint labels, show-once `keyPanel` copy, revoke copy);
  new status-keyed error maps `MINT_ORG_CREDENTIAL_ERRORS` /
  `REVOKE_ORG_CREDENTIAL_ERRORS` (shaped like `MINT_CREDENTIAL_ERRORS`). Renamed
  `eyebrow` + `sub` Workspace→Org.
- **`index.ts`** — barrel now re-exports the two new error maps.
- **`app.ts`** — `APP_SHELL.railHeading` + `APP_SHELL.workspaceLabel` values → "Org"
  (the `workspaceLabel` **key name is kept** — code identifiers are not renamed).
- **`auth.ts`** — login sub `workspace`→`org`; signup sub → "A default org and project
  are created for you automatically." (default-org+default-project wording).
- **`documents.ts`** (eyebrow, sub, 2 not-found subs), **`graph.ts`** (eyebrow, empty
  sub), **`project.ts`** (eyebrow "Org · Project", not-found sub) — all user-facing
  `workspace`→`org`.
- A `grep -rni workspace web/src/` sweep confirms the only remaining hits are code
  comments, the retained `workspaceLabel` identifier, and
  `content/marketing/content.ts:93` ("An authenticated workspace") — the P20 marketing
  landing copy, deliberately **out of scope**. No CSS class or code identifier renamed.

## Validation

| Command | Result |
| --- | --- |
| `pnpm --dir web typecheck` (`tsc --noEmit`) | PASS |
| `pnpm --dir web lint` (`eslint .`) | PASS |
| `pnpm --dir web build` (`next build`) | PASS — all 16 routes compiled, `/dashboard` still `ƒ` dynamic |
| `pnpm --dir web test` (`vitest run`) | PASS — 8 files / 58 tests (ran as a shared-type safety check; not required by plan) |
| `python3 scripts/plugin_parity.py` | PASS (no-op — no `server/**`/`tests/**` diff) |
| `python3 scripts/skills_parity.py` | PASS (no-op — no skill diff) |
| `python3 scripts/workflow.py validate` | PASS |

**Live click-through (mint → show-once → revoke): NOT run** — it needs a running dev
backend (Postgres control plane + KB API + `web` dev server), which isn't cheap in this
isolated executor context. Build-verified-only; **S5's extended `onboarding_smoke.py`
E2E covers the live org-key path** end-to-end. This is the same operator-residual shape
P16 recorded for its in-browser round-trip.

## Deviations from plan.md

1. **`dashboard/actions.ts` was appended to, not created new.** The plan said "new
   `dashboard/actions.ts`", but that file already exists (P12's `createProjectAction`).
   I added the two org actions to the existing `"use server"` module — one dashboard
   actions module, matching the established layout. No behavior change to the existing
   action.
2. **Project detail page (`projects/[projectId]/page.tsx`) got one type-forced line
   change.** Widening `KbCredential.project_id` to `string | null` broke the
   module-level `columns` array's `projectId={credential.project_id}` (prop wants
   `string`). Fixed with a type-narrow: `credential.revoked_at === null &&
   credential.project_id !== null` — behavior is identical (a project-detail credential
   is always project-bound, so `project_id` is never null there). I could not read it
   from the in-scope `project` because `columns` is module-scoped. This keeps the
   project page functionally unchanged as the plan requires.
3. **Error maps kept as separate top-level exports**, not nested inside
   `DASHBOARD.orgKeys`. The plan listed "error maps" under the `orgKeys` section, but
   the established convention (`CREATE_PROJECT_ERRORS`, `MINT_CREDENTIAL_ERRORS`,
   `REVOKE_CREDENTIAL_ERRORS`) is separate top-level consts imported by the action —
   I followed that convention ("shaped like `MINT_CREDENTIAL_ERRORS`") so the actions
   import them the same way. Display copy (heading/columns/labels/modal) lives inside
   `DASHBOARD.orgKeys` as the plan says.

No other deviations. No commits, no status transitions, no doc versioning (per plan).
