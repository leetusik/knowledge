# design-cowork — implementing and verifying a signed design

## Implementing — RESPECT THE DESIGN

Ship every designed element as designed: layout, density, hierarchy, tokens, interactions,
empty/error states, every Page and every component state on the signed canvas. **Do not drop,
simplify, restyle, or "improve" a designed element to save effort**: that is a correctness failure,
not a shortcut. Where an exact value isn't specified, pick the option closest to the designed intent,
**never a plainer fallback**. If the design implies backend or data work that doesn't exist, **build
the backing** and surface the choice; don't quietly drop the feature. The build reads the signed
round's snapshot and its `result.md` `## Build` (a legacy round's `build-prompt.md`), never the live canvas. Put this rule in the implement slice's
`plan.md` **and** the executor's dispatch prompt, and name the operator's runtime (`## Operator
Runtime` in the operations doc) in both. When the build lands, run `design-canvas <job>
--implemented` and re-sync the system from code.

## Verifying — RESPECT THE DESIGN, and does it work

Fidelity slices are judged on **two yardsticks, both mandatory**:

1. **Matches the record**: rendered values, tokens, layout, states, measured against the signed
   round.
2. **Works as a product**: the record is the **floor** of what to check, never the ceiling, and
   **matching it is not acceptance**. A screen can be pixel-perfect and dead; an element the record
   drew is not thereby a good element in the flesh.

An apply phase changes operator-visible surfaces by definition, and so does any phase that ships a
mockup, so its gate is `acceptance.required: true` and the operator sees the running product before
its review can pass. A `design-only` phase that ships no mockup is waived with the fixed note, and
its review judges the record and the signoffs. The review's gate stages live in the `review-phase`
skill; this section is the **design-side** spec the fidelity slice follows.

**The functional sweep: an apply/fidelity duty, on real wiring.** **A mockup, when one was built, is
exempt** (*The mockup*). Where the sweep applies, **each item is a defect when it fails even if the
pixels are perfect**:

- **Every visible interactive element does something observable.** Go control by control: buttons,
  toggles, expanders, tabs, links, menus. A control that no-ops is a defect, not a "not wired yet".
- **Interaction states**: focus, hover, keyboard path, on every input and control, **including the
  browser defaults the record never drew**. An ugly focus ring, or one the adjacent button covers,
  is a finding, not "unspecified".
- **Liveness over time.** Watch a timer tick for a real interval instead of reading its code; check
  that polling or auto-refresh does not destroy in-progress input, and that data arriving mid-action
  does not throw the user out of what they were doing.
- **Type into it and wait.** Anything implying live behaviour (search, typeahead, validation,
  autosave) is exercised by **typing and waiting**, not only by submitting.

**Where it runs.** In the runtime and access path **`## Operator Runtime`** (the operations doc)
describes (the run command(s), the mode, the origin/host the operator browses, the
devices/viewports/browsers) **and additionally in the production build when the two differ**. Whole
bug classes live in the gap: dev-only behaviour (StrictMode double-effects, Fast-Refresh reloads that
wipe in-progress typing) and access-path differences (a LAN or tunnel origin, a small viewport
rendering a different product). Verify at **every viewport the manifest names**. If the section is
**absent, or still carries its `UNFILLED` marker**, the slice returns `needs_operator` (the
orchestrator sets it `pending`). Never assume localhost, the production build or headless.

**With what — the instrument.** Drive that browser with **Aside** (aside.com), the workspace's
default instrument for every check in this section, **in place of a pre-written assertion suite**.
Aside has **two surfaces, not three**:

- the **`repl` surface**: one tool, *identical* over `aside mcp` and the `aside repl` CLI, the same
  Playwright-like environment (`page`, `snapshot()`, locators, page JS, screenshots), **different
  transport only**. The executor holds the surface and **picks each next action itself**.
- **`aside exec`**: Aside's own model drives the browser from a natural-language instruction
  (`aside exec -m <model> "Open <the manifest origin> and …"`). Useful for a broad look; not what a
  check you must be able to describe runs on.

**The default is `aside repl` over Bash**, executor-driven, and explicitly **not** the MCP transport.
`aside mcp` exposes that one `repl` tool, and its definition measures 4,974 JSON chars (**~1,344
tokens**) paid in **every** session, browser-related or not. Bash is already in both executor tiers'
allowlists, so **nothing ships, nothing registers, nothing is configured**. The CLI loses JS scope
between invocations; a two-line preamble re-attaches to the tab you already opened:

```js
const tabs = await listBrowserTabs();
const page = await attachBrowserTab(tabs[0].targetId);
```

Two sharp edges. Over MCP the `repl` tool **requires both `title` and `code`** (over the CLI the code
is positional: `aside repl --account <id> "await openTab('<url>')"`). And **snapshot refs go stale on
navigation** (`RefStaleError`), while `getByRole` survives it: after navigating, re-snapshot or locate
by role. An operator who wants Aside's tools natively in their **own** session may run
`claude mcp add -s local aside -- aside mcp`; that is a per-operator **escape hatch** the workspace
neither ships nor prescribes, and no slice may assume it.

**Whose browser — a dedicated profile, never the operator's.** `--account <id>` picks a real
signed-in profile, and an agent driving the operator's could read their mail, spend from saved cards
and authenticate as them. So agent runs use a **dedicated Aside profile**, named on every call:
`aside repl --account <id> "<js>"`. Pass it per invocation, and **do not rely on `aside account use
<id>`**: that only moves the *default*, which is the operator's profile. `## Operator Runtime` records
the agent's id; `aside account list` enumerates accounts without driving anything. **The halt:** a
manifest that names Aside but records no agent account id, or a machine holding only the operator's
profile, returns **`needs_operator`**: never a fallback to the personal profile, and never an account
created on the operator's behalf. That is a **third** halt condition and it is not the runtime one:
the runtime halt fires on an absent or `UNFILLED` manifest, while a manifest naming no instrument
still stops nothing.

**Why the executor drives, and not a pre-written suite.** The surface *is* Playwright; what the
doctrine rejects is **deciding every check in advance**. "Type into it and wait", "watch a timer
tick",
"the browser defaults the record never drew" pass only when something looks at the page and chooses
the next action (the qa doc's *Verification doctrine* has the story).

**The fallback — the doctrine's demands bind, the instrument does not.** Where Aside cannot be
installed (Linux, CI, an operator who declines), run the same sweep, at the same viewports, in the
same manifest runtime, through whatever real browser there is, on a profile of its own: an agent
never drives a browser profile signed into the operator's accounts, whichever browser it is. Name the
instrument you used in `result.md`, and never report a browser run you did not make.

**Re-run the lines inside the boundary.** A fidelity slice re-runs the `## Regression Checklist`
lines inside its phase's boundary: this phase's surfaces plus every earlier line whose surface a file
the phase changed feeds (`python3 scripts/workflow.py phase-scope <P>` prints the files; shared chrome
widens the boundary; a line you cannot place is inside). It records the lines outside by count, with
the diff as proof. Never the whole list: the product-wide sweep is an operator-created QA phase. The
review appends this phase's headline lines (`- [ ] <surface>: <one observable behaviour> (P<N>)`).

**What a fidelity slice may fix, and what it may not.** A **departure from the record** is a
faithful-implementation fix: make it, or cut a `fix` slice. A **design question** (something the
record drew that is bad in the flesh, something it never drew) is **not fixed silently and not
"improved"**: it goes through the channel below.

**Evidence, terse.** The headline checks plus screenshots at the manifest's viewports. The sweep, the
operator's runtime and the operator's own eyes make a phase safe, not a large conformance suite.

### When the record never drew it

Every state the record never settled (focus treatment, empty/loading/error states, pagination,
typeahead, browser-default styling, copy that reads wrong in the product) is **catalogued, never
invented**, and catalogued means **delivered**:

- Write each one as a **one-line question on `phase.md`'s `## Operator Questions` list**, not only in
  `result.md`, where a catalogue dies unread.
- The review **routes** every entry: into the acceptance walkthrough as a decision, or a deferred job (a collapsed `(resolved → <ref>)` entry counts as routed).
  An unrouted entry blocks the pass.
- **Questions get asked, not archived.**

And the sentence this gate exists for: **signing a job off — the canvas, and any stubbed mockup with
it — is not accepting the product.** The operator meets the thing itself, wired, at the phase's
acceptance gate, and may change their mind there: a `changes_requested` plus a new round or a `fix`
slice, never something to argue away with the record.

## Never — implementing and verifying

- Verify only against the record, or only in whichever runtime is convenient. The manifest's runtime
  is mandatory **everywhere, a requested mockup included**; the functional sweep is mandatory on
  every slice that ships real wiring; **Aside** is the instrument, and a workspace that cannot run it
  owes the same checks through another real browser.
- Fix a design gap silently, or "improve" it: catalogue it on `## Operator Questions`.
