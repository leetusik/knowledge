# Result — P25.REVIEW (third pass, F3 + F4): phase review of "Pretty public share URLs"

**Verdict: `pass`.** Both post-cutover fixes are real and correct — verified by reading the
code and running the tests that pin them, not by taking the fix slices' word for it. The
consolidated validation was re-run on final HEAD (including the gated pytest suite, even
though no backend file changed) and is green throughout. The F3/F4 round's Doc-impact notes
were consolidated into **three** new doc versions (`experience` v0017, `frontend` v0016,
`qa` v0015); the second pass's nine versions stand untouched, since both fixes are `web/`-only.

This file **replaces** the second pass's result. That pass's evidence is preserved in
`phase.md` (§ *Found by P25.REVIEW (re-review pass)* and the closed Doc-impact block), and
§ 5 below records its consolidation inventory in one line so nothing is lost.

---

## 1. Consolidated validation on final HEAD (`f5a7017`) — all green

Disposable `postgres:17` on host port 55439 (`docker run … -p 55439:5432`, S1's recipe;
55432 is occupied on this machine), torn down afterwards. Repo `.venv` throughout.

| # | Command | Result |
|---|---|---|
| 1 | `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb .venv/bin/python -m pytest -q` | **125 passed** — the F1 baseline; the gated suite **RAN**, it did not skip |
| 2 | `.venv/bin/python -m pytest -q` (no DSN) | **83 passed / 42 skipped** — clean skip path, matches baseline |
| 3 | `cd web && npm run lint` | passed (eslint, no output) |
| 4 | `cd web && npm run typecheck` | passed (`tsc --noEmit`) |
| 5 | `cd web && npm run build` | passed — both new routes present, dynamic-route order byte-identical to the second pass (§ 1.1) |
| 6 | `cd web && npm run test` | **16 files / 88 tests passed** — the expected F4 baseline (was 15 / 85) |
| 7 | `.venv/bin/python scripts/plugin_parity.py` | **PASS** |
| 8 | `.venv/bin/python scripts/skills_parity.py` | **PASS** |
| 9 | `python3 scripts/workflow.py validate` | **Workflow validation passed** (re-run after the doc consolidation too) |

**One gated pytest run this round, deliberately** — the plan's own instruction, and it is
sound: `git show --stat` on both commits confirms neither touched `server/**`, `tests/**`,
`alembic/**` or `plugin/**` (F3: three `web/src` files + works notes; F4: two `web/src`
files + one new `web/tests` file + works notes). The double gated run exists to prove
globally-unique-slug re-runnability, which no `web/`-only change can affect; the alembic
round-trip likewise needs no third repetition (`0005` is untouched since F1).

### 1.1 Route precedence — unchanged, read out of the built manifest

```
/api/documents/[id]/raw
/api/documents/[id]/versions/[v]/raw
/documents/[id]
/documents/[id]/versions/[v]
/graph/[org]                  ^/graph/([^/]+?)(?:/)?$
/projects/[projectId]
/[org]/graph                  ^/([^/]+?)/graph(?:/)?$        ← after /graph/[org]
/[org]/[project]/[slug]       ^/([^/]+?)/([^/]+?)/([^/]+?)$  ← still LAST
```

Byte-identical to both earlier passes — expected, since neither fix adds or moves a route.
No `next start` probe was repeated this round: with the manifest identical and no routing
code touched, it would re-derive a fact already established twice.

---

## 2. The two fixes — both verified independently

### P25.F3 — the unclaimed-slug share hint: **correct**

- **Copy is data.** `SHARE.claimHint` in `web/src/content/share.ts` (`prefix` / `linkLabel` /
  `suffix` / `href`), split because the middle is an inline `<Link href="/dashboard">`. No
  string is inlined in either page. Convention held.
- **The graph header's condition is `identity.tenant?.slug == null`**, inside the pre-existing
  `orgId ? … : null` guard — that surface is always the viewer's own org, so no proxy is
  needed and a tenant-less session is untouched. The button still copies
  `graph.canonical_path ?? /graph/{orgId}`; the fix is purely additive.
- **The document page's condition is `ctx.identity.tenant?.slug == null && doc.canonical_path
  === null`**, on the member branch only. The second clause is the plan deviation F3 declared,
  and it is the *right* call: the plan asserted this branch is own-tenant by construction, and
  it is not — `_resolve_readable_doc`'s public-project fallback lets a cross-org member read
  another org's public doc here, and `KbDocument` carries no `tenant_id` to test. The proxy
  excludes the genuinely misleading case (another org's doc that *does* have a pretty path).
- **The three quiet-keeping rules hold**, which is what makes this a hint rather than noise:
  shown only to someone who can act (the viewer's own slug, never the document's), never once
  a slug is claimed (a `null` path under a claimed slug is the F1 superseded case — nothing to
  fix), never on an anonymous branch. The pretty document page carries no hint: reaching that
  route means a slug resolved, so the condition is unsatisfiable there — checked in the file.
- **No CSS, no new component**: `--kb-hint` + `--kb-accent-strong` with
  `underline underline-offset-2`, the treatment `version-history.tsx` already uses, so it
  themes automatically. Nothing here is a design decision, so the `design-cowork` gate does
  not apply — agreed with F3's own reading.
- **Residual edge, recorded not filed:** a cross-org member on *another* slug-less org's
  public doc still sees the hint, where claiming their own name cannot make that link pretty.
  The sentence stays true of their own links, the case needs two orgs and a slug-less peer,
  and closing it requires a new backend ownership field. Recorded in `experience.md` v0017
  and `phase.md`; not a finding.

### P25.F4 — the explainer height handshake: **correct, and the fix is complete on both sides**

- **The race is real and the diagnosis matches the code.** The frame's `src` is in the SSR
  HTML, the child posts its height once, and the reporter's `last` dedupe makes a missed first
  message permanent — so the frame keeps `explainer.css`'s fallback height and scrolls
  internally. F4 reproduced it deterministically under `Emulation.setCPUThrottlingRate ≥ 4`
  (549px vs 9,268px, `data-measured` absent, un-wedged by a resize) on **every** article view.
- **Both orderings of the race are covered, with no gap** — I traced this rather than assume
  it. The parent posts `kb-explainer-request` (a) in the `useEffect`, immediately *after*
  `addEventListener("message", …)`, and (b) from the iframe's `onLoad`. If the frame already
  loaded before hydration, (a) reaches it and `onLoad` will not fire again; if it had not,
  (a) lands on the blank initial window and is lost, but (b) fires later — and React attaches
  `onLoad` during the hydration commit, before effects run, so it cannot be missed. If the
  child's script has not parsed when a request arrives, the child's own load-time post reaches
  a parent listener that is by then attached. Every path ends in a measured frame.
- **The dedupe bypass is exactly one trigger, and it cannot loop.** The child's handler
  ignores anything whose `e.source !== window.parent` or whose shape is wrong, then resets
  **`last` only, never `budget`** — a runaway document stays latched, and load/resize/
  `ResizeObserver`/fonts still require a real ≥2px change. F4's live instrumentation (exactly
  two height messages; identical applied height at t+4s and t+8s) corroborates the reading.
- **Every trust safeguard is verbatim**, checked line by line against the diff:
  `sandbox="allow-scripts"` without `allow-same-origin` (P16 pinned decision 1), the
  `event.source === frame.contentWindow` identity check (never `event.origin` — `"null"` for
  an opaque origin), the shape check, the clamp, `referrerPolicy="no-referrer"`. The outbound
  request carries no data and reaches one frame's window; `targetOrigin: "*"` is forced by the
  opaque origin, not laziness. No CSP, relay, route, header, layout or CSS change.
- **"One fix covers every article view" is structurally true, not just empirically.** Both raw
  relays call the same `injectHeightReporter` (`api/documents/[id]/raw:96`,
  `.../versions/[v]/raw:83`), and `ExplainerFrame` has three call sites through one component:
  `document-view.tsx` (shared by the id page and the pretty page) and the versions page.
- **The new test is a real guard.** `web/tests/explainer-reporter.test.ts` *executes* the
  injected reporter via `new Function("window","document",src)` against a hand-rolled
  window/document — no jsdom added to a node-environment suite — and pins report-once/dedupe,
  the parent-request re-post, and rejection of a non-parent sender or malformed payload. F4
  recorded a negative control (case 2 red with `explainer-height.ts` stashed, then restored);
  a review may not edit source, so I verified by reading the handler and running the suite.

---

## 3. Judgment against intent — unchanged, and now honest in production

`intent.md`'s confirmed intent was already fully met at the second pass (durable Postgres org
slug; slug-addressed documents and public graph, subsuming D19; old links redirecting rather
than breaking; share affordances handing out the pretty URL). Neither F3 nor F4 changes any
of that — they close the gap between what the phase built and what the operator actually
experienced on the live site:

- F3 answers the one thing the phase's design did not: **before a name is claimed, the whole
  feature is invisible and looks broken.** The fix is the smallest honest one — say so, once,
  to the person who can claim it. No behavior, route or payload changed.
- F4 fixes a pre-existing defect the cutover *surfaced* rather than caused (the handshake
  predates P25). It is in scope for this phase's review because it landed as a P25 fix slice
  and because P25's own pretty page renders the same frame.

The four load-bearing constraints are untouched by this round and still hold: **no link
breaks** (no redirect or path logic changed), **404-never-403** (no new anonymous surface, no
new upstream call — the hint is conditional static copy on a member branch only), **nothing
durable keys off `documents.id`**, and **slug-less tenants see today's behavior** — with the
one deliberate, visible amendment that a slug-less tenant's *members* now see a sentence
telling them why. Nothing out of scope was built: `robots.ts`, `sitemap.ts`, the
`next.config.ts` header exemptions and `deploy/knowledge.conf` remain untouched, and no
backend file changed in either fix.

---

## 4. A real doc gap found and closed

`frontend.md` still carried P16's statement that there is **no `postMessage` height
handshake** — while the product has had one since `1d59d6b` ("size the explainer iframe to
its content"), a fix committed **outside the slice workflow**, which therefore left no
Doc-impact note and never reached the docs. Documenting F4's child-ward message on top of an
undocumented channel would have been incoherent, so the `frontend` version documents the
whole handshake and marks the stale P16 bullet superseded. Recorded in `phase.md` as a
standing lesson: an out-of-workflow fix leaves no Doc-impact note, so its truth never lands.

## 5. Doc consolidation — three versions (this phase is NOT in parallel mode)

`phase.json` carries no `execution` block, so consolidation belongs here. Only the **F3/F4
round** was consolidated: `phase.md`'s Doc-impact list marks everything above it CLOSED by the
second pass (`product` v0013, `api` v0018, `data` v0012, `backend` v0013, `architecture`
v0017, `frontend` v0015, `experience` v0016, `qa` v0014, `decisions` v0021 — inventory
preserved there). I re-checked the earlier docs for a gap this round would need to reopen and
found none: both fixes are `web/`-only, so the API, data, backend, architecture, product and
decisions truth is unchanged.

| Doc | New version | What it captures |
|---|---|---|
| `experience` | **v0017** | The claim hint as an experience fact: what it says, where it appears (member document read view + member graph header), and the three rules that keep it quiet (only the person who can act; never once a name is claimed — the F1 superseded case; never anonymous). Status paragraph amended: an unclaimed org no longer sees *byte-identical* pre-P25 behavior, and that is deliberate. Adds the cross-org residual edge as a recorded edge beside the member-previews-the-graph one. |
| `frontend` | **v0016** | A new **The explainer height handshake (`web/`)** section — the previously undocumented channel: all three messages, injection-by-relay rationale, the F4 hydration race and the two-sided fix, why `targetOrigin:"*"` is mandatory, why the request is the only dedupe bypass, the verbatim trust safeguards, and the child's measurement rules (body box, no rAF). Marks the stale P16 fixed-height bullet superseded. Adds the F3 hint conditions incl. the ownership-proxy rule ("add a backend field, do not infer in TypeScript"), and moves the validation baseline to 16 / 88. |
| `qa` | **v0015** | Status + P25 acceptance updated to the post-cutover re-run (gated 125, ungated 83/42, web **16 files / 88 tests**). Three new techniques: the CDP CPU-throttle repro recipe with its three traps (`Origin`-less login 403, `contextId` cannot reach an opaque-origin frame, scratch `KB_ROOT` for a versions test); "do not believe a client-island bug is branch-specific without re-testing under throttle"; and executing an injected script under vitest without jsdom. Sharpens the prettier rule with F3's counter-example (check the *specific* file — three touched files were clean). |

`python3 scripts/workflow.py rebuild-docs` was run **once** at the end; `docs/current/*.md`
and `docs/index.json` are regenerated, never hand-edited. `validate` passed afterwards.

---

## 6. Verdict

**`pass`.** Both post-cutover fixes verified correct and complete, all validation green on
final HEAD, intent still fully met, the F3/F4 doc round consolidated (plus one genuine
pre-existing doc gap closed).

`explain: not written — run /explain for this phase` (the review writes no phase explainer).

## 7. Deviations from `plan.md`

1. **One gated pytest run, not two, and no alembic round-trip or `next start` probe** — the
   plan's third-round instruction, justified above (§ 1): both commits are `web/`-only, so the
   re-runnability and migration properties those repetitions prove cannot have changed. The
   built route manifest was still read and compared.
2. **F4's negative control was not repeated** — it requires stashing source, which a review
   slice may not do. Verified instead by reading the handler and running the suite.
3. **The `frontend` version documents more than the F3/F4 notes asked**, because documenting
   the new child-ward message on top of a channel the docs denied existed would have been
   incoherent (§ 4). This is the "unless you find a real gap" carve-out in the plan.
4. No source code was edited on this slice. The only repo writes are the three new files under
   `docs/versions/`, the regenerated `docs/current/*` + `docs/index.json`, this `result.md`,
   and the `phase.md` notes.
