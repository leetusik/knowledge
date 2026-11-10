# P40-2t patch notes: the release (change list E6)

These notes are for the agent working in the bootstrap repo (`bootstrap_agentic_workspace.sh`). They come
**last**, after `patches/create-phase.md`, `patches/workflow.md` and `patches/engine.md` (`PATCHES.md` has the
order). They edit the files the release touches beyond those: the smoke suite's explain pins,
`README.en.md`'s Knowledge block, the seed operations doc and the installer's closing line; then the
`changelog.d` fragment, the release itself and the verification after applying.

**Pinned to bootstrap `fdb1151` (workspace v95).** Line numbers are **hints**, read at that commit before any
edit. Find each edit by its quoted text, which occurs **exactly once** in its file at `fdb1151`, and still once
after the earlier patch files are applied (`checks/finds.py`, `checks/apply.py`; P40-2t.S6's `result.md`).
`patches/engine.md` edits the same `tests/retrofit_smoke.sh` in other places (its P42 comment and Test 10d).

**The quoting form.** Each edit gives `**Find** in <file>` with the exact text in a ` ```text ` block, then
`**Becomes:**` with the whole replacement in a second ` ```text ` block. The find is replaced by the
replacement, nothing else; a find inside a long line is a substring of that line.

## 1. `tests/retrofit_smoke.sh`: the explain pin block and the P42 pin

The package's three earlier patch files remove or break none of the suite's pins except the four below
(P40-2t.S2, S3 and S4 each grepped the suite at `fdb1151` for the strings their edits change). Test 10d's own
literals (its objective, its `ok` and `bad` lines, its comment) and the P42 comment are rewritten in
`patches/engine.md` 2a–2c, not here. The new pins below are the literals S2 and S3 named, plus the `## Explain`
hazard sentence.

**1a. The explain block's comment names the 0.11.0 floor.**

**Find** in `tests/retrofit_smoke.sh` (L234):

```text
# An explain is written from the code and the phases' records, with no research run (plugin 0.10.0+).
```

**Becomes:**

```text
# An explain is written from the code and the phases' records, a research phase's findings included, with no
# research run of its own (plugin 0.11.0+).
```

**1b. The route's plugin floor.** `0.10.0` now survives in `create-phase` only in the legacy-proposal refusal.

**Find** in `tests/retrofit_smoke.sh` (L239):

```text
assert "must-cover" in create_phase and "0.10.0" in create_phase and "**A confirmed proposal.**" in create_phase
```

**Becomes:**

```text
assert "must-cover" in create_phase and "0.11.0" in create_phase and "**A confirmed proposal.**" in create_phase
```

**1c. The `DECOMP`'s registry floor, and the new v96 pins.**

**Find** in `tests/retrofit_smoke.sh` (L250):

```text
assert "installed_plugins.json" in _decomp and "pages/.gitignore" in _decomp and "**0.10.0 or later**" in _decomp
```

**Becomes:**

```text
assert "installed_plugins.json" in _decomp and "pages/.gitignore" in _decomp and "**0.11.0 or later**" in _decomp
# v96: the research route names its sources (the `**sources**` field plugin 0.11.0's front door tests for),
# writes the explain proposal it carries as a blockquote (so no research phase's intent.md reads `## Explain`),
# and chains the explain when it passes; a book may be a subject with no code behind it, and its chapters are
# declared and run at once after the outline gate (at most 4 in flight), each with its own critic.
for required in ("- **sources**:", "**When it passes.**", "**0.11.0 or later**", "at most 4 at once",
                 "--depends-on none", "from=<P>", "(kind subject: <label>)", "`> ` opening every line"):
    assert required in create_phase, required
assert "## Chapters at once (a wave)" in _chapter and "**At most 4 chapters in flight.**" in _chapter
assert "(kind subject: <label>)" in _decomp and "--depends-on none" in _decomp and "at most 4 at once" in _decomp
assert "**the consistency pass.**" in (root / "payload/claude/skills/do-whole-phase/reference/explain-review.md").read_text(encoding="utf-8")
for _n in ("do-whole-phase", "do-next-slice"):
    _rv = (root / "payload/claude/skills" / _n / "reference/review.md").read_text(encoding="utf-8")
    assert "*The research route*, **When it passes**" in _rv, _n
```

**1d. The P42 pin flips: a book's chapters are declared.**

**Find** in `tests/retrofit_smoke.sh` (L442):

```text
    assert _rel in LIVE and "[--depends-on" not in LIVE[_rel], _rel
```

**Becomes:**

```text
    assert _rel in LIVE and "--depends-on none" in LIVE[_rel], _rel
```

- **Why:** the old pin forbade only the bracketed optional form, so it still passed against the rewritten
  `explain-decomposition.md`; it now pins what the reference says instead, in both installed copies.

## 2. `README.en.md` (the Knowledge block)

**Find** in `README.en.md` (L552–L554):

```text
> private. It does no research of its own and covers only this repository's code; a subject no phase
> recorded is offered a research phase first. A book still stops for its outline sign-off and its
> acceptance gate. Plugin version 0.10.0 or later is required; the writer runs on your session's
```

**Becomes:**

```text
> private. It does no research of its own: it writes from this repository's code and the phases' records,
> a research phase's findings included. A subject no phase covers, this repository's code or a subject with
> no code behind it, is offered a research phase first, which runs at once; when it passes, the explain's
> confirmation comes back by itself for your yes. A book still stops for its outline sign-off and its
> acceptance gate, then writes its chapters at once (at most 4 in flight). Plugin version 0.11.0 or later
> is required; the writer runs on your session's
```

- **Why:** "covers only this repository's code" is no longer true, the research is chained, and the floor is
  0.11.0. The suite's pins on this block (`Every explain is its own **explain phase**`, the review pointer,
  `merge`) are on the lines around it and stay.

## 3. `installer/payloads/doc_bodies/operations.md` (the seed operations doc)

**Find** in `installer/payloads/doc_bodies/operations.md` (L59–L61):

```text
its own and covers only this repository's code; a subject no phase recorded is offered a research
phase first. A book still stops for its outline sign-off and its acceptance gate. Plugin version
0.10.0 or later is required.
```

**Becomes:**

```text
its own: it writes from this repository's code and the phases' records, a research phase's findings
included. A subject no phase covers, this repository's code or a subject with no code behind it, is
offered a research phase first, which runs at once; when it passes, the explain's confirmation comes
back by itself for your yes. A book still stops for its outline sign-off and its acceptance gate, then
writes its chapters at once (at most 4 in flight). Plugin version 0.11.0 or later is required.
```

- **Why:** as section 2; the seed doc and the README say the same thing.

## 4. `installer/main.py` (the install's closing line)

**Find** in `installer/main.py` (L3242):

```text
(plugin 0.10.0+)
```

**Becomes:**

```text
(plugin 0.11.0+)
```

- **Why:** the floor. The smoke pin `every explain is its own explain phase` is on the next line and stays.

## 5. The release notes: `changelog.d/explain-research-chained.md` (a new file)

The bootstrap stamps versions only on `main` (`changelog.d/README.md`): write this fragment, never a numbered
`CHANGELOG.md` section, and never touch `WORKSPACE_VERSION` by hand.

**New file** `changelog.d/explain-research-chained.md`:

```markdown
# An explain asks for its research first and comes back by itself; a book's chapters are written at once

- **Research first, then the explain, from one request.** When no phase covers an explain's subject, the knowledge plugin's "research first" reply now creates the research phase **and runs it at once**, on one confirmation, as the explain's own research. Its `Research: <subject>` block gains `paths: … | none` and a `sources:` line: the research reads this repository's code, the web (each outside fact with its source beside it, an `unsourced:` line where no opened source states it, and the research review re-opening at least two sources per topic), or your own material (the typed messages of your sessions and the verbatim *Original Input* of intent files, under eight privacy rules; the confirmation names the repository the extract lands in and whether it has a git remote). When the research phase passes, `create-phase`'s *The research route*, **When it passes**, invokes `/knowledge:explain <subject> from=<P>`: the explain's confirmation, redrawn from the findings, appears by itself and still waits for your literal yes. Both `review.md` references carry that step for a research phase whose intent has a `- then: explain` line. The explain proposal it carries is written into the research phase's `intent.md` as a blockquote, so the engine never takes that phase for an explain phase.
- **A subject with no code behind it.** An explain now accepts a subject that is not this repository's code (a field of study, a language, your own words) once a research phase covers it, told from that phase's findings alone; a book of such a subject is of kind `subject` with a short label. Outside a git repository it is still declined.
- **A book's chapters are written at once.** A book's `DECOMP` declares its chapters (`--depends-on none`; a synthesis chapter on the chapters it draws on), and after the outline gate they run as a wave, **at most 4 in flight**, each with its own critic, by `explain-chapter.md`'s new *Chapters at once (a wave)*. The outline pins each chapter's recap lines, names, running examples and link ids; span 3 records its corrections, and the review adds a consistency pass. The engine now holds an explain phase's `DECOMP` to v77's forced declaration like any other: `finish-slice` refuses it over an undeclared chapter, and `parallel-plan` prints its rounds.
- **Migration notes.** `/update-workspace` brings it. Explain phases now need the knowledge plugin **0.11.0 or later** (`/plugin marketplace update knowledge`, then update `knowledge@knowledge` from the `/plugin` panel); a proposal from an older plugin is refused and nothing is created. Update the workspace first: plugin 0.11.0 refuses a workspace older than this release. A five-line research block from an older plugin is read as `sources: code`, with no chained explain. An explain phase whose `DECOMP` already finished is unaffected; one whose book `DECOMP` has not finished must declare its chapters (`set-slice-deps <slice> --depends-on none`) before `finish-slice` takes it. Nothing else beyond `--update`.
```

## 6. The release (the bootstrap's own `CLAUDE.md` rules)

**The release order:** this bootstrap release lands and is pushed **first**; the knowledge plugin 0.11.0 is
pushed **after** it; then `/update-workspace` runs in the knowledge repo (v89), in arb_upbit_1 and in Note
(v95). Plugin 0.11.0's front door refuses any workspace older than **v96**; if the bootstrap stamps another
number, the plugin's refusal is renamed in a fix slice before the plugin is pushed (as P39-hk.F5 did).

1. Edit `payload/**`, `installer/**`, `README.en.md`, `tests/retrofit_smoke.sh` and the fragment only. Never edit
   the installed copies in `.claude/`, `CLAUDE.local.md` or `workflow/`.
2. Copy the package's three whole references over `payload/claude/skills/do-whole-phase/reference/` (never into
   `do-next-slice/reference/`), then apply `patches/create-phase.md` (1e puts in the two route texts),
   `patches/workflow.md`, `patches/engine.md` and this file's sections 1–4, and write section 5's fragment.
3. `python3 installer/build.py`, then `python3 installer/build.py --check`. `payload/scripts/workflow.py` and the
   references changed, so the root artifact must be rebuilt before the suite runs.
4. `bash tests/retrofit_smoke.sh`, **alone** in its shell call.
5. Commit with the rebuilt `bootstrap_agentic_workspace.sh` in the same commit (Conventional Commits, a component
   scope, **no phase or slice ids**).
6. Land it on `main` as `changelog.d/README.md` says: `python3 installer/build.py --release` stamps the next
   version (**v96** expected), folds the fragment into its `## v96` section and sets `WORKSPACE_VERSION`;
   commit `build(release): workspace v96 — <the fragment's line 1>`.
7. **Push `main`** before the knowledge plugin 0.11.0 is published: `/update-workspace` clones from GitHub, and
   plugin 0.11.0's front door refuses every workspace older than this release.
8. Refresh the bootstrap's own install: `sh bootstrap_agentic_workspace.sh --update .`, then commit the refresh
   in `git -C workflow`.

## 7. Verification after applying

- **The build and the suite pass:** `python3 installer/build.py --check` and `bash tests/retrofit_smoke.sh`
  (section 1 and `patches/engine.md` 2a–2c are its changed pins).
- **A fresh scratch install** (a throwaway `git init`, then `sh bootstrap_agentic_workspace.sh <dir> --at-root
  --name T --summary t`):
  - `.claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md` equal the package's
    files, and `do-next-slice/reference/` holds byte-identical copies;
  - `.claude/skills/create-phase/SKILL.md` has `## The explain route` and `## The research route`, with
    `- **sources**:` and `**When it passes.**` in the latter;
  - `python3 scripts/workflow.py parallel-plan <P>` on an explain phase prints its rounds and no `note:` line;
  - `validate` passes.
- **Every plugin section the payload cites exists** in plugin 0.11.0 by number and heading: `checks/cites.py
  <the plugin's skills/explain/SKILL.md> <the install's .claude/**/*.md> docs/current/operations.md` prints
  `missing=0`.
- **Then the plugin, then the installs:** publish plugin 0.11.0; in each of the knowledge repo, arb_upbit_1 and
  Note run `/update-workspace`, and confirm `/knowledge:explain` no longer refuses with "v96 or later".
