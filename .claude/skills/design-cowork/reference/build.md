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

**With what — the instrument.** Drive that browser with **Claude in Chrome**, the workspace's
default instrument for every check in this section, **in place of a pre-written assertion suite**.
Its tools are `mcp__claude-in-chrome__*` (navigate, read the page, find, click and type through
`computer` and `form_input`, run page JS, read the console and network, resize, screenshot), and the
executor **picks each next action itself**. `slice-executor` lists the wildcard last in its `tools:`,
so whoever runs a check (that executor, or the main thread, which inherits every tool the session
has) can drive it; `design-drafter`, `design-critic` and `Explore` carry none (`design-preview` is a
headless render self-check, not verification). **Nothing ships, nothing registers in settings:** a
project cannot enable Chrome, and the extension owns site permissions.

**Setup (the operator, once).**

- **Chrome on in the session:** start with `claude --chrome`, or run `/chrome` and pick "Enabled by
  default". It needs a direct Anthropic plan signed in with `/login` (no API key, `setup-token`,
  Bedrock, Vertex or Foundry), a visible Chrome window (no headless), and not WSL.
- **A separate Chrome profile for the agent**, signed into **none** of the operator's accounts
  (mail, banking, Google), with the Claude in Chrome extension installed and signed in to the
  **same claude.ai account and organization** as Claude Code (the connection requires it), its site
  permissions allowing the manifest's origin(s).
- **Record its `deviceId`** in `## Operator Runtime` as `Agent's Chrome deviceId:`. Never a name:
  `list_connected_browsers` hides the names you give and labels browsers by position ("Browser 1",
  "Browser 2"), a label can move to another browser between connections, and the `deviceId` stays.
  To read it, connect **only** the agent profile (close the other profiles' Chrome windows for the
  moment), ask Claude in a Chrome-on Claude Code session to call `list_connected_browsers`, and copy
  the one entry's `deviceId`. Reinstalling the extension or signing it out gives the profile a new
  id: the run then halts (below) until you record the new one.

**Whose browser — the agent's profile, selected first, on every run.** With one browser connected
the tools act on it unasked, and that one may be the operator's, where an agent could read their
mail, spend from saved cards and authenticate as them. So **before any other browser tool**:

1. `list_connected_browsers` (it returns `deviceId`, `name`, `osPlatform`, `connectedAt`, `isLocal`,
   `inUse` for every browser on this claude.ai account);
2. find the entry whose `deviceId` equals the recorded `Agent's Chrome deviceId:`. Never match on
   `name`: it is a position label that another browser, the operator's included, can hold next time;
3. `select_browser` with that `deviceId`. The choice holds for the session even when another browser
   connects. Never pick a browser by guess, never act before selecting. The tool's own description
   says to ask the user when several browsers are connected: the recorded `deviceId` **is** the
   operator's answer, given ahead of time in the manifest, so selecting it is not a pick.

**The halt.** No Chrome tools in the session, no recorded `deviceId`, or no connected browser with
that `deviceId` returns **`needs_operator`** (the orchestrator sets the slice `pending`), naming the
fix: Chrome enabled in the session (`/chrome` → "Enabled by default", or `claude --chrome`), the
agent's profile connected, or its `deviceId` re-recorded after an extension reinstall or sign-out.
Never fall back to a label, never borrow another connected browser, and never create a profile on
the operator's behalf. That is a **third** halt condition and it is not the runtime one: the
runtime halt fires on an absent or `UNFILLED` manifest. A manifest that still names an older
instrument counts as unfilled here, so the first real-browser slice stops once to ask for the
`deviceId`.

**Why the executor drives, and not a pre-written suite.** What the doctrine rejects is **deciding
every check in advance**. "Type into it and wait", "watch a timer tick", "the browser defaults the
record never drew" pass only when something looks at the page and chooses the next action (the qa
doc's *Verification doctrine* has the story).

**The fallback — chosen by the manifest, never by the agent mid-run; the doctrine's demands bind,
the instrument does not.** `## Operator Runtime`'s `Browser instrument for the agent:` names Claude
in Chrome (a blank field means it) or, where the platform rules Chrome out (WSL, CI, a
Bedrock/Vertex/Foundry or API-key session), another real browser: the agent drives it step by step
from Bash on a throwaway profile (e.g. the project's own Playwright), picking each next action, never
a pre-written suite. Same sweep, same viewports, same manifest runtime, and never a profile signed
into the operator's accounts, whichever browser it is. **Chrome missing from a session whose manifest
names it is the halt above, never a silent fallback**: a fallback picked mid-run would hide a
misconfigured session. Name the instrument you used in `result.md`, and never report a browser run
you did not make.

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
  every slice that ships real wiring; **Claude in Chrome** is the instrument, on the agent's own
  profile selected first, and a manifest that names another real browser owes the same checks there.
- Fix a design gap silently, or "improve" it: catalogue it on `## Operator Questions`.
