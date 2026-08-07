# Result — P25.F4: the explainer height handshake now has a re-request

**Status: done.** The hydration race the plan ranked #1 **reproduced**, deterministically,
on a local production build under CPU throttling — on *every* article view, not just the
member one — and the two-sided re-request handshake fixes all of them. No sandbox, CSP,
relay, layout or CSS change was needed.

## 1. The repro (done first, and it is real)

Local stack, no prod access: Postgres 17 in docker on `55441` → `alembic upgrade head` →
`python -m server.seed` (operator@test / tenant #1 / project `vocky`) → `uvicorn
server.main:app` on `8766` with `KB_ROOT` pointed at the repo and `KB_DB_PATH` in a
scratch dir → `npm run build && npm run start` on `3030` with `SESSION_SECRET` +
`KB_API_BASE_URL`. Member session obtained by `POST /api/auth/login` (needs an `Origin`
header — the BFF's CSRF check 403s without it) and injected into headless Chrome with
`Network.setCookie`.

Driving: headless Chrome over CDP from a ~50-line Node script (Node 24 has a global
`WebSocket`, so no dependency) — `Emulation.setCPUThrottlingRate` for the throttle,
`Runtime.evaluate` to read `.kb-explainer[data-measured]` and the frame's applied height,
`Emulation.setDeviceMetricsOverride` for the "resize un-wedges it" corroboration. The
document under test is the 9,268px `vocky-system-internals…` explainer (id 3).

**Pre-fix, at `setCPUThrottlingRate` ≥ 4:**

| view | after hard load | after a window resize |
|---|---|---|
| `/documents/3` member (rate 4 / 10 / 20) | `measured:false`, frame **549px** (the CSS fallback) | rate 10/20: `measured:true`, 9667px |
| `/@kbtest/vocky/<slug>` member (rate 10) | `measured:false`, 549px | `measured:true`, 9667px |
| `/@kbtest/vocky/<slug>` anonymous (rate 10) | `measured:false`, 549px | `measured:true`, 9667px |
| `/documents/3` anonymous → 307 → pretty (rate 10) | `measured:false`, 549px | `measured:true`, 9667px |
| `/documents/3/versions/1` member (rate 10) | `measured:false`, 549px | `measured:true`, 9667px |

At rate 1 (no throttle) the member view measured fine — which is why this reads as
machine-dependent flakiness in the field rather than a hard bug.

Two things the repro **corrects** in the plan's research:

- The race is **not member-only**. The anonymous branch wedges identically once the
  parent island is slow enough to hydrate; the member branch just loses the race more
  often in practice (five client islands vs `PublicShell`'s zero), which is exactly why
  the operator sees it there and the anonymous view looked "verified fine".
- The resize nudge is confirmed as the un-wedger, i.e. the latch is on the **child's**
  `last` dedupe, not on the parent.

## 2. The fix

**Parent — `web/src/app/(public)/documents/[id]/explainer-frame.tsx`** (+1 function,
2 call sites):

- `requestHeight(frame)` posts `{ type: "kb-explainer-request" }` into
  `frame.contentWindow` with targetOrigin `"*"` (mandatory — the child is an opaque
  origin, so no concrete origin can ever match). The message carries no data and is
  delivered to that one frame's window only.
- Fired from **both** sides of the race: inside the existing `useEffect` right after
  `addEventListener("message", …)` (covers a frame that finished loading before
  hydration) and from the iframe's `onLoad` (covers one that had not — React attaches
  `onLoad` during the hydration commit, which is *before* effects run, so the two
  triggers together leave no gap).
- Every inbound safeguard is **verbatim**: `event.source === frame.contentWindow`
  identity check (no `event.origin` check — it is the literal `"null"` for opaque
  origins), `parseMessage` shape-check, clamp to `[MIN_HEIGHT, MAX_HEIGHT]`.
  `sandbox="allow-scripts"` and `referrerPolicy` are untouched (P16 pinned decision 1).

**Child — `web/src/lib/explainer-height.ts`** (+7 lines inside `REPORTER`):

```js
window.addEventListener('message', function (e) {
  if (e.source !== window.parent) return;
  var d = e.data;
  if (!d || typeof d !== 'object' || d.type !== 'kb-explainer-request') return;
  last = -1;
  schedule();
});
```

- Sender-checked (`e.source !== window.parent`) and shape-checked before it does
  anything, and it replies through the existing `post()` path — so the reply is still a
  plain `kb-explainer-height` message the parent already validates.
- It resets **`last` only, never `budget`** — a runaway document stays latched, and the
  request is the *only* trigger that bypasses the dedupe. Load/resize/ResizeObserver/
  fonts still need a real ≥2px change, so a parent→child→parent feedback loop remains
  impossible. `setTimeout` (via the existing `schedule()`), never rAF, per the file's
  documented constraint.
- `HEIGHT_REPORTER_MARKER` is unchanged, so both raw-route suites stay green untouched.

No `explainer.css` change: the fallback rule is correct as the failure mode, it just
stops being reached.

## 3. Post-fix verification (same stack, same script, rebuilt)

| view | throttle | after hard load |
|---|---|---|
| `/documents/3` member | 4, 10, 20 | **`measured:true`, 9268px** |
| `/documents/3` member | 1 | `measured:true`, 9268px |
| `/@kbtest/vocky/<slug>` member | 10 | `measured:true`, 9268px |
| `/@kbtest/vocky/<slug>` anonymous | 10 | `measured:true`, 9268px |
| `/documents/3` anonymous (307 → pretty) | 10 | `measured:true`, 9268px |
| `/documents/3/versions/1` member | 10 | `measured:true`, 9268px |

No resize nudge anywhere. Two extra checks:

- **No thrash / no ratchet.** Instrumenting the parent's `message` events: exactly
  **two** `kb-explainer-height` messages arrive (the child's own `DOMContentLoaded`
  post, plus the answer to the request), and the applied height is byte-identical at
  t+4s and t+8s (`9268px` → `9268px`).
- **The anchor channel still works.** Clicking an in-frame `a[href="#background"]`
  (CDP `Target.setAutoAttach` → the iframe's own session) scrolled the **page** from
  `scrollY 0 → 662`.

The versions view needed an archived version, which the local seed had none of: it was
produced by `POST /api/documents` with `new_version: true, commit: false` against an API
restarted with `KB_ROOT` pointed at a **scratch copy** of `docs/vocky` — the repo's own
`docs/` tree was never written to (phase.md's `KB_ROOT`-isolation warning).

## 4. Tests / validation

| command | outcome |
|---|---|
| `cd web && npm run lint` | PASS |
| `cd web && npm run typecheck` | PASS |
| `cd web && npm run build` | PASS (route table unchanged — this slice adds no route) |
| `cd web && npm run test` | PASS — **16 files / 88 tests** (was 15 / 85) |
| `python3 scripts/plugin_parity.py` | PASS (`web/` is not a shipped dir) |
| `python3 scripts/workflow.py validate` | PASS |
| pytest (Postgres-gated) | **not re-run** — no `server/**` or `tests/**` file touched, so F1's *125 passed / 83 passed + 42 skipped* baseline stands |

New suite `web/tests/explainer-reporter.test.ts` — 3 cases, one small hand-rolled
window/document harness (the suite is node-environment by design; no jsdom dependency
was added). It *executes* the injected reporter and pins: (1) reports once then dedupes
an unchanged height, (2) **re-posts the unchanged height when the parent asks**,
(3) ignores a request from a non-parent window or a malformed payload.

**Negative control:** `git stash`ing `explainer-height.ts` and re-running the suite
turns case (2) red (cases 1 and 3 stay green — they pin pre-existing behaviour), then
restored. It is a genuine regression guard, not a tautology.

Prettier: `explainer-height.ts` and the new test file are clean. `explainer-frame.tsx`
is flagged by `prettier --check`, but **it is flagged at `HEAD` too** and the single
complaint is a pre-existing `matchMedia` line, not anything this slice added — left
alone per the phase's standing rule.

## 5. Deviations from `plan.md`

None in substance. Two notes:

- The plan expected the race to be member-specific; it is not (see §1). The fix is
  branch-agnostic by construction, exactly as the plan predicted, so nothing changed —
  but the *finding* is broader than the plan's framing and is recorded in `phase.md`.
- The plan allowed "one small case … otherwise rely on manual evidence". I added one
  small file with three cases because running the reporter turned out to be cheap
  (~35 lines of harness) and it is the only automatable half of the handshake.

## 6. Doc impact

Appended to `phase.md` as the **F3/F4 round** (the earlier list was closed by the passed
re-review; the next review pass consolidates these):

- `docs/current/frontend.md` — the request/re-post handshake, and why the dedupe alone
  was unsafe.
- `docs/current/qa.md` — the hydration-race repro technique + the new web baseline.
