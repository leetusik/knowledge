# Plan — P18.S3: Web app — org API keys panel + workspace→org copy

Operator-approved orchestrator plan (2026-07-22). Executor: `slice-executor-mid` (risk: medium). Read `../../phase.md` (Context, S1/S2 notes — S2's endpoint paths) and `../../intent.md`; re-verify anchors before editing.

## Goal

Web surface for S2's org-level vk_ keys, plus the product-facing "Workspace" → "Org" rename. Design stance (phase.md): reusing the P12 keys-table/mint-modal at org scope is the same visual language — **no Claude Design round, no new route/IA**. If you conclude a genuinely new-design surface is required, flag it in phase.md and STOP (escalate) rather than inventing visual design.

## Placement (decided)

**"Org API keys" panel on the dashboard** (`web/src/app/(app)/dashboard/page.tsx`) — full-width `kb-panel` below the projects/activity grid. No new route, no rail change. Project pages keep their per-project keys unchanged.

## Implementation

1. **BFF helpers** `web/src/lib/knowledge/app.ts` (+ `types.ts`): `listOrgCredentials(token)` → `GET /app/credentials`; `createOrgCredential(token, name?)` → `POST /app/credentials`; `revokeOrgCredential(token, credentialId)` → `DELETE /app/credentials/{id}` — mirror the existing project-credential helpers exactly. Credential type: `project_id: string | null`.
2. **Server actions** — new `web/src/app/(app)/dashboard/actions.ts`: `mintOrgCredentialAction` / `revokeOrgCredentialAction` copied from `projects/[projectId]/actions.ts`'s pattern (zod ids/name, `requireIdentity()` OUTSIDE try — redirect throws; status-mapped error copy; show-once plaintext key in action state; `revalidatePath("/dashboard", "page")`). Only async exports in a `"use server"` module (that file's NOTE explains why).
3. **Client islands** `web/src/app/(app)/dashboard/`: `mint-org-key-form.tsx` + `revoke-org-key-button.tsx` — page-local adaptations of the project ones (no projectId hidden input; show-once modal keyed on `ok`). Page-local copies are the established pattern; do not invent a shared abstraction.
4. **Dashboard page**: add the org-credentials fetch to the existing `Promise.all`; render the panel — heading + mint affordance, `DataTable` with name / `token_prefix` (mono) / created (`formatCreated`) / last used (`relativeTime`) / status (Active–Revoked) / revoke action. Reuse `DataTable`, `appButtonClass`, existing helpers.
5. **Copy** `web/src/content/*.ts` (labels only): new `DASHBOARD.orgKeys` section (heading, columns, empty, mint labels, show-once modal copy, error maps shaped like `MINT_CREDENTIAL_ERRORS`); rename `APP_SHELL.railHeading` + `APP_SHELL.workspaceLabel` → "Org"; `auth.ts` signup line → default-org+default-project wording; `workspace` tokens in `dashboard.ts` / `documents.ts`. Grep `-i workspace` across `web/src/` for stragglers. **Never** rename CSS classes, code identifiers, or marketing-landing copy (P20's).

## Out of scope

Any `server/**` change (S2 finished the backend), CLI/skills (S4), prod (S5), marketing landing (P20), org creation/invites (D14).

## Validation (run and record in result.md)

1. Web checks per `web/package.json` scripts — typecheck/lint + production build (note exact script names/outcomes).
2. If cheap, a local click-through (mint → show-once → revoke) against a dev backend; else state plainly build-verified-only (S5 covers live E2E).
3. `python3 scripts/plugin_parity.py` → 0 and `python3 scripts/skills_parity.py` → 0 (expected no-ops — no server/skill diffs).
4. `python3 scripts/workflow.py validate`.

## Wrap-up

`result.md` (what changed, validation outcomes, deviations); `phase.md` cross-slice notes (anything S4/S5/REVIEW must know) + one-line Doc impact entries (expect: frontend, experience, decisions). No commits, no status transitions, no doc versioning.
