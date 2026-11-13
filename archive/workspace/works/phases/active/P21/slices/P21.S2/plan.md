# Plan — P21.S2: Web delete action + confirm UI on the documents pages

Context: read `../../phase.md` (Findings & Notes + S1's appended notes) first. S1 shipped the backend contract: `DELETE /app/documents/{doc_id}` → **204 empty body** on success; **401** without a session; **404** for a missing id *and* a cross-tenant id (indistinguishable — one copy string covers both); no other status (a failed git commit still answers 204); **not idempotent** (repeat delete → 404). `doc_id` is the numeric id already on `row.id` and the detail page. FastAPI's int-typed path param means a non-integer id answers **422** — fold it into the invalid-request copy.

## Goal

Let a logged-in member delete a document from the documents **list page** and the **detail page's member branch**, with a two-step inline confirm, following the revoke-credential patterns exactly.

## Decisions (settled here)

1. **One action, one island, shared by both pages.** New `web/src/app/(app)/documents/actions.ts` (`"use server"`) exporting only async `deleteDocumentAction`; new `web/src/app/(app)/documents/delete-document-button.tsx` (`"use client"`) used by both pages (route groups don't restrict imports). The island passes an optional `redirectTo` hidden input: the detail page sets `redirectTo="/documents"`, the list page omits it.
2. **Redirect is new precedent, done carefully:** in the action, after a successful delete, `revalidatePath("/documents", "page")` and `revalidatePath("/documents/[id]", "page")`, then — only when `redirectTo` parsed to the literal `"/documents"` (validate with a zod literal/enum, never redirect to an arbitrary string) — call `redirect(...)` **outside the try/catch** (it throws NEXT_REDIRECT; a catch would swallow it). Once redirect fires the island's error UI can't render — fine, errors return before it.

## Build

- **Client wrapper** — `web/src/lib/knowledge/app.ts`, documents block after `getDocumentRaw`:
  `export async function deleteDocument(token: string, id: number): Promise<void>` → `await sendJson<void>(`/app/documents/${id}`, "DELETE", undefined, { token })` (numeric id, nothing to escape — keep the house comment style; token required).
- **Action** — mirror `revokeCredentialAction` (`web/src/app/(app)/projects/[projectId]/actions.ts:156`): id schema `z.coerce.number().int().positive()` (formData yields strings); `await requireIdentity()` **outside** the try; `ApiError.status` mapping: `400 || 422` → invalidRequest, 401 → sessionExpired, 404 → notFound, else generic; success returns `{ error: null, ok: Date.now() }` (list) or redirects (detail). Export the state interface; `INITIAL_STATE` lives in the island (a `"use server"` module may export only async functions — known runtime burn).
- **Island** — near-copy of `revoke-credential-button.tsx`: `useActionState`, hidden inputs (`documentId`, optional `redirectTo`), `useState` two-step confirm (not `window.confirm`), `appButtonClass("danger","sm")` confirm / `("ghost","sm")` cancel, pending labels, `role="alert"` + `aria-describedby` error, `aria-label` built from the doc title. Props: `documentId: number`, `documentTitle: string`, `redirectTo?: "/documents"` — never pass the token.
- **List page** — `web/src/app/(app)/documents/page.tsx`: add a 5th column to `columns(...)` per the project-page precedent (`{ key: "action", actions: true, header: <span className="sr-only">…</span>, cell: (row) => <DeleteDocumentButton documentId={row.id} documentTitle={row.title} /> }`). **Rewrite the header comment (~L34-45)** — its "server component throughout, NO client island, READ + SEARCH ONLY" claims become false; state the new truth (one delete island; writes go through the `"use server"` action, still nothing on the metered `/api` plane).
- **Detail page** — `web/src/app/(public)/documents/[id]/page.tsx` member branch only (`if (ctx)`, ~L77-97): add `<DeleteDocumentButton documentId={id} documentTitle={doc.title} redirectTo="/documents" />` as a third child of the back-link/CopyLinkButton flex row (`ml-auto` for trailing placement is fine). Never touch the anonymous branch or `document-view.tsx`. Known accepted gap: a member viewing another tenant's public doc sees the button and gets the 404 copy — no client-side tenant signal exists; the copy ("That document no longer exists…") is the fallback.
- **Copy** — `web/src/content/documents.ts`: module-level `export const DELETE_DOCUMENT_ERRORS = {...} as const` (invalidRequest / sessionExpired / notFound / generic — mirror `REVOKE_CREDENTIAL_ERRORS`, `project.ts:29`) plus a `delete: { label, confirmPrompt, confirmLabel, cancelLabel, pendingLabel, ariaLabelPrefix }` block inside `DOCUMENTS` (mirror `PROJECT.revoke`). Copy must convey hard-delete/no-undo and must not promise recoverability. Extend the barrel `web/src/content/index.ts`.
- **Test** — one terse `web/tests/delete-document.test.ts` (node-env vitest, no JSX): stub `global.fetch` per `knowledge-auth.test.ts` style; assert `deleteDocument` sends `DELETE /app/documents/{id}` with the bearer token and resolves `undefined` on 204. Nothing more (the action's plumbing is covered by convention; don't build a mock scaffold for `next/cache`).

## Validation

From `web/`: `npm test` (vitest), `npm run lint`, `npm run build` (or the repo's typecheck script if build is too heavy — check package.json scripts and report what you ran). Also run `python3 scripts/plugin_parity.py` from the repo root — S1 learned the plugin template mirrors some trees; verify whether `web/` is shipped in `plugin/templates/kb/` and mirror your edits if (and only if) the manifest includes them.

## Out of scope

No server/ changes (S1 landed the endpoint). No pager/offset reconciliation for deleting the last row of a page (revalidate may land on an empty page — accepted, noted for REVIEW). Doc impact: append one-line notes to `phase.md` (`frontend.md`/`experience.md`: delete action + two-step confirm on both documents surfaces; the list page is no longer island-free).
