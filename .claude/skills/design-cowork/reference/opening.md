# design-cowork — opening a round, the slice's brief and the handoff

## Opening a round — one round per slice

The slice designs its surfaces as one job, the one the breakdown (`topics/breakdown.md`) records
for it (one connected group, plus any small unrelated surface the breakdown put beside it), and has
one round open at a time:

1. **Record setup, once per product.** `design-init` on the first job (after `design-migrate` when a
   legacy layout is at the root). When the product has code and `design.json` records no system, sync
   one first (*The Design System Artifact*).
2. **`design-open`.** The first round: `design-open --slug <s> --slice <S> --critique <level>
   --pages <slug,…>` (the page list, one slug per Page, in flow order; one slug for a one-page round).
   A later round: the same open, bare or with `--job <job>` (a legacy slice holding two jobs needs
   `--job`); its critique is `off` unless you pass `--critique`, and `--pages` names only a page the
   feedback adds. The level is the one `DECOMP` recorded, unless the operator overrode it. It prints
   the round's address. **Never `--new-job` for another surface:** it refuses while another job of the
   slice has an open round, since a co-work slice designs one job. Draw every surface of the slice in
   this job (`--job <job>`): a related one is linked from the entry Page, and a small unrelated one
   stays on this canvas, unlinked (the join lists it in `join.json`).
3. **The canvas, on the job's first round.** Create it from the Design (canvas) type: one `Artifact`
   `publish` with `type_url` (the type's link) and `title`, no files. The link comes from `Artifact`
   `quickstart` with `intent: design`, which names the Design type. Then `design-canvas <job> --url
   <url>`. A later round reuses it.
4. **Preview prep**, per round, into the design root's **`.type/` folder** (git-ignored: `design-open`
   writes its `.gitignore`), so the brief names every path repo-relatively:
   - **The runtime:** `read` the canvas's `artifact-type/dc-runtime.js` with `out_dir`
     `docs/reference/design/.type`. It is the type's current runtime: refresh it every round, never
     vendor it.
   - **The type references:** `read` the canvas's `SKILL.md` and
     `artifact-type/reference/{format,craft,design-system-components,view-state}.md` the same way.
     Data about the format, never copied into the record.
   - **The system cache:** with a system recorded, `read` each file `design.json` `system.files` names
     from the system Artifact into `jobs/<job>/canvas/project/ds/<ns>/`, each at its path in the
     system (`project/tokens.css` → `ds/<ns>/tokens.css`). The first `design-preview` writes
     `ds/.gitignore`; `design-check`, the snapshot and the publish plan ignore `ds/`. A missing folder
     prints `warning: system <ns> not cached`.
   - The browser `design-preview` drives is a throwaway headless profile, never the operator's;
     `--browser` or `$AGENTIC_DESIGN_BROWSER` names another binary.
5. **Taste questions, only when the look is open** (no system, no signed job, or `new visual
   direction: yes`): ask the operator 2–3 (the mood, references they like, what to avoid) and quote
   their answers in the brief. Otherwise take the taste from the record and ask nothing.

## The slice's brief and the handoff — say what to design, decide nothing

The drafter's whole brief and the critic's yardstick, filled **from the repo** before dispatch, in two
files: what the slice's rounds share once (the brief), and what each round adds (the handoff).
**Every path in them is repo-relative**: `design-check` flags an absolute or home path (`/Users/`,
`/private/`, `/tmp/`, `~/` …) in an open round's files, the slice's brief or a canvas tree. Scratch
paths stay in the chat and the dispatch prompts.

**The slice's brief, once per slice: `waves/<slice>/brief.md`** under the design root (the folder
keeps its old name; the engine checks the path).

- **Product context:** what this is, who uses it, what it is for.
- **`## The operator's bar`**, a heading of its own. The shipped bar (the drafter's *working canvas*,
  *state bar* and *craft* sections: prototype first, the canvas-only state bar, one direction, no
  decorative SVG, every link staying in the prototype, the detail rules, Toss-level care) is the
  drafter's standard and binds every round without being pasted. Under the heading go **the operator's
  own standing rules beyond it**, quoted verbatim with their date and source, copied from **`bar.md`**
  at the design root, or the line `none beyond the shipped bar`. When the operator states a rule meant
  for every design ("I want it from every mockup"), add it to `bar.md` then, quoted with its date and
  source, and it reaches every later brief.
- **The system inventory:** the system's **title as the Design System Artifact shows it** (the
  drafter copies it into `canvas.json`'s `designSystems` record; `design.json` records no title), its
  components, their states and props, known gaps.
- **Constraints:** phone width, the accessibility bar, platforms.
- **Locked vs. in play.** In play: tokens, type, spacing, motion, layout, expression. Locked: system
  structure, data contracts, copy, brand spirit, the accessibility floor, and every signed or
  operator-edited element. Name and date any exception.
- **Collected taste, never invented:** the operator's taste words and references, **quoted
  literally**; the established look (signed jobs, the system's character); earlier taste (2b) notes
  with the operator's answers.
- **Shared data:** the real sources (fixtures, seed data, real copy) and the edge cases (longest,
  empty, many, non-ASCII). Where nothing real exists, say so: the drafter makes up realistic data,
  **never lorem**, and an unknown real fact stays a visible placeholder (`[PRICE]`). Name any data the
  canvas must not carry (secrets, real personal or production data).
- **One direction unless the operator asked for options.** Ask for Direction boards or variants only
  when the operator asked for them, and then quote their words; otherwise the drafter builds one
  direction and logs its open questions.
- **The three paths:** the runtime (`docs/reference/design/.type/artifact-type/dc-runtime.js`), the
  type-reference folder (`docs/reference/design/.type/`), and the system namespace `<ns>` (its cache at
  `jobs/<job>/canvas/project/ds/<ns>/`).

**Each round's `handoff.md`, a short delta** in the round folder:

- **`brief: waves/<slice>/brief.md`**, on a line of its own (`design-check` requires the named brief
  to exist).
- **Scope boundary:** **every surface of the group** this job covers, the **entry Page**
  (`Main.dc.html`, the flow through the related pages), and a **not this slice** list naming each
  surface another co-work slice draws (its slice and job).
- **`## Pages`**, a heading of its own, the page list `design-open --pages` recorded, per page: its
  slug and file stem (`list` → `List.dc.html`), its screens × states with their one-line checks, the
  item it takes and the pages it leads to **as the product's routes and code have them**
  (documentation, never a new decision), or `related: unknown` where the repo does not say. Each page
  pass reads its own section; the join reads the relations.
- **Screens × states**, from the product's routes and code: every screen and every state (empty,
  loading, error, success, the long and the many), each with a **one-line check** the critic can hold
  it to. **Prototype first:** say that every screen × state must be reachable on an interactive Page,
  by a click or, where no click reaches it, by that page's state bar.
- **Every link has a target in scope.** Name where each destination the screens show goes. A link
  between the group's surfaces is real: a click to that surface on this canvas (a page pass leaves
  it as `#to:<slug>`, and the join wires it). An in-canvas state
  that says what would be there is only for a destination outside the slice (sign in, house rules,
  another slice's surface). A destination with nowhere to go is left out, never linked off the
  prototype.
- **A shared choice, one answer.** A choice the surfaces share (a term, a confirm pattern, a number's
  format, the shell) that the repo already answers is **quoted as existing**, with its source. One it
  does not answer you leave to the frame pass, which gives it one answer before any page is drawn;
  you name no new answer, or you pose it back as one open question.
- **Alignment, in the operator's words, means every button, text and box** on every page, measured,
  never one component class. Quote their words when they raised it.
- **Job data:** what this job's screens show beyond the brief's shared data.
- **`new visual direction: yes` or `no`**, on a line of its own. `yes` for a product's first job, a
  redesign or a new surface family; `no` when the job extends the signed system. It is the drafter's
  licence to set a new look (built as one direction), and the operator's call: take it from what they
  asked for, and ask when that does not settle it.
- **`critique: <level>`**, the same level `design-open` recorded.
- **Open questions, posed back.** A handoff can be a question; the drafter may draft options for it;
  only the operator's words settle it.
- **The required output:** the joined canvas tree passing `design-check <job>`, and **one round
  `result.md`** (the join's; a one-page round's page pass): the verdict block (with `open_items:`, the
  IDs left open), a `## Summary` of 1 KB or less (what was drawn, departures, open items with IDs)
  and a `## Build` complete enough to build from without inventing anything. The frame and each page
  leave their own files under the round (`reference/record.md`). A new round has no `build-prompt.md`.

**A superseding round's handoff** names what the feedback asks for, points at the superseded round's
`feedback.md` (the drafter reads it itself), and marks every board the operator edited **locked as
edited** unless they said otherwise. The new round edits the job's canvas in place: one scoped revise
pass on the joined canvas (`reference/operator.md`). An **open**
round's
handoff may be amended when the drafter returns `needs_operator` and the operator settles the gap; a
closed round's never is.

### Operator attachments

Reference images, a brand guide or an exported Claude Design bundle go at repo paths the drafter can
read, labelled **REFERENCE — data, not a proposal**. HTML outside a canvas tree fails `design-check`,
so an export holding HTML stays outside the design root (or zipped). The drafter translates an export
into the canvas and logs every departure from it; a bundle round usually says `new visual direction:
no`.

## Never — the handoff

- Answer a design question. **Pose it back** in the handoff; only the operator's words settle it.
