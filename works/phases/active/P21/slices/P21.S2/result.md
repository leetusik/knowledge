# Result — P21.S2: Web delete action + confirm UI on the documents pages

Status: **done**. Everything in the plan landed as specified, in the shipped shape it
settled: one client wrapper, one `"use server"` action, one shared `"use client"`
island, both surfaces wired, copy as data, one terse test. No deviation of substance —
the only additions beyond the letter of the plan are two comment corrections and a
formatting nit (both below).

## What landed

**Client seam** — `web/src/lib/knowledge/app.ts`
`deleteDocument(token: string, id: number): Promise<void>` sits directly after
`getDocumentRaw`, over `sendJson<void>("/app/documents/${id}", "DELETE", undefined,
{ token })` (the `revokeCredential` 204 idiom; a numeric id has nothing to escape, so
it interpolates like `getDocument`). Its docblock records S1's contract verbatim:
session-only (no public fallback, unlike the GETs), 204 empty body, 401 unauthenticated,
404 for missing **and** cross-tenant, 422 for a non-integer id, no other status, hard and
**not idempotent**.

**Action** — `web/src/app/(app)/documents/actions.ts` (new, `"use server"`)
Exports exactly one async function, `deleteDocumentAction`, plus the `DeleteDocumentState`
type (types are erased, so they are safe in a `"use server"` module — the plan's known
runtime burn is re-stated in the header comment, and `INITIAL_STATE` lives in the island).
Shape mirrors `revokeCredentialAction`:

- `idSchema = z.coerce.number().int().positive()` on the `documentId` hidden input
  (formData yields strings);
- `redirectToSchema = z.literal("/documents")` on the optional `redirectTo` input — a
  literal, never a free-form string, so the hidden input can never become an open
  redirect; a failed parse simply means "stay put" (the list page's case);
- `await requireIdentity()` **outside** the try (its `redirect()` throws);
- `ApiError.status` mapping `400 || 422 → invalidRequest`, `401 → sessionExpired`,
  `404 → notFound`, everything else `generic`;
- on success: `revalidatePath("/documents", "page")` **and**
  `revalidatePath("/documents/[id]", "page")` (route patterns + the `"page"` type arg —
  the concrete path would revalidate nothing), then, **outside the try**,
  `if (redirectTo.success) redirect(redirectTo.data)`, then
  `return { error: null, ok: Date.now() }`.

**Island** — `web/src/app/(app)/documents/delete-document-button.tsx` (new, `"use client"`)
Near-copy of `revoke-credential-button.tsx`: `useActionState`, hidden inputs
(`documentId`, and `redirectTo` only when the prop is set), `useState` two-step inline
confirm (not `window.confirm`), `appButtonClass("danger","sm")` confirm /
`("ghost","sm")` cancel, pending label, `role="alert"` error paragraph wired through
`aria-describedby`, `aria-label` = `${ariaLabelPrefix} ${documentTitle}`. Props are
`documentId: number`, `documentTitle: string`, `redirectTo?: "/documents"` — the token
never comes near it.

**List page** — `web/src/app/(app)/documents/page.tsx`
Fifth column per the project-page precedent: `key: "action"`, `actions: true`,
`header: <span className="sr-only">{DOCUMENTS.list.columns.actions}</span>`, cell renders
`<DeleteDocumentButton documentId={row.id} documentTitle={row.title} />` (no `redirectTo`).
The header comment was rewritten: the "server component throughout with NO client island"
and "READ + SEARCH ONLY" claims are gone, replaced by the accurate statement that each row
now carries one island whose write goes through the `"use server"` action to the unmetered
`/app` plane — still nothing on the metered `vk_`-keyed `/api/*` machine plane.

**Detail page** — `web/src/app/(public)/documents/[id]/page.tsx`
Member branch only: a third child of the back-link/`CopyLinkButton` flex row, wrapped in
`<div className="ml-auto">` for trailing placement, passing `redirectTo="/documents"`.
The anonymous branch and `document-view.tsx` are untouched. The accepted gap (a member
viewing another org's public doc sees the button and gets the 404 copy) is recorded in the
JSX comment.

**Copy** — `web/src/content/documents.ts` + the `web/src/content/index.ts` barrel
Module-level `DELETE_DOCUMENT_ERRORS` (invalidRequest / sessionExpired / notFound /
generic — `notFound` explicitly covers both 404 causes), a `DOCUMENTS.delete` block
(label / confirmPrompt / confirmLabel / cancelLabel / pendingLabel / ariaLabelPrefix)
mirroring `PROJECT.revoke`, and `DOCUMENTS.list.columns.actions` for the sr-only header.
The confirm prompt is **"Delete permanently? This can't be undone."** — hard-delete stated,
no recoverability promised anywhere in the block.

**Test** — `web/tests/delete-document.test.ts` (new, one case)
Node-env vitest, no JSX, `vi.stubGlobal("fetch", …)` per the `raw-route.test.ts` style:
asserts `deleteDocument` issues `DELETE http://kb.test:8766/app/documents/42` with
`cache: "no-store"`, no body, and `Authorization: Bearer …`, and resolves `undefined` on a
204. Nothing more — no `next/cache` mock scaffold.

## Validation

All from `web/` unless noted; package manager is pnpm (per `packageManager`).

| Command | Result |
| --- | --- |
| `pnpm vitest run` (= `npm test`) | **PASS** — 10 files, **69 tests passed**, 0 failed (was 9 files / 68 before; the new file adds 1) |
| `pnpm lint` (`eslint .`) | **PASS** — clean, no output |
| `pnpm typecheck` (`tsc --noEmit`) | **PASS** — clean |
| `pnpm build` (`next build`, Next 16.2.10 + Turbopack) | **PASS** — compiled in ~1.5s, TypeScript OK, 11/11 static pages generated; `/documents` and `/documents/[id]` both still `ƒ` (dynamic), route table otherwise unchanged |
| `python3 scripts/plugin_parity.py` (repo root) | **PASS** — "plugin templates are in parity with the repo" |
| `python3 scripts/workflow.py validate` (repo root) | **PASS** |

**Plugin mirroring: not applicable, verified rather than assumed.**
`plugin/templates/manifest.json` ships `server`, `tests`, `scripts`, `docs/*` and a handful
of root files — there is **no `web`** entry in `shipped_dirs` and no `web/…` path in
`files.identical`, and `plugin/templates/kb/` has no `web/` directory. This slice is
web-only, so nothing was mirrored; the parity gate is green as-is.

**Prettier note (pre-existing repo state, not a regression).** `pnpm format:check` fails on
this repo at HEAD — **51 files** on a clean tree, 54 with this slice's edits. I did not
reformat the repo (that would churn unrelated files). Instead I confirmed every file I
touched or created is *individually* prettier-clean where it is mine: all four new/edited
files that were clean stay clean, and the two new-file nits prettier flagged (a >80-char
copy string, a long `vitest` import) were fixed. The three files still flagged
(`documents/page.tsx`, `content/documents.ts`, `lib/knowledge/app.ts`) are flagged **only on
pre-existing lines** — verified by diffing `npx prettier <file>` against the file and
checking each hunk is outside my edits.

## Deviations from `plan.md`

1. **Detail-page header comment corrected too** (the plan named only the list page's).
   `(public)/documents/[id]/page.tsx` opened with "still READ-ONLY (writes stay on the
   `vk_`-keyed `/api/*` machine surface)", which this slice makes false for the member
   branch. Rewritten to name the one write and the plane it uses. Comment-only.
2. **`ml-auto` applied via a wrapper `<div>`**, not on the island's own `<form>`. The plan
   said "`ml-auto` for trailing placement is fine" without fixing the mechanism; a wrapper
   keeps the island's prop surface at three props and its class list identical to the
   revoke precedent, instead of adding a `className` passthrough prop used by one caller.
3. **Two prettier-only line reflows** in my own new lines (see the note above). No
   behavior.

Nothing else departs from the plan: no `server/` or `tests/` (repo-root) edits, no
`document-view.tsx`, no anonymous-branch change, no pager/offset reconciliation.

## For REVIEW

- **Behavioral (unautomated) check worth doing live**, since the test suite covers only the
  client seam: delete from the **list** (row disappears after revalidate, no navigation),
  delete from the **detail page** (lands on `/documents`, the deleted doc absent), and a
  **double submit / stale page** (second delete of the same id shows the `notFound` copy —
  the endpoint is not idempotent).
- **Accepted, plan-sanctioned gaps** (not defects): (a) deleting the last row of a paged
  view can revalidate onto an empty page — no offset reconciliation, out of scope; (b) a
  member viewing another org's **public** document sees the delete button and gets the 404
  copy on submit — there is no client-side tenant signal, and the backend is
  404-never-403 by design.
- **New precedent to sanity-check:** `redirect()` inside a server action after
  `revalidatePath`, guarded by a `z.literal` (never a free-form redirect target), placed
  outside the try/catch so NEXT_REDIRECT is not swallowed. Also new: a `(public)` page
  importing a client island + server action from the `(app)` route group (legal, and the
  build confirms it).
- **Repo-wide prettier drift predates this phase** (51 files on a clean tree). Possibly a
  `P21.F*` or a deferred job if the operator wants `format:check` to be a real gate — this
  slice deliberately did not widen or narrow it.
