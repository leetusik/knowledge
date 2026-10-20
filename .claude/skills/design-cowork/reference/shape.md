# design-cowork — the phase's shape

## Shape — three styles

- **The design slice:** `--kind co-work --risk high`. It runs inline; its dispatched spans run on
  their own rows: the drafting on the design row (`executor-route --drafter`), the critique on the
  critic and judge rows (`--critic`, `--judge`), and the mockup, when requested, on the high row.
- **A design slice writes no *product* implementation code.** It ends at SIGNOFF, and **the real
  implementation is always its own slice.** The only code inside it is a mockup: throwaway, stubbed,
  dispatched, and built only on request. A canvas is design, not code the product runs.
- **Pick a style, by name.** Three, and the phase's shape follows from which one:

**`build-after`** — one phase, two decomposition passes: `DECOMP` → groundwork → design slice(s) →
`DECOMP2` → build slices.

- The design decides *what gets built*, so the opening `DECOMP` **must not cut the build slices**. It
  creates only what is knowable before the gate: groundwork, the design slice(s), and a **second
  decomposition slice `P<N>.DECOMP2`** (`--kind decomposition --risk high`) ordered right after the
  **last** design slice.
- **`P<N>.DECOMP2` cuts the build slices once the design is signed**, from the spec pointers in
  `phase.md` and each signed round's `## Build` (`result.md`): **backing/backend work first, then the design
  implementation**, then any fidelity fix. Otherwise it is an ordinary decomposition slice.
- `P<N>.DECOMP2` has a second origin, after a `research` slice (see `CLAUDE.md`); nothing here depends
  on it.
- **Choose it when** the whole design should land before any of it is built, and the build fits in
  the same phase.

**`design-only`** — a *design* phase, then a separate *apply* phase.

- Both keep the **single pass**: `DECOMP` → design slice(s) → `REVIEW`; the apply phase's own `DECOMP`
  runs after the design was signed.
- **It must be chosen at `/create-phase`**: the `DECOMP` executor may not run `new-phase`. A phase
  that
  turns out late to want it gets its apply phase on the main thread through `/create-phase`.
- A requested mockup route **deliberately survives** into the apply phase, which deletes it as it
  builds the surface for real.
- **Choose it when** the design is big: foundations first, net-new surfaces isolated, a closing
  consistency sweep last.

**`paired`** — one phase, alternating: design 1 → apply 1 → design 2 → apply 2.

- `DECOMP` cuts the pairs as **bare folders**, and there is **no `DECOMP2`**. One apply slice per
  design slice.
- **Creating a bare folder is not pre-planning.** Each apply slice's `plan.md` is written **at its
  turn**, from the jobs just signed. A pair whose plan is written before its design is signed is the
  failure the ban exists for.
- Anything a design reveals that the pairs miss is cut afterwards at a **fractional order**.
- **Choose it when** the surfaces are independent and each is small enough to apply before the next
  design starts; it suits wide apps.

**Choosing, and where the choice lives:**

- **You suggest, the operator confirms.** Name a style and the reason; it is never yours alone and
  never implicit.
- **Asked at `/create-phase` by default.** A phase created before its visual nature was clear has
  `DECOMP` ask it, stopping **`pending`** (`--stop-kind decision`), with `design-only`'s deadline in mind.
- The confirmed style is recorded in `intent.md` under **`## Design Style`**, with a second line,
  `Mockup: requested` or `Mockup: on request` (the default; an absent line reads as `on request`).

**Sizing the design work — DECOMP decides it:**

- **One job is one surface:** a user flow or a small screen cluster, about 5 Pages or fewer plus the
  components they use, so one review sitting covers it. Cut design work by surface from the build
  inventory. `design-check` warns on an open job past 6 Pages or 16 boards (a warning, never an
  error; a board another board mounts, such as a flow board's screen, is not counted): split it into
  jobs by surface.
- **Foundations come first.** A greenfield product's first job settles the look on its own (a
  Foundations board, the core components, one key page); with a design system, the system is the
  foundation. Later jobs build on signed ones, and the most central surface goes first.
- **Waves:** one co-work slice may hold several jobs (about 3–4), drafted in parallel, one drafter per
  job, each writing only its own job folder. A wave is one slice, so "never fan out slices" holds.
  `design-open` warns past 4 open rounds in a slice.
- **Each job's critique level:** `off | critic | critic+judge`, unset = `off`. On for new or central
  surfaces, greenfield foundations, many-state flows and public pages; off for small follow-ups,
  internal screens and established patterns. `critic+judge` where a wrong call is costly (foundations,
  a public flow). The operator may override it per round.
- **How many design slices and jobs there are is decided at the opening `DECOMP`**, from the
  inventory; a job's revisions are superseding rounds inside it, never cut in advance.
- **`DECOMP` records a build inventory in `phase.md`**: the candidate surface list, **what** to build,
  not how, one line per candidate, plus each co-work slice's jobs with their critique levels. The
  handoff's scope is written from it, and `paired` counts its apply slices from it; the design may
  add to it and cut from it.
- **The working canvas replaces the in-product mockup by default.** Every job's canvas is a prototype
  first: Pages that work when clicked through (flow boards that carry the clicked item, a canvas-only
  state bar on each interactive Page), with real or realistic data, and a board per component with
  every state.
  `Mockup: requested` now means an in-product route **in addition to** the canvas.
- **Expect the read-back to re-shape the phase.** In `build-after`, `DECOMP2` **is** that re-shaping;
  elsewhere cut new slices at fractional orders. **Do not over-plan before the gate.**
- A **design-fidelity fix** slice (a departure from the record, or a dead or unreachable control the
  functional sweep found) is part of the normal shape, not a failure.

**The phase gate follows the mockup, with no judgment left in it.** A phase that ships a mockup takes
`accept-gate <P> --require`. A **`design-only` phase that ships none** ships no running product
surface, so it is **waived** with the fixed note `design-only, no mockup: the operator signed each job
on its canvas`. `build-after` and `paired` phases are gated by their build slices, `--require`. A
mockup
asked for after `DECOMP` declared the gate re-declares it: run `accept-gate <P> --require` in the
mockup
commit.

## Never — shaping the phase

- Rate a design slice `low`.
- Pre-plan past the design gate. **Everything downstream of a job is planned from the signed design,
  never before it**: `DECOMP2`'s build slices, the paired apply slice, the apply phase. Cutting a
  **bare** slice folder is not planning; writing its `plan.md` ahead of its design is.
