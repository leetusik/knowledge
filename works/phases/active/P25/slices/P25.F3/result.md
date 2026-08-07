# Result — P25.F3: surface the unclaimed-slug state beside the copy affordances

Status: **done**. Web-only, three files, no new component, no backend change, no route
change, no new test.

## What landed

The defect was that a slug-less tenant's copy button hands out `/documents/{id}` (or
`/graph/{uuid}`) **silently**, so the operator reads a correctly-executing fallback as a
broken feature. The fix makes that state legible where it is felt — beside the button —
and only for the person who can fix it.

### 1. Copy (`web/src/content/share.ts`)

`SHARE` gained a `claimHint` block, split into `prefix` / `linkLabel` / `suffix` / `href`
because the middle part is an inline `<Link>` to the dashboard. Rendered it reads as one
short sentence:

> This link uses an id until you **claim a public URL name**.

"an id" (rather than "a numeric id") is deliberate: the same string serves the document
page, where the fallback is a rowid, and the graph header, where it is a tenant UUID.
No re-export change was needed — `content/index.ts` already exports `SHARE` / `ShareCopy`.

### 2. Document detail, member branch (`web/src/app/(public)/documents/[id]/page.tsx`)

Rendered inside the existing toolbar row (`flex flex-wrap items-center gap-3`), right
after `<CopyLinkButton>` and before the `ml-auto` delete control, so it wraps rather than
crowds. Condition:

```
ctx.identity.tenant?.slug == null && doc.canonical_path === null
```

The second clause is a **deviation from the plan** (see below): an ownership proxy.

### 3. Member graph header (`web/src/app/(app)/graph/page.tsx`)

The copy button is now wrapped in a `flex flex-col items-end gap-1.5` column so the hint
sits directly under it, right-aligned and capped at `18rem`. Condition is just
`identity.tenant?.slug == null` — this surface is always the viewer's own org, so no
proxy is needed. The whole block still hangs off the pre-existing `orgId ? … : null`
guard, so a tenant-less session is untouched.

### 4. Surfaces deliberately NOT touched

- **Both anonymous branches** (`(public)/documents/[id]`, `(public)/[org]/…`): a visitor
  cannot claim anything and already has the URL in the address bar. Per plan.
- **The pretty document page's member branch** (`(public)/[org]/[project]/[slug]`):
  inspected, and plan item 2 holds — reaching that route means a slug resolved, so the
  hint's condition can never be true there. Its `?? /documents/${doc.id}` is defensive
  only.
- **The dashboard**: its Public URL panel already self-describes and is the hint's target.
- **The F1 superseded-duplicate case**: a claimed slug with a `null` `canonical_path` gets
  **no** hint. That is exactly what the `slug == null` clause buys — the id URL is then
  correct and permanent for that row and there is nothing for the operator to do.

## Styling

No CSS was added. The hint is a `<span>` at `text-[0.8rem] text-[var(--kb-hint)]` with the
link at `text-[var(--kb-accent-strong)] underline underline-offset-2` — the same two
tokens and the same underline treatment `version-history.tsx` already uses for its inline
row links, so both tokens follow the light/dark theme automatically. This is a minor
affordance inside the existing design language; **no design decision was required and none
was invented**, so `needs_operator` was not triggered.

## Validation

| Command | Result |
|---|---|
| `cd web && npm run lint` | PASS (eslint, clean) |
| `cd web && npm run typecheck` | PASS (`tsc --noEmit`, clean) |
| `cd web && npm run build` | PASS — compiled, and the **route table is byte-identical** (no route added or moved) |
| `cd web && npm run test` | PASS — **15 files / 85 tests**, the S5 baseline, unchanged |
| `npx prettier --check` on the three touched files | PASS (all three clean — see note) |
| `python3 scripts/plugin_parity.py` | PASS (trivially — no `server/**` or `tests/**` file touched) |
| `python3 scripts/workflow.py validate` | PASS |

The Postgres-gated pytest suite was **not run and did not need to be**: this slice touches
no backend file, so F1's baseline (**125 passed** with Postgres, **83 passed / 42 skipped**
without) stands unchanged.

No test was added, per the plan and the workspace's "tests stay small" rule — there is no
rendering-test convention in this repo, and the change is a conditional render of static
copy.

## Deviations from `plan.md`

1. **The document-page condition carries a second clause.** The plan specifies
   `ctx.identity.tenant?.slug == null`, and its own item 5 asks that the doc-page hint
   "additionally require the viewer's tenant to own the doc", asserting that is already
   true by construction on the member branch. **It is not**: `_resolve_readable_doc` has a
   public-project fallback, and the page's own header comment says so — a cross-org member
   does reach another org's public doc on this route. The web plane has no ownership
   signal to test (`KbDocument` carries no `tenant_id`; the `/app` projector drops it), so
   I used `doc.canonical_path === null` as the proxy. It exactly excludes the case that
   would be misleading — another org's doc that *does* have a pretty path — at the cost of
   still showing the hint for another org's *slug-less* doc, where the sentence is at least
   true of the viewer's own links. Closing that residual edge would need a new backend
   field, which is out of this slice's scope.
2. **Graph header layout.** "Beside" was implemented as a right-aligned column (button
   above, hint below) rather than a horizontal row, because the header is a
   `justify-between` title/action bar and a sentence placed in-line there would squeeze the
   title on narrow viewports. The document page's hint is genuinely in-line, next to the
   button, as specified.

Nothing else departs from the plan: no backend change, no `CopyLinkButton` rework, no
dashboard change, no robots/sitemap, no new component.

## Doc impact

One line appended to `phase.md`'s Doc impact list (`experience.md`). Note that P25's
Doc-impact list was already **consolidated and closed** by the passing re-review, so this
note sits under a fresh `Actual (P25.F3)` heading and needs a **new** `experience` doc
version from whichever review pass closes the F3 round — it is not covered by
`experience` v0016.
