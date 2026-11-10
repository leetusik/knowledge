# P40-2t package: one way to explain what the records don't cover yet, for the bootstrap

This is a ready-to-apply package for the bootstrap (workflow) repo, `bootstrap_agentic_workspace.sh`. It moves
the workspace onto the knowledge plugin **0.11.0**'s flow:

- **Research first, then the explain, from one request.** When no phase covers an explain's subject, the
  plugin's "research first" reply now creates the research phase **and runs it at once**, on one confirmation.
  Its block names its **sources**: this repository's code, the web (a source beside each finding), or the
  operator's own material (under eight privacy rules). When it passes, the explain's confirmation, redrawn from
  the findings, comes back by itself (`/knowledge:explain <subject> from=<P>`) and waits for the literal yes.
- **A subject with no code behind it** is explained from a research phase's findings alone; a book of one is of
  kind `subject` with a label.
- **A book's chapters are written at once** after the outline gate: declared (`--depends-on none`, a synthesis
  chapter on what it draws on), run as a wave, at most 4 in flight, each with its own critic. The engine holds
  an explain phase's `DECOMP` to v77's forced declaration like any other.

The package was prepared in the knowledge repo by phase P40-2t, slices S2–S4 and S6, against bootstrap
**`fdb1151` (workspace v95)**. Paths here mirror the bootstrap's `payload/`: `package/<path>` goes to
`payload/<path>`.

## The files

| Package file | Goes to | What it is | Slice |
|---|---|---|---|
| `claude/skills/do-whole-phase/reference/explain-decomposition.md` | `payload/claude/skills/do-whole-phase/reference/explain-decomposition.md`, **replacing it whole** (the build shares it into `do-next-slice/reference/`) | An explain phase's `DECOMP`: the plugin floor **0.11.0**; a subject book's evidence from its research phase's findings; the outline pins recap lines, names, running examples and link ids; a book's chapters declared (`--depends-on none`, a synthesis chapter on what it draws on), at most 4 at once | P40-2t.S3 |
| `claude/skills/do-whole-phase/reference/explain-chapter.md` | `payload/claude/skills/do-whole-phase/reference/explain-chapter.md`, **replacing it whole** (shared) | A write slice's three spans, plus the new *Chapters at once (a wave)*: **at most 4 chapters in flight**, a chapter's span-1 and critic returns are not slice returns, span 3 records its corrections | P40-2t.S3 |
| `claude/skills/do-whole-phase/reference/explain-review.md` | `payload/claude/skills/do-whole-phase/reference/explain-review.md`, **replacing it whole** (shared) | The review, with **the consistency pass** over a book's chapters written side by side, and the `corrections:` span 3 records | P40-2t.S3 |
| `claude/skills/create-phase/explain-route.md` | **Not a file.** Its text replaces `## The explain route` to the end of `payload/claude/skills/create-phase/SKILL.md` (`patches/create-phase.md` 1e) | The explain route: records only, a research phase's findings included; a covered no-code subject accepted; the floor 0.11.0; `book` kind `codebase` or `subject`; a book's chapters at once | P40-2t.S2 |
| `claude/skills/create-phase/research-route.md` | **Not a file.** Its text follows the explain route at the end of the same `SKILL.md` (1e) | The research route: the block's fields (`paths`, **`sources`**, the chained `then:`), one confirmation then run at once, the per-source and privacy rules, **When it passes**, the legacy block; the proposal it carries is written into `intent.md` as a blockquote (the `## Explain` hazard) | P40-2t.S2, S6 |
| `PATCHES.md` | **Not shipped** | The ordered index of the four patch files | P40-2t.S6 |
| `patches/create-phase.md` | **Not shipped** | 5 finds in create-phase's `SKILL.md`: the intro, *Who may invoke it*, steps 2 and 5, and 1e, the two route texts | P40-2t.S2 |
| `patches/workflow.md` | **Not shipped** | 14 finds: `wave.md`, `decomposition.md`, the slice executor, the chain step in both `review.md` references | P40-2t.S3 |
| `patches/engine.md` | **Not shipped** | 7 finds: `payload/scripts/workflow.py` (`finish_slice`, `parallel-plan`) and the smoke suite's P42 comment and Test 10d | P40-2t.S4 |
| `patches/release.md` | **Not shipped** | 7 finds (the smoke suite's explain pins and P42 pin, `README.en.md`, the seed operations doc, `installer/main.py`), the `changelog.d` fragment, the release, the verification | P40-2t.S6 |
| `checks/finds.py`, `checks/apply.py`, `checks/cites.py` | **Not shipped** | The checks this package was validated with: every find exactly once at a commit; the package applied to a scratch copy with the patched suite's explain block run; every cited plugin section present by number and heading | P40-2t.S6 |

**No skill is added or removed** (the count stays **21**), and no file is retired (`RETIRED_FILES` gains
nothing). Neither `payload/contract.md` (12,285 of 12,288 B) nor the `do-whole-phase` / `do-next-slice`
`SKILL.md` cores (8,185 and 8,180 of 8,192 B) is edited. The create-phase core grows from 40,523 to 50,681 B
(no cap).

## The order to apply it

One release (the next after v95 that carries it: **v96** expected):

1. **Copy the three whole references** over `payload/claude/skills/do-whole-phase/reference/` (rows 1–3). Never
   put a copy under `do-next-slice/reference/`: `SHARED_SKILL_FILES` in `installer/build.py` makes those.
2. **Apply the patch files in `PATCHES.md`'s order:** `patches/create-phase.md` (1a–1d, then 1e the two route
   texts), `patches/workflow.md`, `patches/engine.md`, `patches/release.md` sections 1–4.
3. **Write the release fragment**, `changelog.d/explain-research-chained.md` (`patches/release.md` 5).
4. **Build, test, commit, land** (`patches/release.md` 6): `python3 installer/build.py` and `--check`; the smoke
   suite alone; one commit with the rebuilt artifact and no phase ids; then `--release` on `main`, which stamps
   v96; **push `main`**.
5. **Verify** (`patches/release.md` 7).

## The release order

1. **The bootstrap v96 first**, landed and pushed (above).
2. **The knowledge plugin 0.11.0 after it**, pushed from the knowledge repo. Its front door refuses a
   workspace older than v96 (one whose create-phase research route lacks the `**sources**` field), so it must
   not reach users before v96 is on GitHub. If the bootstrap stamps another number, a fix slice renames the
   plugin's refusal first (as P39-hk.F5 did).
3. **Then `/update-workspace`**: in the knowledge repo (v89, through v90–v96), in arb_upbit_1 and in Note (both
   v95). Each needs it before it uses the new route.

The mixed states (`topics/change-list.md` §3(e)): plugin 0.11.0 on v95 refuses and names v96; plugin 0.10.0 on
v96 is refused by the v96 explain route, which names 0.11.0; a 0.10.0 "research first" block on v96 is read as
`sources: code` with no chain; an explain already in flight on v95 is unaffected.

## The minimums

- **The knowledge plugin 0.11.0 or later**, installed and set up once (`/knowledge:setup`). 0.11.0 is the version
  whose explain front door offers research first for any uncovered subject, takes `from=P<N>`, and tells a
  subject book; it ships from the knowledge repo's P40-2t (its release slice, S6).
- **The `knowledge` CLI 0.2.0 or later** (`knowledge check`), and **a knowledge server with
  `POST /api/documents/check`**: unchanged since P31.
- **A private project** in the operator's org, and a filled `## Operator Runtime` naming the agent's Chrome
  `deviceId` for the review's reading: unchanged.

## How it was checked (P40-2t.S6)

- `checks/finds.py <bootstrap> fdb1151`: `finds checked=33 not-exactly-once=0` (create-phase 5, workflow 14,
  engine 7, release 7).
- `checks/apply.py <scratch copy>` on a fresh `git archive` of `fdb1151`, unpacked whole: every patch applied in
  index order (`applied finds=33`, the fragment written); the patched suite's explain block (L211–L316 after
  the patch) passes; the flipped P42 pin and the `## Explain` hazard sentence hold; the skill count is 21; the
  byte caps hold; the create-phase core is 50,681 B.
- On that copy, `python3 installer/build.py` rebuilt the artifact, `--check` passed, and the **whole** patched
  suite, `bash tests/retrofit_smoke.sh`, passed (P40-2t.S6's `result.md` has the count).
- `checks/cites.py <plugin 0.11.0's skills/explain/SKILL.md>` over the package's five texts: `citations
  checked=118 bold parts checked=17 missing=0`; over the patched copy's 64 `payload/claude/**/*.md` and the seed
  operations doc: `checked=124 bold parts checked=17 missing=0`.
