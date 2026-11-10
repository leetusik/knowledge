# P40-2t patch notes: the wave, decomposition, executor and review lines (change list C7–C10)

These notes are for the agent working in the bootstrap repo (`bootstrap_agentic_workspace.sh`). They edit five
files the bootstrap already has: `payload/claude/skills/do-whole-phase/reference/wave.md`,
`payload/claude/skills/do-whole-phase/reference/decomposition.md`, `payload/claude/agents/slice-executor.md`, and
the two `review.md` references, `payload/claude/skills/do-whole-phase/reference/review.md` and
`payload/claude/skills/do-next-slice/reference/review.md`. The three explain references C1–C6 rewrite are whole
files in this package (`claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`): copy
them over the payload's, and never into `do-next-slice/reference/`, where the build's `SHARED_SKILL_FILES` copies
them.

**Pinned to bootstrap `fdb1151` (workspace v95).** Line numbers are **hints**, read at that commit before any
edit. Find each edit by its quoted text, which occurs **exactly once** in its file at `fdb1151` (checked by
script: P40-2t.S3's `result.md`). Within one file, apply bottom-up or by quoted text.

**The quoting form.** Each edit gives `**Find** in <file>` with the exact text in a ` ```text ` block, then
`**Becomes:**` with the whole replacement in a second ` ```text ` block. The find is replaced by the
replacement, nothing else; a find inside a long line is a substring of that line. **No byte cap is touched:**
neither `payload/contract.md` nor the `do-whole-phase` / `do-next-slice` `SKILL.md` cores is edited.

## 0. What changes, in one paragraph

A book's `DECOMP` now declares its chapters (`--depends-on none`; a synthesis chapter `--depends-on` each chapter
it draws on), so after the outline gate the chapters run as a wave, by `wave.md`, with two exceptions that
`explain-chapter.md`'s new section *Chapters at once (a wave)* owns: **at most 4 chapters in flight** (an
exception to "no cap"), and a chapter's **span-1 and critic returns are not slice returns** (only span 3's final
verdict takes *At each return*). `wave.md` drops "an explain phase declares nothing" and points at that section
wherever it starts slices, takes a return, or reads `returned` and a `done` head on resume, so an orchestrator
resuming from disk after a compaction never finishes a chapter after its span 1. `decomposition.md` and the slice
executor's decomposition bullet stop keeping a book's chapters undeclared, and the executor's explain carve-out
sends a wave chapter's notebook entries through its `notebook` field. Both `review.md` references gain the chain
step: a research phase whose *Confirmed Intent* carries a `- then: explain` line goes on, at its recorded pass, to
`create-phase`'s *The research route*, **When it passes**. The engine side (the forced declaration and
`parallel-plan`) is `patches/engine.md`.

## 1. `payload/claude/skills/do-whole-phase/reference/wave.md` (C7)

**1a. The opening: an explain book declares its chapters, with its two exceptions.**

**Find** in `payload/claude/skills/do-whole-phase/reference/wave.md` (L3, the end of the opening paragraph):

```text
An explain phase declares nothing, so it stays sequential.
```

**Becomes:**

```text
An explain book declares its chapters too, and runs them as a wave once its outline is signed, with two exceptions of its own: at most 4 chapters in flight, and a chapter's span-1 and critic returns, which are not slice returns (`reference/explain-chapter.md`, *Chapters at once (a wave)*).
```

- **Why:** C7. The book's `DECOMP` declares its chapters (C2), so the opening's "stays sequential" is no longer
  true, and every reader of this file needs the two exceptions up front.

**1b. What `returned` means for a chapter.**

**Find** in `payload/claude/skills/do-whole-phase/reference/wave.md` (L13, the resume card's `wave:` line):

```text
`returned` are the running slices whose `result.md` exists.
```

**Becomes:**

```text
`returned` are the running slices whose `result.md` exists; an explain book's chapter is listed there after its span 1 too, which is not a return (`reference/explain-chapter.md`, *Chapters at once (a wave)*).
```

- **Why:** C7's second exception. Span 1 writes `result.md` with `status: done` and `critic_ready: yes`, so the
  card lists the chapter as returned while its critic and span 3 are still to come.

**1c. The cap: the one exception to "no cap".**

**Find** in `payload/claude/skills/do-whole-phase/reference/wave.md` (L26, *Planning and dispatching a wave*):

```text
- **Every ready slice starts: there is no cap.** Plan each one, then dispatch them together.
```

**Becomes:**

```text
- **Every ready slice starts: there is no cap**, bar an explain book's chapters, at most 4 in flight (`reference/explain-chapter.md`, *Chapters at once (a wave)*). Plan each one, then dispatch them together.
```

- **Why:** C7, change list §3(d): the cap of 4 is a text rule the engine does not enforce (`ready_slices=` lists
  every ready chapter).

**1d. Rolling starts keep the cap.**

**Find** in `payload/claude/skills/do-whole-phase/reference/wave.md` (L32, **Rolling starts.**):

```text
start every newly ready slice while the others still run.
```

**Becomes:**

```text
start every newly ready slice while the others still run (an explain book's chapters only up to 4 in flight).
```

- **Why:** C7. The next ready chapter starts as one finishes, never past the cap.

**1e. At each return: a chapter returns only from its span 3.**

**Find** in `payload/claude/skills/do-whole-phase/reference/wave.md` (L47, the first line of *At each return*):

```text
Handle returns one at a time, in the order they come in.
```

**Becomes:**

```text
Handle returns one at a time, in the order they come in. An explain book's chapter returns here only from its span 3 (`critique: answered`): its span-1 and critic returns take none of the steps below (`reference/explain-chapter.md`, *Chapters at once (a wave)*).
```

- **Why:** C7's second exception. Span 1 returns `done`; without this line step 1 would record it, check its set
  and finish the slice before its critic runs.

**1f. Step 6 starts up to the cap.**

**Find** in `payload/claude/skills/do-whole-phase/reference/wave.md` (L56, *At each return* step 6):

```text
and start what it lists, unless a stop is on disk or a held commit (*Rolling*) holds starts.
```

**Becomes:**

```text
and start what it lists, unless a stop is on disk or a held commit (*Rolling*) holds starts, an explain book's chapters only up to 4 in flight.
```

- **Why:** C7: the same cap, where a return starts the next slices.

**1g. Resume: a chapter's `done` head is a return only with `critique: answered`.**

**Find** in `payload/claude/skills/do-whole-phase/reference/wave.md` (L73, *Resume* step 2):

```text
A slice whose `result.md` verdict head says `done` has returned: finish it by *At each return*
```

**Becomes:**

```text
A slice whose `result.md` verdict head says `done` has returned (an explain book's chapter only once that head also says `critique: answered`; before that, `reference/explain-chapter.md`, *Chapters at once (a wave)*, says which of its spans is next): finish it by *At each return*
```

- **Why:** C7, and the slice's resume rule: *Resume* reads only the disk after a compaction or at a session's
  start, and a chapter after span 1 has a `done` head that is not the slice's return.

**1h. Resume starts up to the cap.**

**Find** in `payload/claude/skills/do-whole-phase/reference/wave.md` (L73, *Resume* step 2, its last sentence):

```text
Start `ready=` only while no stop is on disk, by step 6's holds.
```

**Becomes:**

```text
Start `ready=` only while no stop is on disk, by step 6's holds, an explain book's chapters only up to 4 in flight.
```

- **Why:** C7: the cap holds across a compaction; `running_slices=` on disk is what it counts.

**1i. *Unchanged* no longer lists the explain references.**

**Find** in `payload/claude/skills/do-whole-phase/reference/wave.md` (L81, *Unchanged*):

```text
`reference/dispatch.md`, the explain references, the `plan only` and spend gates
```

**Becomes:**

```text
`reference/dispatch.md`, the `plan only` and spend gates
```

- **Why:** C7: `explain-chapter.md` now carries the wave's two book exceptions.

## 2. `payload/claude/skills/do-whole-phase/reference/decomposition.md` (C8)

**Find** in `payload/claude/skills/do-whole-phase/reference/decomposition.md` (L5, the end of the declaration bullet):

```text
A fix slice cut after a review and an explain phase's chapters stay undeclared and run alone.
```

**Becomes:**

```text
A fix slice cut after a review stays undeclared and runs alone; an explain book declares its chapters by `reference/explain-decomposition.md` (`--depends-on none`, a synthesis chapter on each chapter it draws on).
```

- **Why:** C8. The engine refuses an explain `DECOMP` over an undeclared chapter too (`patches/engine.md`, D1).
  `do-next-slice/reference/decomposition.md` has no such sentence: it needs no edit.

## 3. `payload/claude/agents/slice-executor.md` (C9)

**3a. The decomposition bullet declares a book's chapters.**

**Find** in `payload/claude/agents/slice-executor.md` (L41, inside the **Decomposition slice** bullet):

```text
and leave an explain phase's chapters undeclared.
```

**Becomes:**

```text
and declare an explain book's chapters as its plan says (`--depends-on none`; a synthesis chapter `--depends-on` each chapter it draws on).
```

- **Why:** C9: the same rule as C8, for the executor that cuts the chapters.

**3b. The explain carve-out: in a wave, `phase.md` entries go in the `notebook` field.**

**Find** in `payload/claude/agents/slice-executor.md` (L33, **The explain carve-out**):

```text
the dossier, the outline, the document or chapter, `result.md` and `phase.md` stay yours to write,
```

**Becomes:**

```text
the dossier, the outline, the document or chapter, `result.md` and `phase.md` stay yours to write (in a wave, your `phase.md` entries, a chapter's note included, go in the `notebook` field instead: *In a wave*),
```

- **Why:** C9. A chapter's span 3 writes a note for later chapters (its taught terms, its link ids and its
  corrections); beside other chapters it returns that note in its verdict, as every wave executor does.

## 4. The chain step in both `review.md` references (C10)

**4a. `do-whole-phase`: after the recorded pass.**

**Find** in `payload/claude/skills/do-whole-phase/reference/review.md` (L10, the bullet after "Only a `pass` verdict marks the phase `done`"):

```text
- A passing review leaves the phase `done` in `active/`; do **not** archive it here.
```

**Becomes:**

```text
- **A research phase that chains an explain** (its *Confirmed Intent* carries a `- then: explain` line): once its pass is recorded, and merged if it ran in its own worktree, follow `create-phase`'s *The research route*, **When it passes**: the explain's confirmation comes back by itself, and still waits for the operator's literal yes.
- A passing review leaves the phase `done` in `active/`; do **not** archive it here.
```

- **Why:** C10, change list §3(c): the chained explain's confirmation appears by itself once the research passes.
  The step lives here, not in the `SKILL.md` core (8,185 of 8,192 B).

**4b. `do-next-slice`: after the recorded pass.**

**Find** in `payload/claude/skills/do-next-slice/reference/review.md` (L8, the bullet after "On `pass`:"):

```text
- On `changes_requested`: `review-phase` returns the phase to `in_progress` and sets the `REVIEW` slice to `changes_requested`
```

**Becomes:**

```text
- **A research phase that chains an explain** (its *Confirmed Intent* carries a `- then: explain` line): once its pass is recorded, and merged if it ran in its own worktree, follow `create-phase`'s *The research route*, **When it passes**: the explain's confirmation comes back by itself, and still waits for the operator's literal yes.
- On `changes_requested`: `review-phase` returns the phase to `in_progress` and sets the `REVIEW` slice to `changes_requested`
```

- **Why:** C10: `do-next-slice` keeps its own copy of `review.md` (it is not in `SHARED_SKILL_FILES`), so it gets
  the same line. Its `SKILL.md` core (8,180 of 8,192 B) is untouched.

## 5. The smoke suite (for `patches/release.md`)

These edits keep every pinned literal of `tests/retrofit_smoke.sh` at `fdb1151` in `wave.md`, `decomposition.md`,
`slice-executor.md` and both `review.md` files (its P42 block among them). The whole explain references change
one pinned literal and leave one pin stale:

- `"**0.10.0 or later**" in _decomp` (the explain pin block, L250): `explain-decomposition.md` now says
  `**0.11.0 or later**`. The pin becomes `"**0.11.0 or later**" in _decomp`.
- `"[--depends-on" not in LIVE[_rel]` (the P42 block, L441–L442) still passes, since the reference writes
  `--depends-on none` without a bracket, but its comment (L426, "explain chapters stay undeclared") is gone
  (`patches/engine.md`, D3). Flip the pin: `"--depends-on none" in LIVE[_rel]` for both installed copies.
