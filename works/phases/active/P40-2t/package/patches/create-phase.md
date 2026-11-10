# create-phase: the explain route, the research route, and the lines that name them

Pinned to bootstrap **`fdb1151`** (workspace v95). Every find below occurs exactly once in its file at that commit
(P40-2t.S2's `result.md` has the count). Line numbers are hints; find each edit by its quoted text. A find inside a
long line is a substring of that line: replace only that part. Change-list rows: B1–B11 (`topics/change-list.md`
§5, Group B).

## 1. `payload/claude/skills/create-phase/SKILL.md`

**1a. The intro's one exception now covers the explain's research (B11).**

**Find** in `payload/claude/skills/create-phase/SKILL.md` (L9, the end of the intro's first paragraph):

```text
with one exception: *The explain route* creates **and** runs its explain phase after one confirmation.
```

**Becomes:**

```markdown
with one exception: *The explain route* creates **and** runs its explain phase after one confirmation, and *The research route* does the same for the research an explain asked for first, as the explain's own research.
```

- **Why:** the research phase a "research first" reply makes now runs at once (change-list §3(c)), so "creates
  phases; never runs them" has the same exception for it.

**1b. Who may invoke it: the research route runs on its confirmation too (B11).**

**Find** in `payload/claude/skills/create-phase/SKILL.md` (L11, the end of *Who may invoke it*):

```text
so it creates, then runs (*The explain route*). Every other phase waits for the explicit yes and stops after creation.
```

**Becomes:**

```markdown
so it creates, then runs (*The explain route*), and the research an explain asked for first runs the same way on its own one confirmation (*The research route*). Every other phase waits for the explicit yes and stops after creation.
```

- **Why:** without it the paragraph's last sentence says a research phase stops after creation, which the
  research route no longer does.

**1c. Step 2 routes the research reply, code or not (B11).**

**Find** in `payload/claude/skills/create-phase/SKILL.md` (L35, *Procedure* step 2):

```text
(the explain's "research first": no phase covers the subject yet), it is not an explain but an ordinary phase that records findings for one: follow *The research route* below.
```

**Becomes:**

```markdown
(the explain's "research first": no phase covers the subject yet, whether it is this repository's code or a subject with no code behind it), it is not an explain but an ordinary phase that records findings for one. It is the explain's own research: confirmed once, then created and run at once, and when it passes the explain's confirmation comes back by itself. Follow *The research route* below.
```

- **Why:** step 2 said only "no phase covers the subject yet"; the request may now be a subject with no code, and
  the phase no longer stops after creation. The paragraph's bold opening, which the smoke suite pins, stays.

**1d. Step 5: the research phase commits and runs on (B11).**

**Find** in `payload/claude/skills/create-phase/SKILL.md` (L88, *Procedure* step 5):

```text
(an explain phase confirmed with a `unit:` field commits here, then runs on: *The explain route*)
```

**Becomes:**

```markdown
(an explain phase confirmed with a `unit:` field, and the research phase an explain asked for first, commit here, then run on: *The explain route*, *The research route*)
```

- **Why:** step 5 is "Commit, then STOP"; the research phase is now the second phase that goes on past it.

**1e. Replace the explain route and the research route (B1–B10).**

**Find** in `payload/claude/skills/create-phase/SKILL.md` (L127, the heading):

```text
## The explain route
```

**Becomes:** delete from that heading (L127) to the **end of the file** (L248, the research route's last
paragraph), and put in its place, in order:
1. the whole of the package's `claude/skills/create-phase/explain-route.md` (it starts at its
   `## The explain route` heading);
2. a blank line, then the whole of the package's `claude/skills/create-phase/research-route.md` (it starts at
   `## The research route`).

- **Why:** the two routes change throughout, so they are given whole, started from `fdb1151`'s text.
  - *The explain route*: records only, a research phase's findings included; a subject with no code that a
    research phase covers is accepted, and its no-code refusal goes; the plugin floor is **0.11.0** (B1, B2);
    `subject`, `phases` and `book` (kind `codebase` or `subject` with a label) in step 1, and "research first"
    for both cases, the only way on for a subject (B3); *A confirmed proposal* accepts a subject a research
    phase on `phases:` covers, and reads an old `mode: general` so covered as a subject explain (B4); a book's
    chapters are declared, run as a wave after the outline gate, at most 4 at once, with a synthesis chapter
    after, and the outline pins the recap lines, names, running examples and link ids (B5).
  - *The research route*: the block's fields as a bold list, with `paths: … | none`, the new **`sources`** field
    (the v96 marker the plugin's front door tests for) and the chained `then:` (B6); one confirmation naming the
    sources and, for the operator's material, the repository the extract lands in and whether it has a git
    remote, then created and run at once in `auto` on the default stream, as the explain's own research (B7);
    the per-source rules, the eight privacy rules, reader-shaped findings and the research review's sample,
    from change-list §3(a) (B8); the new bold part **When it passes** (B9); the legacy-block sentence (B10).
- **Unchanged inside them:** the refusal from a phase worktree, the private-project refusal, the sixteen fields'
  order, step 3's create-and-run order (`new-phase`, `intent.md`, the intake commit, `parallel-start`, `auto`),
  the stops, and *The acceptance gate, per unit*.
- **Note:** both package files are **text to insert, not files to ship**. Never copy them into
  `payload/claude/skills/create-phase/`: the build ships every file under a skill directory.

Steps 3, 4.2 and 4.4 of the procedure need no edit: they name the explain route, the `## Explain` section and the
explain worktree exception, all of which stay. The research phase runs on the default stream, so 4.4's "say
nothing about worktrees" holds for it as written.
