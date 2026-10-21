# P31 patch notes: every edit the bootstrap needs to its existing files

These notes are for the agent working in the bootstrap repo (`bootstrap_agentic_workspace.sh`). The package's
**new** files are listed in `README.md`. This file lists every edit to files the bootstrap **already has**,
file by file. For each edit it gives what to find, what the text becomes, and why.

**Pinned to bootstrap HEAD `f207775` (workspace v62).** Every line number below was re-grepped at that commit,
**before** any edit from P30's handoff. Some of P30's edits remove lines: `main.py`'s `RETIRED_FILES` rows and
the smoke suite's explain asserts. So either apply bottom-up within a file, or find each edit by the quoted
text, which is unique. If HEAD has moved, re-grep before you edit.

## 0. How this sits with P30's handoff

The two changes ship together, as one release (`README.md` gives the order). The table shows where they meet.

| P30 handoff item | With this package |
|---|---|
| 2.1, delete `payload/claude/skills/explain/` | Unchanged. This package adds **no** skill: the route is a section of `create-phase`, and the three references go into existing `reference/` directories. The skill count stays at P30's **17** (section 9). |
| 2.1, the review pointer becomes `… run /knowledge:explain for this phase` | **Superseded** by section 6 of this file. Write the new fixed string everywhere P30 would have written its own. |
| 2.1, the contract's L13 rewording (net-negative bytes) | Unchanged. This package adds **no contract edit**. The contract is at 12,281 B against a 12,288 B cap. "Created only on the operator's word" is already `create-phase`'s own rule (its L11), and the route repeats it. |
| 2.2, the plugin pointer text | It gains one sentence about explain phases (section 10). The install commands stay verbatim. P31 raises the minimum plugin version **0.4.0 → 0.5.0**, because explain phases run `knowledge check` (skill §4.9). |
| 2.3 to 2.5, the updater rule, tests and release notes | Unchanged. Section 11 adds tests, and the CHANGELOG section in section 12 covers both handoffs. |

## 1. `payload/claude/skills/create-phase/SKILL.md`

**1a. Step 2 asks the `## Explain` fields.**
- **Find:** L29, the paragraph that opens `**If the request is "consolidate the docs" / "run a docs phase"`.
- **Becomes:** after L29, before L31 (`3. **Confirm.**`), insert a blank line and this paragraph, indented three spaces like its neighbours:

```markdown
   **If the request is to explain something as a book** ("explain P30 as a book", "write a book on X", an explain phase), ask the `## Explain` fields: subject, mode, book, lang, reader, depth, project (private) and visibility (`private`). See *The explain route* below. A single chapter is not a phase: that is the operator's own `/knowledge:explain`.
```

- **Why:** the pinned decision says step 2 asks the fields when the request is to explain something. The route section holds the detail.

**1b. Step 4.2 records them.**
- **Find:** L52–58, the bullet `- **for a visual-design phase only**, append a \`## Design Style\` section`, which ends at L58 with `There is no \`Design tool:\` line: \`drafter\` is the only design tool.`
- **Becomes:** after L58, insert this bullet at the same indentation:

```markdown
      - **for an explain phase only**, append a `## Explain` section with the confirmed fields
        (*The explain route* below shows its shape). `DECOMP` and the review read it; its absence
        reads as "not an explain phase", never as an unanswered question.
```

- **Why:** the section is the explain phase's only marker, so no engine change is needed. It is written at creation, the way `## Design Style` is.

**1c. Add the route.**
- **Find:** L96, the end of the file, which is the last line of `## The QA-sweep route`.
- **Becomes:** append a blank line, then the whole of the package's `claude/skills/create-phase/explain-route.md`, starting at its `## The explain route` heading.
- **Why:** it mirrors the docs-phase and QA-sweep routes: prose, plus what that phase's `DECOMP` will cut.
- **Note:** the package file is **text to insert, not a file to ship**. Never copy it into `payload/claude/skills/create-phase/`: the build ships every file under a skill directory. The core grows from 13,630 B to about 18.5 KB. The smoke suite caps only the `design-cowork` and `do-*` cores (L136).

## 2. `payload/claude/skills/do-whole-phase/SKILL.md`

- **Find:** L25, `- **Before you plan a special slice, read its reference:** …`, which ends `(the review, the acceptance gate, recording the verdict, fix slices, the doc debt, archiving).`
- **Becomes:** append to the end of that line:

```markdown
 An explain phase (`## Explain` in `intent.md`): its decomposition → `reference/explain-decomposition.md`, each chapter slice → `reference/explain-chapter.md`, its review → `reference/explain-review.md`.
```

- **Why:** the smoke suite requires a skill core to name every `reference/*.md` it ships, exactly (L131–135 and L100–104). The core grows 7,327 → 7,536 B, under the 8,192 B cap (L136).

## 3. `payload/claude/skills/do-next-slice/SKILL.md`

- **Find:** L36, `- the phase review (\`kind: review\`) → \`reference/review.md\` (the review, the acceptance gate, recording the verdict, the doc debt);`
- **Becomes:** insert after it:

```markdown
- an explain phase (`## Explain` in `intent.md`): DECOMP → `reference/explain-decomposition.md`, each chapter → `reference/explain-chapter.md`, REVIEW → `reference/explain-review.md`;
```

- **Why:** the reason is the same as in section 2. The three files reach `do-next-slice/reference/` as shared copies (section 7b).
- **Size:** the core grows 7,984 → **8,174 B**, leaving **18 B** under the 8,192 B cap. Do not lengthen the line. If anything else lands in this core in the same release, trim elsewhere.

## 4. The decomposition references (both twins)

- **Find:**
  - `payload/claude/skills/do-whole-phase/reference/decomposition.md` L3, the one long bullet, ending `carry no \`acceptance\` block and need no declaration.`;
  - `payload/claude/skills/do-next-slice/reference/decomposition.md` L5, ending `carry no \`acceptance\` block at all and need no declaration.`
- **Becomes:** append to each:

```markdown
 **An explain phase** (`## Explain` in `intent.md`) always takes `--require` (the operator reads the book), and its first chapter slice then stops `pending` at the outline gate: `reference/explain-decomposition.md`.
```

- **Why:** these files are where the gate-declaration rules live, so the fixed `--require` belongs beside the design phase's fixed rules.

## 5. The review references (both twins), and the review skill

Each of these carries the pointer line (section 6). Each also gains a pointer to the explain review.
- **`payload/claude/skills/do-whole-phase/reference/review.md` L4.** Replace the pointer string. Then, after the line's last sentence (`… and — on a gated phase — a **\`walkthrough\`**.`), append:

  ```markdown
   An explain phase's review (`## Explain` in `intent.md`) is planned from `reference/explain-review.md`: it publishes the book private and reads it in the reader.
  ```

- **`payload/claude/skills/do-next-slice/reference/review.md` L3.** Replace the pointer string. Then, after `the executor just reports the fixed pointer \`…\`.`, insert:

  ```markdown
   An explain phase's review (`## Explain` in `intent.md`) is planned from `reference/explain-review.md` instead: it publishes the book private and reads it in the reader.
  ```

- **`payload/claude/skills/review-phase/SKILL.md` L74.** The paragraph `**The review does not write the phase explainer.** …` becomes:

  ```markdown
  **The review does not write the phase explainer.** Explaining is a separate operation the operator runs when they want one (`/knowledge:explain`, from the knowledge plugin); it left the review's default behaviour, so the review locates no explain skill, runs no KB probe, and has no offline fallback or commit of any kind. Its whole obligation is one pointer line, reported in `result.md` and in the structured return, identical on every verdict: `explain: not written — run /knowledge:explain P<N> for one chapter, or create an explain phase for a book`. **An explain phase is the exception** (`## Explain` in `intent.md`): the book is the phase's own work, and its review reads it, publishes it private and reads it in the reader, per `do-whole-phase`'s `reference/explain-review.md`.
  ```

- **Why:** a review normally publishes nothing. The explain review's carve-out has to be written where every review is defined, or an executor that follows the review skill refuses to publish.

## 6. The review pointer line, in every file

**One fixed string everywhere:**

```text
explain: not written — run /knowledge:explain P<N> for one chapter, or create an explain phase for a book
```

Where the line is a verdict field (`- \`explain\`: …`), the value is the same string without its `explain: ` prefix, as today.

| File | Line @ `f207775` | Today | Action |
|---|---|---|---|
| `payload/claude/agents/slice-executor-mid.md` | L40 | `… report the fixed pointer \`explain: not written — run /explain for this phase\` and do no explainer work.` | New string, plus the explain-phase sentence below |
| `payload/claude/agents/slice-executor-mid.md` | L91 | `- \`explain\`: (review slice only) always the fixed pointer \`not written — run /explain for this phase\` — the review writes no explainer` | New string (field form) |
| `payload/claude/agents/slice-executor-high.md` | L40 | identical to mid L40 (the two bodies match there) | Same as mid L40 |
| `payload/claude/agents/slice-executor-high.md` | L91 | identical to mid L91 | Same as mid L91 |
| `payload/claude/skills/review-phase/SKILL.md` | L74 | `… identical on every verdict: \`explain: not written — run /explain for this phase\`.` | Section 5 |
| `payload/claude/skills/do-whole-phase/reference/review.md` | L4 | `… the fixed \`explain: not written — run /explain for this phase\` pointer …` | New string, plus section 5 |
| `payload/claude/skills/do-next-slice/reference/review.md` | L3 | `… reports the fixed pointer \`explain: not written — run /explain for this phase\`.` | New string, plus section 5 |
| `installer/payloads/doc_bodies/operations.md` | L48–49 | `… it only reports the pointer \`explain: not written — run /explain for this phase\`.` | P30 replaces the section (its 2.2); write the new string in its last sentence |
| `installer/main.py` | L1829 | the closing `Knowledge:` print (no pointer today) | P30 replaces it; if the new text quotes the pointer, use the new string |
| `README.en.md` | (P30's new block) | P30's 2.2 block quotes the pointer | New string |
| `payload/claude/skills/explain/SKILL.md` | L29 | carries the old pointer | Deleted with the skill by P30; nothing to patch |
| `CHANGELOG.md` | L1885, L2080 | history | **Never patched** |

**The two executor bodies at L40.** The sentence `The review never writes a phase explainer (explaining is a separate operator-run operation): report the fixed pointer \`explain: not written — run /explain for this phase\` and do no explainer work.` becomes:

```markdown
The review never writes a phase explainer (explaining is a separate operator-run operation): report the fixed pointer `explain: not written — run /knowledge:explain P<N> for one chapter, or create an explain phase for a book` and do no explainer work. **In an explain phase** (`## Explain` in `intent.md`) the book is the phase's own work: its review publishes every chapter, private, as its `plan.md` says (`do-whole-phase/reference/explain-review.md`). That is its one carve-out; it still edits no source and no chapter.
```

Keep the two bodies identical there.

**Checks.**
- There is no pin on the old string in `tests/retrofit_smoke.sh` or `payload/scripts/workflow.py`. Both were grepped at `f207775`, and neither carries it. Section 11c adds the pin.
- After editing, run `grep -rn "for this phase" payload installer README*.md`. It must find no `explain` line.

## 7. `installer/build.py`

**7a. Ship the critic.**
- **Find:** `FIXED_LIVE_FILES` (L54–71), its L60 `".claude/agents/design-critic.md",`.
- **Becomes:** insert `".claude/agents/explain-critic.md",` after it.
- **Why:** agents are not discovered from disk, unlike skills; each one is listed.

**7b. Fan the three references out to `do-next-slice`.**
- **Find:** `SHARED_SKILL_FILES` (L77–79).
- **Becomes:**

```python
SHARED_SKILL_FILES = {
    ".claude/skills/do-next-slice/reference/dispatch.md": ".claude/skills/do-whole-phase/reference/dispatch.md",
    ".claude/skills/do-next-slice/reference/explain-chapter.md": ".claude/skills/do-whole-phase/reference/explain-chapter.md",
    ".claude/skills/do-next-slice/reference/explain-decomposition.md": ".claude/skills/do-whole-phase/reference/explain-decomposition.md",
    ".claude/skills/do-next-slice/reference/explain-review.md": ".claude/skills/do-whole-phase/reference/explain-review.md",
}
```

- **Why:** there is one source and a byte-identical copy, so each installed skill directory is self-contained. The build refuses a key that also exists as a source, so never put a second copy under `payload/claude/skills/do-next-slice/reference/`.

**Unchanged:** L49 `EXPECTED_SKILL_COUNT`, which stays 17 after P30 (section 9).

## 8. `installer/main.py`

| Where @ `f207775` | Find | Becomes | Why |
|---|---|---|---|
| L185–199 `MANAGED_FILES`, L193–194 | `".claude/agents/design-critic.md", ".claude/agents/Explore.md",` | `".claude/agents/design-critic.md", ".claude/agents/Explore.md", ".claude/agents/explain-critic.md",` | The fresh-install conflict guard (L1392) and the managed inventory cover it |
| L642 `NESTED_AGENTS` | `["slice-executor-mid", "slice-executor-high", "design-drafter", "design-critic", "Explore"]` | add `"explain-critic"` after `"design-critic"` | See below |
| L1484–1488, the comment above the agent writes | `… the design critic that judges a drafted round (the critic row; …) and the read-only Explore lookup agent (the explore row).` | Add: `the explain critic that judges one drafted chapter of an explain phase (no row: the orchestrator passes its model per call, always different from the chapter executor's)` | Keeps the comment true |
| L1493 | `    write_text(".claude/agents/design-critic.md", PAYLOADS[".claude/agents/design-critic.md"])` | Add after it: `    write_text(".claude/agents/explain-critic.md", PAYLOADS[".claude/agents/explain-critic.md"])` | The plain and `--into-existing` install write |
| L1822, the closing `Claude Code:` print | `…, design critic .claude/agents/design-critic.md, read-only lookup agent …` | Insert `explain critic .claude/agents/explain-critic.md, ` after the design critic; P30 also takes `18 skills` → `17 skills` here | The summary names every agent |
| L1829, the closing `Knowledge:` print | P30 replaces it with the plugin pointer | Add one clause: `a book (outlined, signed, critic-checked, published private) is an explain phase: ask /create-phase` | Discoverability |
| L164 comment, L166 `EXPECTED_SKILL_COUNT` | (P30: 18 → 17) | Nothing more | No new skill |

**What adding `explain-critic` to `NESTED_AGENTS` (L642) does:**
- `nested_plan()` (L1066 and L1101) installs the critic into the host's `.claude/agents/`. It is clash-checked, and a host that already has an `explain-critic.md` gets `wf-explain-critic`.
- `nested_rewrite()` renames the token everywhere it appears in prose, including the three references and `explain-chapter.md`'s dispatch line.
- `--update` treats it as a newly shipped name.
- The nested summary at L1286–1287 counts `len(NESTED_AGENTS)` by itself.

## 9. The engine, `payload/scripts/workflow.py`, and the counts

- **No engine change.** `MANAGED_AGENT_FILES` (L360–367) stays at five, and `ROUTE_AGENT` (L355–356) gains no row:
  - `sync-agents` does not manage `explain-critic`, so its model is its frontmatter `opus @ high`;
  - the orchestrator passes `model: sonnet` on the call for a chapter drafted on the high row (`explain-chapter.md`, *The critic's model*);
  - `dispatch-summary` meters its spans under its own agent name (the "other agents keep their name" rule at L1254).

  A dedicated engine row is a later option, left to you. Check that `sync-agents --check` stays quiet with a sixth agent file present; the smoke suite runs it.
- **The skill count: no change from P31.** It is 17 after P30, wherever P30's handoff lists it: `build.py` L49, `main.py` L164/L166/L1822, smoke L121/L1752, `README.en.md` L214/L262/L626.
- **The agent count goes from five to six.** The places that name agents:
  - `README.en.md` L214 (the `.claude/` bullet);
  - L262 (`the 18 skills and 3 agents`: the agent number is already stale, and becomes `6`);
  - L627 (the tree comment `slice-executor tiers mid/high + design-drafter + design-critic` gains `+ explain-critic`);
  - `installer/README.md` L132–133 (the agents bullet: add `payload/claude/agents/explain-critic.md`, "the explain critic; no row, its model is its own frontmatter").

## 10. Seed docs and READMEs

- **The seed doc and the README block.** In P30's new pointer text, used in `installer/payloads/doc_bodies/operations.md` (the section P30 rewrites, L43–68 today) and in the `README.en.md` block (L460–481 today), add one sentence after `/knowledge:explain <topic>`:
  - **Add:** "A whole book (researched, outlined and signed, each chapter checked by a fresh-eyes critic, published private) is an **explain phase**: ask `/create-phase` to explain something as a book."
  - **Also:** the required plugin version becomes **0.5.0 or later**.
- **`README.md`** (Korean) has no explain block (P30), so there is nothing to add.

## 11. `tests/retrofit_smoke.sh`

**11a. The critic ships fresh.** After L1064 (the design-critic pin), add:

```sh
# The explain critic ships as a sixth agent, opus @ high, and writes only its critique file: no Edit.
[ -f "$F/.claude/agents/explain-critic.md" ] && grep -q '^model: opus$' "$F/.claude/agents/explain-critic.md" \
  && grep -q '^effort: high$' "$F/.claude/agents/explain-critic.md" && grep -q '^tools: ' "$F/.claude/agents/explain-critic.md" \
  && ! grep -Eq '^tools: (.*, )?Edit(,.*)?$' "$F/.claude/agents/explain-critic.md" \
  && ok "fresh install ships the explain-critic subagent (opus@high, no Edit in tools)" || bad "fresh install explain-critic missing, off its frontmatter, or carries Edit"
```

**11b. Dual-apply.** In `DUAL_FIXED` (L1758–1769), add the line `.claude/agents/explain-critic.md` after L1761 (`.claude/agents/design-critic.md`).

**11c. Prose pins.** In Test 0's Python block (L115–860), after L162 (the `create_phase` asserts), add:

```python
# Explain phases: the route lives in create-phase, the three references ship in do-whole-phase and
# fan out to do-next-slice, and the review pointer is one fixed string everywhere.
assert "## The explain route" in create_phase and "## Explain" in create_phase
for ref in ("explain-decomposition.md", "explain-chapter.md", "explain-review.md"):
    assert f".claude/skills/do-next-slice/reference/{ref}" in SHARED_SKILL_FILES, ref
POINTER = "not written — run /knowledge:explain P<N> for one chapter, or create an explain phase for a book"
for rel in ("claude/agents/slice-executor-mid.md", "claude/agents/slice-executor-high.md",
            "claude/skills/review-phase/SKILL.md", "claude/skills/do-whole-phase/reference/review.md",
            "claude/skills/do-next-slice/reference/review.md"):
    assert POINTER in (root / "payload" / rel).read_text(encoding="utf-8"), rel
for p in [*(root / "payload").rglob("*.md"), root / "installer/main.py", root / "installer/payloads/doc_bodies/operations.md"]:
    t = p.read_text(encoding="utf-8")
    assert "run /explain for this phase" not in t and "run /knowledge:explain for this phase" not in t, p
```

**11d. What already covers the rest.**
- `skill_tree_ok` (L81–107) and Test 0's L131–141 check generically that each `do-*` core names exactly its shipped references and that every shared copy is byte-identical. They need no edit.
- The `--update` test at L1582–1634 lists two added reference files by name. It still passes, because the new shared copies are extra `+` lines.

**11e. P30's own test edits** (its 2.4) apply as written. Re-grep their lines too: P30 pinned them at `7517446`.

## 12. `CHANGELOG.md`

Add a new top section. It is one release with P30's change. In house style, it says:

```markdown
## v<N> — <date>

- **`/explain` is the knowledge plugin's.** (P30's text: the vendored skill is gone; install
  `knowledge@knowledge` from the `leetusik/knowledge` marketplace, plugin 0.5.0 or later; the
  updater never touches anything named `explain`.)
- **Explaining a book is a phase.** `/create-phase` gains *The explain route*: an `## Explain`
  section in `intent.md` (subject, mode, book, lang, reader, depth, project, visibility) marks the
  phase. Its `DECOMP` researches the subject, writes `book/outline.md` and cuts one chapter slice
  per chapter; the operator signs the outline at a `pending` stop on the first chapter. Each
  chapter is drafted and checked (`knowledge check`), judged by the new **`explain-critic`** agent
  on a model different from the drafter's, and revised once. The review reads the whole book,
  publishes every chapter **private** with the org key, reads it in the real reader, and the
  operator accepts by reading it. Three new `do-whole-phase` references (shared into
  `do-next-slice`): `explain-decomposition.md`, `explain-chapter.md`, `explain-review.md`. No
  engine change: the critic has no route row; the orchestrator picks its model per call.
- **The review's fixed pointer** is now `explain: not written — run /knowledge:explain P<N> for
  one chapter, or create an explain phase for a book`.

- **Migration notes.** `/update-workspace` installs `.claude/agents/explain-critic.md` (nested:
  into the host's `.claude/agents/`, renamed `wf-explain-critic` on a clash). Explain phases need
  the knowledge plugin at 0.5.0 or later and `/knowledge:setup` done once (the review publishes
  with its org key); `knowledge check` needs a server with `POST /api/documents/check`, and
  without it the check is skipped and the publish's 422 stays the backstop. (P30's migration
  lines: delete an old `.claude/skills/explain/` by hand, once.)
```

## 13. The release rule (the bootstrap's own `CLAUDE.md`)

1. Edit `payload/**` and `installer/**` only. Never edit the installed copies in `.claude/` or `workflow/`.
2. Run `python3 installer/build.py`, then `python3 installer/build.py --check`.
3. Bump `WORKSPACE_VERSION` (`installer/main.py` L48, `62` at `f207775`). Add the section 12 CHANGELOG entry with its Migration notes line **in the same commit**; the smoke suite checks that they agree (L1016–1017).
4. Run `bash tests/retrofit_smoke.sh` **alone** in its shell call.
5. Commit the rebuilt `bootstrap_agentic_workspace.sh` in the same commit. The commit message follows the host convention: Conventional Commits, a component scope, and **no phase or slice ids**.
6. Refresh the repo's own install with `sh bootstrap_agentic_workspace.sh --update .`, then commit the refresh in `git -C workflow`.

## 14. Verification after applying

- **The build and the smoke suite pass:** `python3 installer/build.py --check` and `bash tests/retrofit_smoke.sh`.
- **A fresh scratch install** (a throwaway `git init`) has all of these:
  - `.claude/agents/explain-critic.md`;
  - `do-whole-phase/reference/explain-{decomposition,chapter,review}.md`, and byte-identical copies in `do-next-slice/reference/`;
  - `## The explain route` in `.claude/skills/create-phase/SKILL.md`;
  - the new pointer string in the five payload files of section 6.
- **A `--nested` scratch install** puts `explain-critic.md` in the host's `.claude/agents/`, and the references inside it say `workflow/works/phases/…`.
- **`grep -rn "for this phase" payload installer`** finds no `explain` line.
