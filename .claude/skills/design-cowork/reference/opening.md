# design-cowork — opening a round, the wave brief and the handoffs

## Opening a round — per job; a wave opens all its jobs

For each job of the slice, in the order the breakdown lists them:

1. **Record setup, once per product.** `design-init` on the first job (after `design-migrate` when a
   legacy layout is at the root). When the product has code and `design.json` records no system, sync
   one first (*The Design System Artifact*).
2. **`design-open`.** The first job: `design-open --slug <s> --slice <S> --critique <level>`. Each
   further job of the wave: the same with `--new-job`. A later round of a job: `--job <job>` (a bare
   open refuses once the slice holds two jobs; its critique is `off` unless you pass `--critique`). The
   level is the one `DECOMP` recorded, unless the operator overrode it. It prints the round's address.
3. **The canvas, on a job's first round.** Create it from the Design (canvas) type: one `Artifact`
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

## The wave brief and the handoffs — say what to design, decide nothing

The drafter's whole brief and the critic's yardstick, filled **from the repo** before dispatch, in two
files: what the wave's jobs share once, and what each job adds. **Every path in them is
repo-relative**: `design-check` flags an absolute or home path (`/Users/`, `/private/`, `/tmp/`, `~/`
…) in an open round's files, a wave brief or a canvas tree. Scratch paths stay in the chat and the
dispatch prompts.

**The wave brief, once per wave: `waves/<slice>/brief.md`** under the design root.

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
- **Scope boundary:** the surface this job covers, and a **not this job** list naming what belongs to
  another job (its id). In a wave, name the **sibling jobs** and their surfaces.
- **Screens × states**, from the product's routes and code: every screen and every state (empty,
  loading, error, success, the long and the many), each with a **one-line check** the critic can hold
  it to. **Prototype first:** say that every screen × state must be reachable on an interactive Page,
  by a click or, where no click reaches it, by that page's state bar.
- **Every link has a target in scope.** Name where each destination the screens show goes: a screen of
  this job, or an in-canvas "another job" state (sign in, house rules, a sibling job's surface). A
  destination with nowhere to go is left out, never linked off the prototype.
- **Job data:** what this job's screens show beyond the brief's shared data.
- **`new visual direction: yes` or `no`**, on a line of its own. `yes` for a product's first job, a
  redesign or a new surface family; `no` when the job extends the signed system. It is the drafter's
  licence to set a new look (built as one direction), and the operator's call: take it from what they
  asked for, and ask when that does not settle it.
- **`critique: <level>`**, the same level `design-open` recorded.
- **Open questions, posed back.** A handoff can be a question; the drafter may draft options for it;
  only the operator's words settle it.
- **The required output:** the canvas tree passing `design-check <job>`, and **one `result.md`**: the
  verdict block (with `open_items:`, the IDs left open), a `## Summary` of 1 KB or less (what was
  drawn, departures, open items with IDs) and a `## Build` complete enough to build from without
  inventing anything. A new round has no `build-prompt.md`.

**A superseding round's handoff** names what the feedback asks for, points at the superseded round's
`feedback.md` (the drafter reads it itself), and marks every board the operator edited **locked as
edited** unless they said otherwise. The new round edits the job's canvas in place. An **open**
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
