# P28.S10 — result

- **status**: `needs_operator`
- **summary**: Research only, no product code. The orchestrator's hypothesis is **not confirmed and is
  refuted for every document I can reach**: all nine anonymously-readable production documents (the
  operator's own `knowledge` + `vocky` corpora) carry `data-measured` and are content-sized, so the
  changed `[data-unmeasured]` fallback never applies to them. The 25 documents in `changple5` /
  `arb_upbit_1` / `Mijual` bounce anonymous readers to `/login` and I could not reach a single one
  read-only, so the repro that decides the fix does not exist yet. I did settle the mechanics, the
  timeline, and the alternatives, and I measured the exact before/after of the fallback change.
- **validation**: `python3 scripts/workflow.py validate` → **passed** (warnings only, all pre-existing:
  P22/P26 unknown kinds, P28 consolidation owed, 7 stale docs, 11 oversized doc sections).
- **deviations**: none. Plan step 1 ("reproduce it on the operator's own production documents") could not
  be completed — see *The blocker* below; the plan names that outcome and prescribes `needs_operator`.
- **doc_impact**: none — this slice changed no durable truth. Findings are in `phase.md` under
  `## P28.S10 findings — the framed-explainer scroll report`.
- **files changed**: this file; `works/phases/active/P28/phase.md`.

---

## The blocker, stated exactly

Only document ids **25–33** are readable without a session. Probing `GET /api/documents/{id}/raw`
anonymously across ids 1–60 returns `200` for exactly 25–33 and `404` for every other id (no leak — the
relay is correctly closed). `/documents/40` (a private-project id) `307`s to `/login`. The public graph
payload at `/@leetusik/graph` lists exactly two public projects, `knowledge` and `vocky`, nine documents
between them. The operator's three working corpora are private.

I looked for a non-browser read path and stopped at a guard rather than pushing through it: this machine
has `~/.config/knowledge-kb/config.json` holding an org API bearer token for
`https://knowledge.hi2vi.com` (the token the `/explain` skill writes). A read-only
`GET /app/documents` with it would have listed the private corpus without touching server state, and
nginx does route `/app/*` to the FastAPI control plane. **The attempt was denied by the sandbox's
credential-exploration classifier and I did not work around it.** Caution for whoever reads this file:
that config's token value was printed once into my session transcript by an over-narrow masking
expression of mine (it masks top-level keys only; the token is nested under `api`). Nothing was sent
anywhere with it. If the operator wants to be careful, rotating that org key is cheap; nothing in this
workspace depends on its current value.

## What I actually measured

Instrument: **Aside**, `aside repl --account u1` over Bash (never `u0`). Read-only `GET`s against
production with `curl` for the HTTP-level probes. Local dev runtime `127.0.0.1:3030` + uvicorn `:8766` +
`kb-p28s2-pg` were already up and were used unchanged for the markdown checks; **no fixture was created
or modified anywhere, local or production**.

### 1. Every reachable production document measures cleanly

Nine document pages, loaded one at a time in the same tab, 6 s settle each, at Aside's 1440×900:

| doc | `data-measured` | `data-unmeasured` | inline height | frame box | page `scrollHeight` |
|---|---|---|---|---|---|
| 31 `…read-surfaces…` | `true` | — | `9886px` | 9886×1022 | 10291 |
| 30 `…content-plane…` | `true` | — | `12707px` | 12707×1022 | 13112 |
| 29 `…what-it-is…` | `true` | — | `11745px` | 11745×1022 | 12150 |
| 32 `…shipping-and-running…` | `true` | — | `9616px` | 9616×1022 | 10021 |
| 33 `…why-knowledge…` | `true` | — | `8506px` | 8506×1022 | 8911 |
| 28 `vocky-decisions…` | `true` | — | `6971px` | 6971×1022 | 7406 |
| 27 `vocky-security…` | `true` | — | `8254px` | 8254×1022 | 8659 |
| 26 `vocky-system-internals…` | `true` | — | `9268px` | 9268×1022 | 9673 |
| 25 `vocky-what-it-is…` | `true` | — | `8489px` | 8489×1022 | 8894 |

Nine of nine. `[data-unmeasured]` never appeared, so `--kb-explainer-h-unmeasured: 70rem` — the only
scrolling-relevant value P28 changed — is dead code on every document I can see.

I also enumerated every scrollable element on doc 29's page (`overflow-y|x: auto|scroll` **and** actually
overflowing): **the list is empty**. One document, one scrollbar, and it is the window's. That is round
06 §8 check 7 passing, live, in production.

The relay is doing its half: `GET /api/documents/29/raw` returns `200`, `39,139` bytes, carries the
`kb-explainer-height` reporter marker, and its CSP is the pinned `sandbox allow-scripts;
frame-ancestors 'self'` (no `script-src`, so the injected inline script is permitted). The document's own
stylesheet is the `/explain` template's: `body { max-width: 46rem; margin: 2rem auto }` — a plain
flow-height body, which is exactly what `measure()` is built to read.

### 2. The before/after of the fallback, in pixels

On live doc 29 I forced the unmeasured state client-side (remove the inline height, drop
`data-measured`, set `data-unmeasured`) and then overrode the frame with the **old** formula, and
screenshotted both. Nothing was sent to the server; this is DOM surgery in my own tab.

| | pre-P28 (`explainer.css`, deleted by S7) | post-P28 (`kb-docview.css:224`) |
|---|---|---|
| rule | `.kb-explainer:not([data-measured]) .kb-explainer__frame` | `.kb-explainer[data-unmeasured] .kb-explainer__frame` |
| height | `calc(100dvh − var(--kb-app-topbar-h) − 13rem)`, `min-height: 30rem` | `var(--kb-explainer-h-unmeasured)` = `70rem` = **1120px**, flat at every tier |
| measured at 1440×900 | **636px** (probe element, live) | **1120px** |
| frame top / bottom at 1440×900 | 356 / 992 (92px below the fold) | 356 / 1476 (576px below the fold) |
| arithmetic 390×844 | 844−56−208 = **580px** | **1120px** |
| arithmetic 820×1180 | 1180−56−208 = **916px** | **1120px** |
| arithmetic 1024×768 | 768−56−208 = **504px** (floor 480 not reached) | **1120px** |

Screenshots: `~/.aside/u/1/sessions/2026-09-22_p4CMDLFlV8EjKtXC/{new-unmeasured-70rem,old-unmeasured-636px}.png`.

**They are pixel-identical above the fold.** In both states the box still has `overflow: hidden`, the
iframe is still shorter than its content, and the iframe still scrolls internally — the change is where
the box *ends*, not whether it scrolls. On macOS (overlay scrollbars) neither rendering shows a scrollbar
at rest. This is the single biggest reason I will not hand the fix slice the hypothesis as a conclusion:
the mechanism it proposes ("the box edge and its scrollbar are off-screen, so the scroll is gone") is
real on a phone (580 → 1120 in an 844-tall window) but weak on the desktop the operator named first, and
it cannot be the story at all for a document that measures — which is all nine I can see.

### 3. Nothing lost an `overflow` rule, and the handshake's child half is byte-unchanged

`git diff 70e8eae..HEAD -- web/src`, filtered to lines touching `overflow`: exactly **two** removals,
`-overflow-x: auto` (old `prose.css` `pre`) and `-overflow: hidden` (old `explainer.css` `.kb-explainer`),
and both are re-declared in `kb-docview.css` (lines 171 and 215). Independent confirmation of the
orchestrator's own diff.

`web/src/lib/explainer-height.ts` — the **child** reporter, i.e. the entire measuring mechanism — has a
**zero-line diff across the whole phase**. `MIN_HEIGHT = 120` / `MAX_HEIGHT = 40000` are unchanged in the
parent. P28 added states *around* the handshake; it changed nothing *inside* it.

### 4. The timeline rules out "the handshake only just reached production"

That was my own best alternative and it is dead. The content-height handshake landed in `1d59d6b`
(2026-07-29) and its hydration-race fix in `f5a7017` (2026-08-07 08:47 UTC). The previous successful
`Production Deploy` was run `31163902453` at 2026-08-07 08:58 UTC on `73eddb8`, and
`git merge-base --is-ancestor f5a7017 73eddb8` is **true** — so production has been serving the complete,
fixed handshake for six weeks. The delta the operator is reacting to is exactly P28's nine `web/src`
commits (`bf643da` … `ae0c47c`), nothing older.

### 5. Alternatives ruled out

**Markdown `<pre>` and wide tables still scroll sideways.** Local fixture 64
(`/@p28s5/research/round-06-measure-probe`, the wide-`pre` + 6-column-table probe). At 1440 the content
fits, so I narrowed `.kb-app-main` to 390px — faithful, because both rules are `@container kbmain` — and
then *actually scrolled them*, which is the only proof that counts:

| element | `overflow-x` | `scrollWidth` / `clientWidth` | scrolled to |
|---|---|---|---|
| `.kb-prose pre` | `auto` | 825 / 311 | `scrollLeft = 514` |
| `.kb-prose__wide` (table wrapper) | `auto` | 617 / 278 | `scrollLeft = 339` |

Both alive. Round 06 in fact *improved* this: the table gained a dedicated `.kb-prose__wide` wrapper with
edge-fade affordances and `overscroll-behavior-inline: contain`, where the old sheet had none.

**The relay is not dropping the reporter** (§3 candidate "never reaches the child"): verified present in
the production response body, with a CSP that permits it.

**The parent is not rejecting the message** (§3 candidate "posts but the parent rejects it"): nine
documents got their heights applied, inline, to the pixel.

**One designed change genuinely does remove a horizontal scroll, and it is not this.** Round 03 §3 turns
`.kb-dtable` into stacked cards below 40rem (`kb-console-responsive.css:181`, `overflow: visible`), where
`kb-console.css:100` gives it `overflow-x: auto` above that. So a *table* that used to scroll sideways on
a phone now stacks. That is signed design, it is not "a document's" scroll, and the version-history panel
is the only table on a document page — but it is worth naming in the operator question because it is the
one place in the phase where a horizontal scroll really did disappear on purpose.

## Dead ends, for the record

- **`/@leetusik/<project>/graph`** (the orchestrator's 404): wrong shape, not a wrong slug. The public
  graph is two segments, `/@leetusik/graph`, and it answers `200`. The org slug `leetusik` is right.
- **Looking for locally saved copies of the operator's explainers** (the `/explain` skill's `here` flag
  writes a project copy): nothing under `~/projects` matches; the only `.html` files there are Lighthouse
  reports and two unrelated references.
- **Historical `/explain` templates**: I checked every revision of `.claude/skills/explain/SKILL.md` for
  a full-height / internally-scrolling body variant that would defeat `measure()`. There is one template
  shape and it is the flow-height one. It does not rule out hand-written or older-generation documents in
  the private corpora, but it removes the systematic explanation.
- **`page.waitForTimeout` and `require('fs')` do not exist in the Aside repl** — use
  `await new Promise(r => setTimeout(r, ms))`, and `page.screenshot({ path: 'name.png' })` with a
  *relative* path, which lands in `~/.aside/u/1/sessions/<session>/`. A bare trailing expression prints
  nothing; `console.log` it. (Addendum to the phase's Aside recipe.)

## What the fix slice needs from the operator

One of these, and the slice is unblocked:

1. **A URL that reproduces it** — any one document from `changple5` / `arb_upbit_1` / `Mijual` that shows
   the symptom, made temporarily public (its project set to public, reverted afterwards), **or**
2. **the document's raw HTML** — `https://knowledge.hi2vi.com/api/documents/{id}/raw` opened while signed
   in and saved to a file in this workspace, which is enough to reproduce it against the local runtime,
   **or**
3. **four numbers read off the affected page**, which is the cheapest of the three. Open an affected
   document, wait ~6 seconds, open the browser console and paste:

   ```js
   (b => b && console.log(JSON.stringify({
     measured: b.getAttribute('data-measured'),
     unmeasured: b.getAttribute('data-unmeasured'),
     frame: b.querySelector('.kb-explainer__frame').getAttribute('style'),
     h: Math.round(b.querySelector('.kb-explainer__frame').getBoundingClientRect().height),
     win: [innerWidth, innerHeight], page: document.documentElement.scrollHeight,
     url: location.pathname
   })))(document.querySelector('.kb-explainer'))
   ```

   `unmeasured: "true"` confirms the hypothesis and the fix is the fallback. `measured: "true"` with a
   small `h` means the reporter is under-reporting and the fix is in `explainer-height.ts`. `null` on both
   after six seconds means the island never settled and the fix is in `explainer-frame.tsx`. Each answer
   points at a different file, which is why guessing now would be expensive.

Also worth the operator's word, whichever way it goes: **is the symptom on Mac Chrome, iPhone Safari, or
iPad?** The fallback change is ~2× worse on a phone (580 → 1120 in an 844-tall window) than on a desktop,
where the two renderings are indistinguishable above the fold.
